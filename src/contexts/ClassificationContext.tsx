import React, { createContext, useContext, useState, useCallback } from 'react';
import { Email, EmailCategory, Priority, ActionStatus } from '../types/email';
import { ClassificationMetadata } from '../types/classification';

interface ClassificationContextType {
  emails: Email[];
  loading: boolean;
  error: string | null;
  selectedCategory: EmailCategory | null;
  selectedEmail: Email | null;
  setSelectedCategory: (category: EmailCategory) => void;
  setSelectedEmail: (email: Email | null) => void;
  updateEmailClassification: (emailId: string, classification: ClassificationMetadata) => Promise<void>;
  refreshEmails: () => Promise<void>;
}

const ClassificationContext = createContext<ClassificationContextType | undefined>(undefined);

export function ClassificationProvider({ children }: { children: React.ReactNode }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EmailCategory | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  const refreshEmails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/emails?category=${selectedCategory}`);
      if (!response.ok) throw new Error('Failed to fetch emails');
      const data = await response.json();
      setEmails(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const updateEmailClassification = useCallback(async (
    emailId: string,
    classification: ClassificationMetadata
  ) => {
    try {
      setError(null);
      const response = await fetch(`/api/emails/${emailId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classification })
      });
      if (!response.ok) throw new Error('Failed to update classification');
      
      setEmails(prevEmails =>
        prevEmails.map(email =>
          email.id === emailId
            ? { ...email, classification }
            : email
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, []);

  return (
    <ClassificationContext.Provider
      value={{
        emails,
        loading,
        error,
        selectedCategory,
        selectedEmail,
        setSelectedCategory,
        setSelectedEmail,
        updateEmailClassification,
        refreshEmails
      }}
    >
      {children}
    </ClassificationContext.Provider>
  );
}

export function useClassification() {
  const context = useContext(ClassificationContext);
  if (context === undefined) {
    throw new Error('useClassification must be used within a ClassificationProvider');
  }
  return context;
} 