import { EmailProvider, EmailAccount, EmailMetadata, EmailProviderCredentials } from '../types/email';
import { GmailProvider } from '../providers/gmail';
import { OutlookProvider } from '../providers/outlook';
import { ImapProvider } from '../providers/imap';

interface Env {
  ENCRYPTION_KEY: string;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  OUTLOOK_CLIENT_ID: string;
  OUTLOOK_CLIENT_SECRET: string;
  EMAIL_ACCOUNTS: KVNamespace;
}

interface RequestContext {
  userId: string;
  accountId?: string;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Error response helper
const errorResponse = (message: string, status: number = 400) => {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
};

// Success response helper
const successResponse = (data: any) => {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
};

// Get provider instance based on type
const getProvider = (provider: EmailProvider, credentials: EmailProviderCredentials) => {
  switch (provider) {
    case EmailProvider.GMAIL:
      return new GmailProvider(credentials as GmailOAuthCredentials);
    case EmailProvider.OUTLOOK:
      return new OutlookProvider(credentials as OutlookOAuthCredentials);
    case EmailProvider.IMAP:
      return new ImapProvider(credentials as ImapCredentials);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

// Encrypt sensitive data
const encryptData = async (data: string, env: Env): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(env.ENCRYPTION_KEY),
    'AES-GCM',
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );

  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
};

// Decrypt sensitive data
const decryptData = async (encryptedData: string, env: Env): Promise<string> => {
  const decoder = new TextDecoder();
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.ENCRYPTION_KEY),
    'AES-GCM',
    false,
    ['decrypt']
  );

  const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );

  return decoder.decode(decrypted);
};

// Handle CORS preflight requests
const handleOptions = () => {
  return new Response(null, {
    headers: corsHeaders,
  });
};

// Initiate OAuth flow
const handleConnect = async (request: Request, env: Env, ctx: RequestContext) => {
  const { provider, redirectUri } = await request.json();
  
  if (!provider || !redirectUri) {
    return errorResponse('Provider and redirect URI are required');
  }

  let authUrl: string;
  switch (provider) {
    case EmailProvider.GMAIL:
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${env.GMAIL_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.readonly')}&` +
        `access_type=offline&` +
        `prompt=consent`;
      break;
    case EmailProvider.OUTLOOK:
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${env.OUTLOOK_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('offline_access Mail.Read')}&` +
        `response_mode=query`;
      break;
    default:
      return errorResponse('Unsupported provider');
  }

  return successResponse({ authUrl });
};

// Handle OAuth callback
const handleCallback = async (request: Request, env: Env, ctx: RequestContext) => {
  const { provider, code, redirectUri } = await request.json();
  
  if (!provider || !code || !redirectUri) {
    return errorResponse('Provider, code, and redirect URI are required');
  }

  try {
    let credentials: EmailProviderCredentials;
    
    switch (provider) {
      case EmailProvider.GMAIL:
        credentials = await GmailProvider.handleCallback(code, redirectUri, env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET);
        break;
      case EmailProvider.OUTLOOK:
        credentials = await OutlookProvider.handleCallback(code, redirectUri, env.OUTLOOK_CLIENT_ID, env.OUTLOOK_CLIENT_SECRET);
        break;
      default:
        return errorResponse('Unsupported provider');
    }

    // Encrypt credentials
    const encryptedCredentials = await encryptData(JSON.stringify(credentials), env);

    // Create email account
    const account: EmailAccount = {
      id: crypto.randomUUID(),
      userId: ctx.userId,
      provider,
      email: '', // Will be fetched from provider
      displayName: '', // Will be fetched from provider
      isPrimary: false,
      isConnected: true,
      credentials: encryptedCredentials,
      settings: {
        syncFrequency: 15,
        foldersToSync: [],
        excludePatterns: [],
        maxEmailsPerSync: 100,
        retentionDays: 30,
        autoArchive: false,
        autoDelete: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store account in KV
    await env.EMAIL_ACCOUNTS.put(
      `${ctx.userId}:${account.id}`,
      JSON.stringify(account)
    );

    return successResponse({ accountId: account.id });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return errorResponse('Failed to complete OAuth flow', 500);
  }
};

// List connected accounts
const handleListAccounts = async (request: Request, env: Env, ctx: RequestContext) => {
  try {
    const accounts: EmailAccount[] = [];
    const prefix = `${ctx.userId}:`;
    
    // List all accounts for the user
    const list = await env.EMAIL_ACCOUNTS.list({ prefix });
    
    for (const key of list.keys) {
      const accountData = await env.EMAIL_ACCOUNTS.get(key.name);
      if (accountData) {
        accounts.push(JSON.parse(accountData));
      }
    }

    return successResponse({ accounts });
  } catch (error) {
    console.error('List accounts error:', error);
    return errorResponse('Failed to list accounts', 500);
  }
};

// Fetch emails
const handleFetchEmails = async (request: Request, env: Env, ctx: RequestContext) => {
  const { accountId, maxResults = 50 } = await request.json();
  
  if (!accountId) {
    return errorResponse('Account ID is required');
  }

  try {
    // Get account from KV
    const accountData = await env.EMAIL_ACCOUNTS.get(`${ctx.userId}:${accountId}`);
    if (!accountData) {
      return errorResponse('Account not found', 404);
    }

    const account: EmailAccount = JSON.parse(accountData);
    
    // Decrypt credentials
    const credentials = JSON.parse(
      await decryptData(account.credentials as unknown as string, env)
    );

    // Get provider instance
    const provider = getProvider(account.provider, credentials);

    // Fetch emails
    const emails = await provider.fetchEmails(maxResults);

    return successResponse({ emails });
  } catch (error) {
    console.error('Fetch emails error:', error);
    return errorResponse('Failed to fetch emails', 500);
  }
};

// Main worker handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    // Extract user ID from request (implement your auth logic here)
    const userId = request.headers.get('X-User-ID');
    if (!userId) {
      return errorResponse('Unauthorized', 401);
    }

    const requestContext: RequestContext = { userId };

    // Route handling
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/api/email/accounts/connect':
          return handleConnect(request, env, requestContext);
        
        case '/api/email/accounts/callback':
          return handleCallback(request, env, requestContext);
        
        case '/api/email/accounts':
          return handleListAccounts(request, env, requestContext);
        
        case '/api/emails':
          return handleFetchEmails(request, env, requestContext);
        
        default:
          return errorResponse('Not found', 404);
      }
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse('Internal server error', 500);
    }
  },
}; 