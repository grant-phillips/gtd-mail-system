import React from 'react';
import { EmailCategory } from '../../types/email';
import { useClassification } from '../../contexts/ClassificationContext';

const categoryIcons: Record<EmailCategory, string> = {
  ACTIONABLE: '📋',
  TO_READ: '📚',
  REFERENCE: '📑',
  AWAITING_RESPONSE: '⏳',
  ARCHIVED: '📦',
  TRASH: '🗑️'
};

const categoryLabels: Record<EmailCategory, string> = {
  ACTIONABLE: 'Actionable',
  TO_READ: 'To Read',
  REFERENCE: 'Reference',
  AWAITING_RESPONSE: 'Awaiting Response',
  ARCHIVED: 'Archived',
  TRASH: 'Trash'
};

export function FolderSidebar() {
  const { selectedCategory, setSelectedCategory, emails } = useClassification();

  const getCategoryCount = (category: EmailCategory) => {
    return emails.filter(email => email.classification?.category === category).length;
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">GTD Categories</h2>
        <nav className="space-y-1">
          {Object.values(EmailCategory).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="mr-3">{categoryIcons[category]}</span>
              <span className="flex-1 text-left">{categoryLabels[category]}</span>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                {getCategoryCount(category)}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
} 