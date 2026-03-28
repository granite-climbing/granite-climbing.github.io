CREATE TABLE IF NOT EXISTS problems (
  slug  TEXT PRIMARY KEY,
  title TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_problems_title ON problems(lower(title));
