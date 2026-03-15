-- Beta videos submission table
-- Stores video URLs submitted by users for specific climbing problems
-- Supports multiple platforms: instagram, youtube, tiktok, other

CREATE TABLE IF NOT EXISTS beta_videos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_slug TEXT NOT NULL,
  video_url    TEXT NOT NULL,
  post_id      TEXT,
  platform     TEXT DEFAULT 'instagram',
  thumbnail_url TEXT,
  submitted_at TEXT NOT NULL,
  status       TEXT DEFAULT 'approved',
  deleted_at   TEXT
);

CREATE INDEX IF NOT EXISTS idx_problem_slug ON beta_videos(problem_slug);
CREATE INDEX IF NOT EXISTS idx_status ON beta_videos(status);
CREATE INDEX IF NOT EXISTS idx_post_id ON beta_videos(post_id);
CREATE INDEX IF NOT EXISTS idx_platform ON beta_videos(platform);
