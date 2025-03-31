import React, { useState } from 'react';
import { FolderSidebar } from './FolderSidebar';
import { EmailList } from './EmailList';
import { ClassificationProvider } from '../../contexts/ClassificationContext';

export function ClassificationView() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <ClassificationProvider>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isSidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
            />
          </svg>
        </button>

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <FolderSidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto p-4 lg:p-6">
            <EmailList />
          </div>
        </div>
      </div>
    </ClassificationProvider>
  );
} 