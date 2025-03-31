import React, { useState } from 'react';
import { EmailAccount } from '../types/email';
import { AddAccountModal } from '../components/email/AddAccountModal';
import { EmailAccountList } from '../components/email/EmailAccountList';
import { EmailList } from '../components/email/EmailList';
import { useEmailAccount } from '../contexts/EmailAccountContext';

export function EmailManagement() {
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<EmailAccount | null>(null);
  const { accounts } = useEmailAccount();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Email Management</h1>
          <button
            onClick={() => setIsAddAccountModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Account
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Connected Accounts</h2>
              <EmailAccountList />
            </div>
          </div>
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg h-[calc(100vh-12rem)]">
              {selectedAccount ? (
                <EmailList accountId={selectedAccount.id} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Select an account</h3>
                    <p className="mt-1 text-sm text-gray-500">Choose an email account to view its emails.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AddAccountModal
        isOpen={isAddAccountModalOpen}
        onClose={() => setIsAddAccountModalOpen(false)}
      />
    </div>
  );
} 