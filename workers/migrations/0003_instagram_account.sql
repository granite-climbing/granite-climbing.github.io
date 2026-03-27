-- Add Instagram account info columns to beta_videos
-- Stores the poster's username and post timestamp fetched via individual media API calls

ALTER TABLE beta_videos ADD COLUMN instagram_username TEXT;
ALTER TABLE beta_videos ADD COLUMN instagram_timestamp TEXT;
