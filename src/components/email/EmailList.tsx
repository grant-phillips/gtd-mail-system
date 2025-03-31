import React, { useState } from 'react';
import { Email } from '../../types/email';
import { useEmailAccount } from '../../contexts/EmailAccountContext';

interface EmailListProps {
  accountId: string;
}

export function EmailList({ accountId }: EmailListProps) {
  const { fetchEmails, isLoading, error } = useEmailAccount();
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  React.useEffect(() => {
    const loadEmails = async () => {
      const fetchedEmails = await fetchEmails(accountId);
      setEmails(fetchedEmails);
    };
    loadEmails();
  }, [accountId, fetchEmails]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading emails</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No emails</h3>
        <p className="mt-1 text-sm text-gray-500">No emails found in this account.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
        <div className="divide-y divide-gray-200">
          {emails.map((email) => (
            <div
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                selectedEmail?.id === email.id ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {email.from.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{email.from.name}</p>
                    <p className="text-sm text-gray-500">{email.from.email}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(email.date).toLocaleDateString()}
                </p>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">{email.subject}</p>
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{email.snippet}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="w-1/2 p-6 overflow-y-auto">
        {selectedEmail ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{selectedEmail.subject}</h2>
              <p className="text-sm text-gray-500">
                {new Date(selectedEmail.date).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {selectedEmail.from.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedEmail.from.name}</p>
                <p className="text-sm text-gray-500">{selectedEmail.from.email}</p>
              </div>
            </div>
            <div className="prose max-w-none">
              {selectedEmail.content}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select an email</h3>
            <p className="mt-1 text-sm text-gray-500">Choose an email from the list to view its content.</p>
          </div>
        )}
      </div>
    </div>
  );
} 