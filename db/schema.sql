-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    timezone TEXT NOT NULL,
    subscription_tier TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    verification_token TEXT,
    reset_password_token TEXT,
    reset_password_expires DATETIME
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    email_categorization_enabled BOOLEAN NOT NULL DEFAULT true,
    notification_email_preference TEXT NOT NULL,
    notification_push_preference TEXT NOT NULL,
    task_reminders_enabled BOOLEAN NOT NULL DEFAULT true,
    digest_time TEXT,
    ai_classification_enabled BOOLEAN NOT NULL DEFAULT true,
    task_creation_enabled BOOLEAN NOT NULL DEFAULT true,
    response_assistant_enabled BOOLEAN NOT NULL DEFAULT true,
    learning_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email accounts table
CREATE TABLE IF NOT EXISTS email_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    email TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_connected BOOLEAN NOT NULL DEFAULT false,
    last_sync_at DATETIME,
    sync_frequency INTEGER NOT NULL DEFAULT 15,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_password_token ON users(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider); 