import React from 'react';
import { EmailAccount } from '../../types/email';
import { useEmailAccount } from '../../contexts/EmailAccountContext';

export function EmailAccountList() {
  const { accounts, disconnectAccount, refreshAccount, isLoading, error } = useEmailAccount();

  if (isLoading && accounts.length === 0) {
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
            <h3 className="text-sm font-medium text-red-800">Error loading accounts</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No email accounts</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by connecting your first email account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account: EmailAccount) => (
        <div
          key={account.id}
          className="bg-white shadow rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {account.provider === 'GMAIL' && (
                <svg className="h-8 w-8 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.773 2.401-4.402 5.09-3.409l5.91 4.433 5.91-4.433c2.689-.993 5.09.636 5.09 3.409z"/>
                </svg>
              )}
              {account.provider === 'OUTLOOK' && (
                <svg className="h-8 w-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.88 3.39L6.6 1.86 2 5.71l1.29 1.53 4.59-3.85zM22 5.72l-4.6-3.89-1.29 1.53 4.6 3.89L22 5.72zM12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 16c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7zm-3.39-9.37l2.44-2.43 3.85 3.86-2.44 2.43-3.85-3.86zm5.73-2.04l-3.85-3.86 2.44-2.43 3.85 3.86-2.44 2.43z"/>
                </svg>
              )}
              {account.provider === 'IMAP' && (
                <svg className="h-8 w-8 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{account.email}</p>
              <p className="text-sm text-gray-500">{account.provider}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refreshAccount(account.id)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Refresh
            </button>
            <button
              onClick={() => disconnectAccount(account.id)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Disconnect
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 