-- JobTracker: Initial database schema
-- Tables: jobs, applications, saved_searches, resume, notifications

-- ============================================================
-- Jobs: aggregated job listings from all sources
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  salary_min REAL,
  salary_max REAL,
  salary_currency TEXT DEFAULT 'EUR',
  description TEXT,
  url TEXT NOT NULL,
  source TEXT NOT NULL, -- 'adzuna', 'remotive', 'arbeitnow', 'rss', 'manual'
  search_query TEXT,
  remote INTEGER DEFAULT 0, -- boolean: 1 = remote
  date_posted TEXT,
  date_found TEXT DEFAULT (datetime('now')),
  is_new INTEGER DEFAULT 1, -- boolean: unseen by user
  UNIQUE(url)
);

CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_date_found ON jobs(date_found);
CREATE INDEX idx_jobs_is_new ON jobs(is_new);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_title ON jobs(title);

-- ============================================================
-- Applications: tracks user's application pipeline
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER REFERENCES jobs(id) ON DELETE SET NULL,
  -- Denormalized fields (in case job is from import or deleted)
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  location TEXT,
  -- Pipeline status
  status TEXT NOT NULL DEFAULT 'saved'
    CHECK(status IN ('saved', 'applied', 'interview', 'offer', 'accepted', 'rejected')),
  applied_date TEXT,
  -- Metadata
  notes TEXT,
  salary_info TEXT,
  contact_name TEXT,
  contact_email TEXT,
  follow_up_date TEXT,
  -- Timestamps
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_follow_up ON applications(follow_up_date);

-- ============================================================
-- Saved Searches: pre-configured job search criteria
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  keywords TEXT NOT NULL, -- comma-separated keywords
  location TEXT, -- 'portugal', 'belgium', 'remote', etc.
  remote_only INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  last_run TEXT,
  results_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- Resume: stored resume text for AI comparison
-- ============================================================
CREATE TABLE IF NOT EXISTS resume (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT,
  text_content TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- Notifications: log of sent notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- 'new_jobs', 'follow_up_reminder'
  message TEXT NOT NULL,
  sent_to TEXT,
  sent_at TEXT DEFAULT (datetime('now')),
  read INTEGER DEFAULT 0
);

CREATE INDEX idx_notifications_read ON notifications(read);

-- ============================================================
-- Status history: tracks status changes for analytics
-- ============================================================
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_status_history_app ON status_history(application_id);

-- ============================================================
-- Seed: default saved searches for the target job categories
-- ============================================================
INSERT INTO saved_searches (name, keywords, location, remote_only) VALUES
  ('Wind Energy - Portugal', 'wind turbine performance engineer, wind energy, site assessment', 'portugal', 0),
  ('Wind Energy - Belgium', 'wind turbine performance engineer, wind energy, site assessment', 'belgium', 0),
  ('CFD / Green Hydrogen', 'CFD engineer, green hydrogen, computational fluid dynamics', 'portugal,belgium', 0),
  ('Thermal / NVH / Aero', 'thermal management engineer, NVH specialist, aerodynamicist', 'portugal,belgium', 0),
  ('Technical Consulting', 'technical consultant, simulation lead, project manager engineering', 'portugal,belgium', 0),
  ('Quant / Data Science', 'quantitative analyst, data scientist, risk modeler', 'portugal,belgium', 0),
  ('Remote Engineering', 'wind turbine, CFD, simulation, thermal, data scientist', 'remote', 1),
  ('Remote Quant / Data', 'quantitative analyst, data scientist, risk modeler, quant', 'remote', 1);
