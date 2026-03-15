-- Migration: instagram_url → video_url (multi-platform support)
-- Run this ONLY if upgrading from the old schema (instagram_url, instagram_post_id columns)
--
-- wrangler d1 execute granite --remote --file=migrate.sql

CREATE TABLE IF NOT EXISTS beta_videos_new (
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

INSERT INTO beta_videos_new (id, problem_slug, video_url, post_id, platform, thumbnail_url, submitted_at, status)
SELECT id, problem_slug, instagram_url, instagram_post_id, 'instagram', thumbnail_url, submitted_at, status
FROM beta_videos;

DROP TABLE beta_videos;
ALTER TABLE beta_videos_new RENAME TO beta_videos;

CREATE INDEX IF NOT EXISTS idx_problem_slug ON beta_videos(problem_slug);
CREATE INDEX IF NOT EXISTS idx_status ON beta_videos(status);
CREATE INDEX IF NOT EXISTS idx_post_id ON beta_videos(post_id);
CREATE INDEX IF NOT EXISTS idx_platform ON beta_videos(platform);
