import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Email, Priority } from '../../types/email';
import { useClassification } from '../../contexts/ClassificationContext';

interface EmailItemProps {
  email: Email;
  index: number;
  onQuickAction: (action: string) => void;
}

function EmailItem({ email, index, onQuickAction }: EmailItemProps) {
  const priorityColors: Record<Priority, string> = {
    URGENT: 'bg-red-100 text-red-800',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-green-100 text-green-800'
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-2">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[email.classification?.priority || 'MEDIUM']}`}>
              {email.classification?.priority}
            </span>
            <h3 className="text-sm font-medium text-gray-900">{email.subject}</h3>
          </div>
          <p className="mt-1 text-sm text-gray-500">{email.from.name}</p>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{email.snippet}</p>
        </div>
        <div className="ml-4 flex space-x-2">
          <button
            onClick={() => onQuickAction('archive')}
            className="p-1 text-gray-400 hover:text-gray-500"
          >
            📦
          </button>
          <button
            onClick={() => onQuickAction('delete')}
            className="p-1 text-gray-400 hover:text-red-500"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmailList() {
  const { emails, loading, error, selectedCategory, updateEmailClassification } = useClassification();

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const emailId = result.draggableId;
    const newCategory = result.destination.droppableId as Email['classification']['category'];

    await updateEmailClassification(emailId, {
      ...emails.find(e => e.id === emailId)?.classification!,
      category: newCategory
    });
  };

  const handleQuickAction = async (emailId: string, action: string) => {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    switch (action) {
      case 'archive':
        await updateEmailClassification(emailId, {
          ...email.classification!,
          category: 'ARCHIVED'
        });
        break;
      case 'delete':
        await updateEmailClassification(emailId, {
          ...email.classification!,
          category: 'TRASH'
        });
        break;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!emails.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <p className="text-lg font-medium">No emails found</p>
        <p className="text-sm mt-2">Emails in this category will appear here</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId={selectedCategory || ''}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2"
          >
            {emails.map((email, index) => (
              <Draggable key={email.id} draggableId={email.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <EmailItem
                      email={email}
                      index={index}
                      onQuickAction={(action) => handleQuickAction(email.id, action)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
} 