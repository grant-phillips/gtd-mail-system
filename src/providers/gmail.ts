import { EmailProvider, GmailOAuthCredentials, EmailMetadata } from '../types/email';

export class GmailProvider {
  private credentials: GmailOAuthCredentials;
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';

  constructor(credentials: GmailOAuthCredentials) {
    this.credentials = credentials;
  }

  static async handleCallback(
    code: string,
    redirectUri: string,
    clientId: string,
    clientSecret: string
  ): Promise<GmailOAuthCredentials> {
    const tokenUrl = 'https://oauth2.googleapis.com/token';
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
      provider: EmailProvider.GMAIL,
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

    const tokenUrl = 'https://oauth2.googleapis.com/token';
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
      `${this.baseUrl}/messages?maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch email list');
    }

    const data = await response.json();
    const emails: EmailMetadata[] = [];

    for (const message of data.messages) {
      const email = await this.fetchEmailDetails(message.id);
      emails.push(email);
    }

    return emails;
  }

  private async fetchEmailDetails(messageId: string): Promise<EmailMetadata> {
    const response = await fetch(
      `${this.baseUrl}/messages/${messageId}?format=full`,
      {
        headers: {
          Authorization: `Bearer ${this.credentials.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch email details');
    }

    const data = await response.json();
    const headers = this.parseHeaders(data.payload.headers);
    const body = await this.getEmailBody(data.payload);

    return {
      id: messageId,
      accountId: '', // Will be set by the worker
      providerId: messageId,
      threadId: data.threadId,
      subject: headers.subject || '',
      sender: {
        name: headers.from?.name || '',
        email: headers.from?.email || '',
      },
      recipients: {
        to: headers.to || [],
        cc: headers.cc || [],
        bcc: headers.bcc || [],
      },
      date: new Date(headers.date || Date.now()),
      receivedAt: new Date(headers.date || Date.now()),
      size: data.sizeEstimate,
      labels: data.labelIds || [],
      isRead: data.labelIds?.includes('UNREAD') === false,
      isStarred: data.labelIds?.includes('STARRED') === true,
      isDraft: data.labelIds?.includes('DRAFT') === true,
      isSent: data.labelIds?.includes('SENT') === true,
      isTrash: data.labelIds?.includes('TRASH') === true,
      isSpam: data.labelIds?.includes('SPAM') === true,
      hasAttachments: data.payload.parts?.some(
        (part: any) => part.filename && part.filename.length > 0
      ) || false,
      snippet: data.snippet || '',
      previewText: body,
    };
  }

  private parseHeaders(headers: any[]): any {
    const result: any = {};
    for (const header of headers) {
      switch (header.name.toLowerCase()) {
        case 'from':
          result.from = this.parseEmailAddress(header.value);
          break;
        case 'to':
          result.to = this.parseEmailAddresses(header.value);
          break;
        case 'cc':
          result.cc = this.parseEmailAddresses(header.value);
          break;
        case 'bcc':
          result.bcc = this.parseEmailAddresses(header.value);
          break;
        case 'subject':
          result.subject = header.value;
          break;
        case 'date':
          result.date = header.value;
          break;
      }
    }
    return result;
  }

  private parseEmailAddress(value: string): { name: string; email: string } {
    const match = value.match(/^(.*?)\s*<(.+?)>$/);
    if (match) {
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }
    return {
      name: '',
      email: value.trim(),
    };
  }

  private parseEmailAddresses(value: string): Array<{ name: string; email: string }> {
    return value.split(',').map(addr => this.parseEmailAddress(addr.trim()));
  }

  private async getEmailBody(payload: any): Promise<string> {
    if (payload.body.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      const textPart = payload.parts.find(
        (part: any) => part.mimeType === 'text/plain'
      );
      if (textPart && textPart.body.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return '';
  }
} 