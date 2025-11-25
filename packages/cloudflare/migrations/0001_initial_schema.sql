-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  verification_token TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_verification ON users(verification_token);

-- Sessions for refresh tokens
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- OAuth connections (HubSpot, Salesforce, Zendesk, Intercom, Freshdesk)
CREATE TABLE oauth_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_expires_at INTEGER,
  scope TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_oauth_user_provider ON oauth_connections(user_id, provider);

-- Workflow configurations (Report settings per user)
CREATE TABLE workflow_configs (
  user_id TEXT PRIMARY KEY,
  crm_provider TEXT,
  support_provider TEXT,
  report_frequency TEXT NOT NULL DEFAULT 'weekly',
  report_destination TEXT NOT NULL DEFAULT 'email',
  destination_config TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  last_run_at INTEGER,
  next_run_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_workflow_next_run ON workflow_configs(next_run_at, enabled);

-- Report history
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_content TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_reports_user ON reports(user_id, created_at);

-- API keys for programmatic access
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_apikeys_user ON api_keys(user_id);
