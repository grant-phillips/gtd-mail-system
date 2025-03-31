/**
 * Email classification types for GTD Mail System
 */

// Core classification enums
export enum EmailCategory {
  ACTIONABLE = 'ACTIONABLE',
  TO_READ = 'TO_READ',
  REFERENCE = 'REFERENCE',
  AWAITING_RESPONSE = 'AWAITING_RESPONSE',
  DELEGATED = 'DELEGATED',
  SCHEDULED = 'SCHEDULED',
  ARCHIVED = 'ARCHIVED',
  TRASH = 'TRASH',
  SPAM = 'SPAM',
  UNCLASSIFIED = 'UNCLASSIFIED'
}

export enum Priority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NONE = 'NONE'
}

export enum ActionStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  DEFERRED = 'DEFERRED',
  CANCELLED = 'CANCELLED'
}

// Classification metadata
export interface ClassificationMetadata {
  category: EmailCategory;
  priority: Priority;
  actionStatus: ActionStatus;
  labels: string[];
  dueDate?: Date;
  scheduledDate?: Date;
  estimatedDuration?: number; // in minutes
  project?: string;
  context?: string;
  confidence: number; // 0-1 score for classification confidence
  lastUpdated: Date;
  lastUpdatedBy: 'system' | 'user';
}

// Classification rules
export interface CategoryRule {
  id: string;
  name: string;
  description?: string;
  category: EmailCategory;
  priority: Priority;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuleCondition {
  field: 'subject' | 'body' | 'sender' | 'recipients' | 'date' | 'attachments' | 'labels';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'regex' | 'greaterThan' | 'lessThan';
  value: string | number | Date | string[];
}

export interface RuleAction {
  type: 'setCategory' | 'setPriority' | 'addLabel' | 'removeLabel' | 'setDueDate' | 'setProject' | 'setContext';
  value: string | Date | string[];
}

// User corrections and feedback
export interface ClassificationCorrection {
  id: string;
  emailId: string;
  originalClassification: ClassificationMetadata;
  correctedClassification: ClassificationMetadata;
  reason?: string;
  createdAt: Date;
  userId: string;
}

export interface ClassificationFeedback {
  id: string;
  emailId: string;
  classification: ClassificationMetadata;
  isCorrect: boolean;
  feedback?: string;
  createdAt: Date;
  userId: string;
}

// Folder organization
export interface EmailFolder {
  id: string;
  name: string;
  description?: string;
  category: EmailCategory;
  parentId?: string;
  path: string;
  order: number;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderStructure {
  id: string;
  userId: string;
  folders: EmailFolder[];
  defaultFolders: {
    inbox: string;
    archive: string;
    trash: string;
    spam: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Machine learning support
export interface ClassificationTrainingData {
  id: string;
  emailId: string;
  features: {
    subject: string;
    body: string;
    sender: string;
    recipients: string[];
    date: Date;
    attachments: string[];
    labels: string[];
  };
  classification: ClassificationMetadata;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassificationModel {
  id: string;
  name: string;
  version: string;
  type: 'rule-based' | 'ml' | 'hybrid';
  status: 'active' | 'training' | 'error';
  performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  lastTrained: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Utility types
export type ClassificationUpdateData = Partial<ClassificationMetadata>;
export type CategoryRuleUpdateData = Partial<Omit<CategoryRule, 'id' | 'createdAt' | 'updatedAt'>>;
export type EmailFolderUpdateData = Partial<Omit<EmailFolder, 'id' | 'createdAt' | 'updatedAt'>>;

// Record types for collections
export type UserFolders = Record<string, EmailFolder[]>;
export type ClassificationCorrections = Record<string, ClassificationCorrection[]>;
export type ClassificationFeedbackMap = Record<string, ClassificationFeedback[]>; 