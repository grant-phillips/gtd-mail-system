-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails TEXT NOT NULL,
  cc_emails TEXT,
  bcc_emails TEXT,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  snippet TEXT,
  attachments TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Create email_classifications table
CREATE TABLE IF NOT EXISTS email_classifications (
  email_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  action_status TEXT NOT NULL,
  labels TEXT NOT NULL,
  due_date TEXT,
  scheduled_date TEXT,
  project TEXT,
  context TEXT,
  confidence REAL NOT NULL,
  reasoning TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  last_updated_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (email_id, user_id),
  FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE
);

-- Create classification_corrections table
CREATE TABLE IF NOT EXISTS classification_corrections (
  id TEXT PRIMARY KEY,
  email_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  original_classification TEXT NOT NULL,
  corrected_classification TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (email_id, user_id) REFERENCES email_classifications(email_id, user_id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_classifications_user_category ON email_classifications(user_id, category);
CREATE INDEX IF NOT EXISTS idx_email_classifications_user_priority ON email_classifications(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_email_classifications_user_action_status ON email_classifications(user_id, action_status);
CREATE INDEX IF NOT EXISTS idx_email_classifications_user_due_date ON email_classifications(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_email_classifications_user_scheduled_date ON email_classifications(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_email_classifications_user_project ON email_classifications(user_id, project);
CREATE INDEX IF NOT EXISTS idx_email_classifications_user_context ON email_classifications(user_id, context);

-- Create views
CREATE VIEW IF NOT EXISTS v_actionable_emails AS
SELECT 
  e.*,
  ec.category,
  ec.priority,
  ec.action_status,
  ec.labels,
  ec.due_date,
  ec.scheduled_date,
  ec.project,
  ec.context,
  ec.confidence
FROM emails e
JOIN email_classifications ec ON e.id = ec.email_id
WHERE ec.category = 'ACTIONABLE'
ORDER BY ec.priority DESC, e.date DESC;

CREATE VIEW IF NOT EXISTS v_reference_emails AS
SELECT 
  e.*,
  ec.category,
  ec.priority,
  ec.labels
FROM emails e
JOIN email_classifications ec ON e.id = ec.email_id
WHERE ec.category = 'REFERENCE'
ORDER BY e.date DESC;

-- Create triggers
CREATE TRIGGER IF NOT EXISTS trg_email_classifications_updated_at
AFTER UPDATE ON email_classifications
BEGIN
  UPDATE email_classifications
  SET updated_at = datetime('now')
  WHERE email_id = NEW.email_id AND user_id = NEW.user_id;
END; 