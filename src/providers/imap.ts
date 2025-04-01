id: messageId,
          accountId: '', // Will be set by the worker
          providerId: messageId,
          threadId: '',
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
          size: email.size,
          labels: [],
          isRead: !msg.attributes.flags?.includes('\\Seen'),
          isStarred: msg.attributes.flags?.includes('\\Flagged') || false,
          isDraft: msg.attributes.flags?.includes('\\Draft') || false,
          isSent: msg.attributes.flags?.includes('\\Sent') || false,
          isTrash: msg.attributes.flags?.includes('\\Trash') || false,
          isSpam: msg.attributes.flags?.includes('\\Spam') || false,
          hasAttachments: email.hasAttachments,
          snippet: buffer.substring(0, 200),
          previewText: buffer,
        };
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
    return value.split(',').map(addr => this.parseEmailAddress(addr.trim()));
  }
}