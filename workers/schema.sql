-- Beta videos submission table
-- Stores Instagram post URLs submitted by users for specific climbing problems
CREATE TABLE IF NOT EXISTS beta_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_slug TEXT NOT NULL,
  instagram_url TEXT NOT NULL,
  instagram_post_id TEXT,
  thumbnail_url TEXT,
  submitted_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending'
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_problem_slug ON beta_videos(problem_slug);
CREATE INDEX IF NOT EXISTS idx_status ON beta_videos(status);
CREATE INDEX IF NOT EXISTS idx_post_id ON beta_videos(instagram_post_id);
