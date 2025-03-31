import { EmailProvider, ImapCredentials, EmailMetadata } from '../types/email';
import Imap from 'imap';

export class ImapProvider {
  private credentials: ImapCredentials;
  private imap: Imap;

  constructor(credentials: ImapCredentials) {
    this.credentials = credentials;
    this.imap = new Imap({
      user: credentials.username,
      password: credentials.password,
      host: credentials.host,
      port: credentials.port,
      tls: credentials.useTLS,
      tlsOptions: { rejectUnauthorized: false },
    });
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => resolve());
      this.imap.once('error', (err) => reject(err));
      this.imap.connect();
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.imap.end();
      resolve();
    });
  }

  async fetchEmails(maxResults: number = 50): Promise<EmailMetadata[]> {
    await this.connect();

    return new Promise((resolve, reject) => {
      const emails: EmailMetadata[] = [];
      let processedCount = 0;

      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          this.disconnect();
          reject(err);
          return;
        }

        const f = this.imap.seq.fetch(`${Math.max(1, box.messages.total - maxResults + 1)}:*`, {
          bodies: ['HEADER.FIELDS (FROM TO CC BCC SUBJECT DATE)', 'TEXT'],
          struct: true,
        });

        f.on('message', (msg) => {
          const email: Partial<EmailMetadata> = {
            id: msg.attributes.uid.toString(),
            providerId: msg.attributes.uid.toString(),
            date: new Date(msg.attributes.date),
            receivedAt: new Date(msg.attributes.date),
            size: msg.attributes.size,
            labels: [],
            isRead: !msg.attributes.flags?.includes('\\Seen'),
            isStarred: msg.attributes.flags?.includes('\\Flagged') || false,
            isDraft: msg.attributes.flags?.includes('\\Draft') || false,
            isSent: msg.attributes.flags?.includes('\\Sent') || false,
            isTrash: msg.attributes.flags?.includes('\\Trash') || false,
            isSpam: msg.attributes.flags?.includes('\\Spam') || false,
            hasAttachments: false,
          };

          msg.on('attributes', (attrs) => {
            if (attrs.struct) {
              email.hasAttachments = this.hasAttachments(attrs.struct);
            }
          });

          msg.on('body', (stream, info) => {
            let buffer = '';
            stream.on('data', (chunk) => {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', () => {
              if (info.which === 'TEXT') {
                email.previewText = buffer;
                email.snippet = buffer.substring(0, 200);
              } else {
                const headers = this.parseHeaders(buffer);
                email.subject = headers.subject || '';
                email.sender = headers.from || { name: '', email: '' };
                email.recipients = {
                  to: headers.to || [],
                  cc: headers.cc || [],
                  bcc: headers.bcc || [],
                };
              }
            });
          });

          msg.once('end', () => {
            emails.push(email as EmailMetadata);
            processedCount++;

            if (processedCount >= maxResults) {
              this.disconnect();
              resolve(emails);
            }
          });
        });

        f.once('error', (err) => {
          this.disconnect();
          reject(err);
        });

        f.once('end', () => {
          if (processedCount < maxResults) {
            this.disconnect();
            resolve(emails);
          }
        });
      });
    });
  }

  private hasAttachments(struct: any): boolean {
    if (struct.disposition && struct.disposition.type.toLowerCase() === 'attachment') {
      return true;
    }

    if (struct.parts) {
      return struct.parts.some((part: any) => this.hasAttachments(part));
    }

    return false;
  }

  private parseHeaders(headerString: string): any {
    const headers: any = {};
    const lines = headerString.split('\r\n');

    for (const line of lines) {
      const [name, ...values] = line.split(':');
      if (name && values.length > 0) {
        const value = values.join(':').trim();
        switch (name.toLowerCase()) {
          case 'from':
            headers.from = this.parseEmailAddress(value);
            break;
          case 'to':
            headers.to = this.parseEmailAddresses(value);
            break;
          case 'cc':
            headers.cc = this.parseEmailAddresses(value);
            break;
          case 'bcc':
            headers.bcc = this.parseEmailAddresses(value);
            break;
          case 'subject':
            headers.subject = value;
            break;
          case 'date':
            headers.date = value;
            break;
        }
      }
    }

    return headers;
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
 