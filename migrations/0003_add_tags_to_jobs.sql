-- Add tags column to jobs table for storing job tags/keywords from APIs
-- ============================================================

ALTER TABLE jobs ADD COLUMN tags TEXT; -- JSON array of tags as text, e.g., '["engineer", "remote", "python"]'

-- Create index for tag-based queries (using JSON functions if needed)
-- Note: SQLite has limited JSON support, so we might need to use LIKE patterns for now
-- For better performance, consider storing as comma-separated or using full-text search later