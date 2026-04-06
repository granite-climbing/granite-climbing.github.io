-- Temporary storage for Instagram account selection after OAuth callback
-- Stores all accounts from /me/accounts so the admin can pick one.
-- Rows expire after 10 minutes (same pattern as instagram_oauth_state).
CREATE TABLE IF NOT EXISTS instagram_pending_accounts (
  session_id   TEXT PRIMARY KEY,
  accounts     TEXT NOT NULL,  -- JSON: array of { id, name, access_token, ig_id, ig_username }
  short_token  TEXT NOT NULL,
  created_at   TEXT NOT NULL   -- ISO 8601 UTC datetime (expires after 10 minutes)
);
