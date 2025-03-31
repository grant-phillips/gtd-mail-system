import React, { createContext, useContext, useState, useCallback } from 'react';
import { EmailAccount, EmailProvider, EmailMetadata } from '../types/email';

interface EmailAccountContextType {
  accounts: EmailAccount[];
  isLoading: boolean;
  error: string | null;
  connectAccount: (provider: EmailProvider, redirectUri: string) => Promise<void>;
  disconnectAccount: (accountId: string) => Promise<void>;
  refreshAccount: (accountId: string) => Promise<void>;
  setPrimaryAccount: (accountId: string) => Promise<void>;
  fetchEmails: (accountId: string, maxResults?: number) => Promise<EmailMetadata[]>;
}

const EmailAccountContext = createContext<EmailAccountContextType | undefined>(undefined);

export function EmailAccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/email/accounts', {
        headers: {
          'X-User-ID': 'current-user-id', // Replace with actual user ID
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectAccount = async (provider: EmailProvider, redirectUri: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/email/accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'current-user-id', // Replace with actual user ID
        },
        body: JSON.stringify({ provider, redirectUri }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate connection');
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect account');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectAccount = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/email/accounts/${accountId}/disconnect`, {
        method: 'POST',
        headers: {
          'X-User-ID': 'current-user-id', // Replace with actual user ID
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect account');
      }

      setAccounts(accounts.filter(account => account.id !== accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect account');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAccount = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/email/accounts/${accountId}/refresh`, {
        method: 'POST',
        headers: {
          'X-User-ID': 'current-user-id', // Replace with actual user ID
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh account');
      }

      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh account');
    } finally {
      setIsLoading(false);
    }
  };

  const setPrimaryAccount = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/email/accounts/${accountId}/primary`, {
        method: 'POST',
        headers: {
          'X-User-ID': 'current-user-id', // Replace with actual user ID
        },
      });

      if (!response.ok) {
        throw new Error('Failed to set primary account');
      }

      setAccounts(accounts.map(account => ({
        ...account,
        isPrimary: account.id === accountId,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary account');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmails = async (accountId: string, maxResults: number = 50): Promise<EmailMetadata[]> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': 'current-user-id', // Replace with actual user ID
        },
        body: JSON.stringify({ accountId, maxResults }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch emails');
      }

      const data = await response.json();
      return data.emails;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EmailAccountContext.Provider
      value={{
        accounts,
        isLoading,
        error,
        connectAccount,
        disconnectAccount,
        refreshAccount,
        setPrimaryAccount,
        fetchEmails,
      }}
    >
      {children}
    </EmailAccountContext.Provider>
  );
}

export function useEmailAccount() {
  const context = useContext(EmailAccountContext);
  if (context === undefined) {
    throw new Error('useEmailAccount must be used within an EmailAccountProvider');
  }
  return context;
} 