import { EmailProvider, OutlookOAuthCredentials, EmailMetadata } from '../types/email';

export class OutlookProvider {
  private credentials: OutlookOAuthCredentials;
  private baseUrl = 'https://graph.microsoft.com/v1.0/me/messages';

  constructor(credentials: OutlookOAuthCredentials) {
    this.credentials = credentials;
  }

  static async handleCallback(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
  ): Promise<OutlookOAuthCredentials> {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    return {
      provider: EmailProvider.OUTLOOK,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      scope: data.scope.split(' '),
    };
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (this.credentials.expiresAt > new Date()) {
      return;
    }

    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    this.credentials.accessToken = data.access_token;
    this.credentials.expiresAt = new Date(Date.now() + data.expires_in * 1000);
  }

  async fetchEmails(maxResults: number = 50): Promise<EmailMetadata[]> {
    await this.refreshTokenIfNeeded();

    const response = await fetch(
      `${this.baseUrl}?$top=${maxResults}&$select=id,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,bodyPreview,isRead,isDraft,isStarred,categories,hasAttachments,size`,
      {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch emails');
    }

    const data = await response.json();
    return data.value.map((email: any) => this.mapToEmailMetadata(email));
  }

  private mapToEmailMetadata(email: any): EmailMetadata {
    return {
      id: email.id,
      accountId: '', // Will be set by the worker
      providerId: email.id,
      threadId: email.conversationId,
      subject: email.subject || '',
      sender: {
        name: email.from?.emailAddress?.name || '',
        email: email.from?.emailAddress?.address || '',
      },
      recipients: {
        to: email.toRecipients?.map((r: any) => ({
          name: r.emailAddress?.name || '',
          email: r.emailAddress?.address || '',
        })) || [],
        cc: email.ccRecipients?.map((r: any) => ({
          name: r.emailAddress?.name || '',
          email: r.emailAddress?.address || '',
        })) || [],
        bcc: email.bccRecipients?.map((r: any) => ({
          name: r.emailAddress?.name || '',
          email: r.emailAddress?.address || '',
        })) || [],
      },
      date: new Date(email.receivedDateTime),
      receivedAt: new Date(email.receivedDateTime),
      size: email.size || 0,
      labels: email.categories || [],
      isRead: email.isRead || false,
      isStarred: email.isStarred || false,
      isDraft: email.isDraft || false,
      isSent: false, // Not available in basic query
      isTrash: false, // Not available in basic query
      isSpam: false, // Not available in basic query
      hasAttachments: email.hasAttachments || false,
      snippet: email.bodyPreview || '',
      previewText: email.bodyPreview || '',
    };
  }
} 