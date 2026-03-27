-- Instagram OAuth token storage
-- Stores the long-lived access token for the connected Instagram Business Account
-- Only one active token row is maintained (single account)

CREATE TABLE IF NOT EXISTS instagram_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  access_token TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  token_type   TEXT DEFAULT 'long_lived',
  expires_at   TEXT NOT NULL,   -- ISO 8601 UTC datetime
  created_at   TEXT NOT NULL,   -- ISO 8601 UTC datetime
  updated_at   TEXT NOT NULL    -- ISO 8601 UTC datetime (last refresh)
);

-- Transient CSRF state tokens for OAuth flow
-- Created when admin requests auth URL, deleted after callback validation
CREATE TABLE IF NOT EXISTS instagram_oauth_state (
  state      TEXT PRIMARY KEY,
  created_at TEXT NOT NULL      -- ISO 8601 UTC datetime (expires after 10 minutes)
);
