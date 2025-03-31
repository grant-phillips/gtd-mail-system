/**
 * Email account and provider types for GTD Mail System
 */

import { EmailCategory, Priority, ActionStatus } from './classification';

// Provider types
export enum EmailProvider {
  GMAIL = 'GMAIL',
  OUTLOOK = 'OUTLOOK',
  IMAP = 'IMAP'
}

// OAuth token types
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scope: string[];
}

// Provider-specific OAuth credentials
export interface GmailOAuthCredentials extends OAuthTokens {
  provider: EmailProvider.GMAIL;
  clientId: string;
  clientSecret: string;
}

export interface OutlookOAuthCredentials extends OAuthTokens {
  provider: EmailProvider.OUTLOOK;
  clientId: string;
  clientSecret: string;
}

export interface ImapCredentials {
  provider: EmailProvider.IMAP;
  host: string;
  port: number;
  username: string;
  password: string;
  useTLS: boolean;
}

// Union type for all provider credentials
export type EmailProviderCredentials = 
  | GmailOAuthCredentials 
  | OutlookOAuthCredentials 
  | ImapCredentials;

// Email account interface
export interface EmailAccount {
  id: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  displayName: string;
  isPrimary: boolean;
  isConnected: boolean;
  lastSyncAt?: Date;
  credentials: EmailProviderCredentials;
  settings: EmailAccountSettings;
  createdAt: Date;
  updatedAt: Date;
  lastSync?: string;
  status: 'active' | 'error' | 'disconnected';
  error?: string;
}

// Email account settings
export interface EmailAccountSettings {
  syncFrequency: number; // minutes
  foldersToSync: string[];
  excludePatterns: string[];
  maxEmailsPerSync: number;
  retentionDays: number;
  autoArchive: boolean;
  autoDelete: boolean;
}

// Email metadata
export interface EmailMetadata {
  id: string;
  accountId: string;
  providerId: string; // Provider-specific email ID
  threadId: string;
  subject: string;
  sender: EmailAddress;
  recipients: EmailRecipients;
  date: Date;
  receivedAt: Date;
  size: number;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isDraft: boolean;
  isSent: boolean;
  isTrash: boolean;
  isSpam: boolean;
  hasAttachments: boolean;
  snippet: string;
  previewText: string;
}

// Email address type
export interface EmailAddress {
  name: string;
  email: string;
}

// Email recipients
export interface EmailRecipients {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
}

// Provider-specific API responses
export interface GmailApiResponse {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{
      name: string;
      value: string;
    }>;
    body: {
      data?: string;
      attachmentId?: string;
    };
    parts?: Array<{
      mimeType: string;
      body: {
        data?: string;
        attachmentId?: string;
      };
    }>;
  };
}

export interface OutlookApiResponse {
  id: string;
  subject: string;
  sender: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  bodyPreview: string;
  receivedDateTime: string;
  isRead: boolean;
  isDraft: boolean;
  isStarred: boolean;
  categories: string[];
}

// Email sync status
export interface EmailSyncStatus {
  accountId: string;
  lastSyncAt: Date;
  syncStatus: 'idle' | 'in_progress' | 'error';
  error?: string;
  stats: {
    totalEmails: number;
    newEmails: number;
    updatedEmails: number;
    deletedEmails: number;
    failedEmails: number;
  };
}

// Email provider capabilities
export interface EmailProviderCapabilities {
  provider: EmailProvider;
  supportsOAuth: boolean;
  supportsImap: boolean;
  supportsLabels: boolean;
  supportsFolders: boolean;
  maxSyncWindow: number; // days
  rateLimits: {
    requestsPerMinute: number;
    maxBatchSize: number;
  };
}

// Utility types
export type EmailAccountUpdateData = Partial<Omit<EmailAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>;
export type EmailAccountSettingsUpdateData = Partial<EmailAccountSettings>;
export type ReadonlyEmailAccount = Readonly<EmailAccount>;
export type ReadonlyEmailMetadata = Readonly<EmailMetadata>;

// Record types for collections
export type UserEmailAccounts = Record<string, EmailAccount[]>;
export type EmailThreads = Record<string, EmailMetadata[]>;
export type EmailSyncStatuses = Record<string, EmailSyncStatus>;

export interface Email {
  id: string;
  subject: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  date: string;
  content: string;
  snippet: string;
  attachments?: {
    filename: string;
    contentType: string;
    size: number;
  }[];
  classification?: {
    category: EmailCategory;
    priority: Priority;
    actionStatus: ActionStatus;
    labels: string[];
    dueDate?: string;
    scheduledDate?: string;
    project?: string;
    context?: string;
  };
}

export interface GmailCredentials {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
  scope: string;
}

export interface OutlookCredentials {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
  scope: string;
}

export interface IMAPCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  useTLS: boolean;
}

export { EmailCategory, Priority, ActionStatus }; 