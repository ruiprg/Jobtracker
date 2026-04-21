-- Add bucket support for the Saved page
-- bucket: category name for grouping (auto-assigned from search_query or manual)

ALTER TABLE applications ADD COLUMN bucket TEXT DEFAULT 'Uncategorized';

-- Buckets table: tracks custom bucket names and ordering
CREATE TABLE IF NOT EXISTS buckets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed default buckets matching the saved search categories
INSERT OR IGNORE INTO buckets (name, sort_order) VALUES
  ('Wind Energy', 1),
  ('CFD / Green Hydrogen', 2),
  ('Thermal / NVH / Aero', 3),
  ('Technical Consulting', 4),
  ('Quant / Data Science', 5),
  ('Remote Engineering', 6),
  ('Other', 99);
