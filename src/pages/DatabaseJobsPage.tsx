import { useEffect, useState, useCallback } from 'react';
import { useToast } from '../hooks/useToast';
import {
  IconSearch,
  IconMapPin,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
} from '../components/Icons';
import initSqlJs, { type Database } from 'sql.js';

interface DbJob {
  id: number;
  job_title: string;
  company: string;
  location: string;
  job_description: string;
  job_type: string;
  salary_range: string;
  experience_level: string;
  department: string;
  required_skills: string;
  benefits: string;
  language: string;
  industry: string;
  application_deadline: string;
  source_url: string;
  date_posted: string;
  date_crawled: string;
  date_first_recorded: string;
  date_added: string;
  tags: string;
  location_country: string;
  location_city: string;
  location_remote: number;
  post_language: string;
}

export function DatabaseJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<DbJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<DbJob[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState<Database | null>(null);

  // Filters
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  // Selected job for detail view
  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);

  const pageSize = 30;

  // Load database
  useEffect(() => {
    let cancelled = false;
    const loadDb = async () => {
      setLoading(true);
      try {
        const SQL = await initSqlJs({
          locateFile: (file) => `https://sql.js.org/dist/${file}`,
        });
        const response = await fetch('/jobs.db');
        if (!response.ok) throw new Error('Failed to load database file');
        const buffer = await response.arrayBuffer();
        const database = new SQL.Database(new Uint8Array(buffer));
        if (!cancelled) {
          setDb(database);
        }
      } catch (e: any) {
        if (!cancelled) {
          toast(e.message || 'Failed to load database', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadDb();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Query jobs from database
  const loadJobs = useCallback(() => {
    if (!db) return;

    let sql = 'SELECT * FROM job_openings WHERE 1=1';
    const params: string[] = [];

    if (query) {
      sql += ' AND (job_title LIKE ? OR company LIKE ? OR job_description LIKE ?)';
      const q = `%${query}%`;
      params.push(q, q, q);
    }
    if (location) {
      sql += ' AND (location LIKE ? OR location_country LIKE ? OR location_city LIKE ?)';
      const loc = `%${location}%`;
      params.push(loc, loc, loc);
    }
    if (jobType) {
      sql += ' AND job_type = ?';
      params.push(jobType);
    }
    if (experienceLevel) {
      sql += ' AND experience_level = ?';
      params.push(experienceLevel);
    }
    if (remoteOnly) {
      sql += ' AND location_remote = 1';
    }

    // Get total count
    const countResult = db.exec(`SELECT COUNT(*) as total FROM (${sql})`, params);
    const total = countResult[0]?.values[0][0] as number || 0;
    const newTotalPages = Math.ceil(total / pageSize);

    // Get paginated results
    sql += ' ORDER BY date_added DESC LIMIT ? OFFSET ?';
    params.push(String(pageSize), String((page - 1) * pageSize));

    const results = db.exec(sql, params);
    if (results.length > 0) {
      const columns = results[0].columns;
      const rows = results[0].values;
      const jobList: DbJob[] = rows.map((row) => {
        const job: any = {};
        columns.forEach((col, i) => {
          job[col] = row[i];
        });
        return job as DbJob;
      });
      setJobs(jobList);
      setFilteredJobs(jobList);
    } else {
      setJobs([]);
      setFilteredJobs([]);
    }
    setTotalPages(newTotalPages);
  }, [db, page, query, location, jobType, experienceLevel, remoteOnly]);

  useEffect(() => {
    if (db) {
      loadJobs();
    }
  }, [db, loadJobs]);

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h2>Job Listings Database</h2>
          <p>{jobs.length} jobs loaded from database</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar">
        <div className="search-input">
          <IconSearch />
          <input
            className="input"
            placeholder="Search jobs... (e.g., engineer, developer, analyst)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            onKeyDown={(e) => e.key === 'Enter' && loadJobs()}
          />
        </div>
        <input
          className="input"
          style={{ width: 'auto', minWidth: 140 }}
          placeholder="Location..."
          value={location}
          onChange={(e) => { setLocation(e.target.value); setPage(1); }}
        />
        <select
          className="select"
          value={jobType}
          onChange={(e) => { setJobType(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          <option value="Full-Time">Full-Time</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Contract">Contract</option>
          <option value="Freelance">Freelance</option>
          <option value="Internship">Internship</option>
        </select>
        <select
          className="select"
          value={experienceLevel}
          onChange={(e) => { setExperienceLevel(e.target.value); setPage(1); }}
        >
          <option value="">All Levels</option>
          <option value="Entry">Entry</option>
          <option value="Associate">Associate</option>
          <option value="Mid-Senior">Mid-Senior</option>
          <option value="Director">Director</option>
          <option value="Executive">Executive</option>
          <option value="Head Of">Head Of</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={remoteOnly} onChange={(e) => { setRemoteOnly(e.target.checked); setPage(1); }} />
          Remote only
        </label>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="loading">
          <div className="spinner" /> Loading database...
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <h3>No jobs found</h3>
          <p>Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <>
          <div className="job-list">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="job-card"
                onClick={() => setSelectedJob(job)}
              >
                <div className="job-card-body">
                  <div className="job-card-title">{job.job_title}</div>
                  <div className="job-card-company">{job.company}</div>
                  <div className="job-card-meta">
                    {job.location && (
                      <span><IconMapPin /> {job.location}</span>
                    )}
                    {job.date_posted && (
                      <span>{new Date(job.date_posted).toLocaleDateString()}</span>
                    )}
                    {job.job_type && (
                      <span className="source-badge">{job.job_type}</span>
                    )}
                    {job.location_remote === 1 && <span className="remote-badge">Remote</span>}
                  </div>
                </div>
                <div className="job-card-actions">
                  {job.salary_range && (
                    <span className="job-salary">
                      {job.salary_range}
                    </span>
                  )}
                  {job.experience_level && (
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      {job.experience_level}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <IconChevronLeft />
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages}
              </span>
              <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <IconChevronRight />
              </button>
            </div>
          )}
        </>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJob(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>{selectedJob.job_title}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setSelectedJob(null)}>
                <IconX />
              </button>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 4 }}>
                {selectedJob.company}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.85rem', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                {selectedJob.location && <span><IconMapPin /> {selectedJob.location}</span>}
                {selectedJob.location_remote === 1 && <span className="remote-badge">Remote</span>}
                {selectedJob.job_type && <span className="source-badge">{selectedJob.job_type}</span>}
                {selectedJob.salary_range && (
                  <span className="job-salary">
                    {selectedJob.salary_range}
                  </span>
                )}
                {selectedJob.experience_level && (
                  <span>{selectedJob.experience_level}</span>
                )}
              </div>
            </div>

            {selectedJob.job_description && (
              <div
                style={{
                  fontSize: '0.88rem',
                  lineHeight: 1.7,
                  maxHeight: 250,
                  overflow: 'auto',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                }}
                dangerouslySetInnerHTML={{ __html: selectedJob.job_description }}
              />
            )}

            {(selectedJob.required_skills || selectedJob.benefits || selectedJob.department) && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                {selectedJob.department && (
                  <div style={{ marginBottom: 8 }}>
                    <strong>Department:</strong> {selectedJob.department}
                  </div>
                )}
                {selectedJob.required_skills && (
                  <div style={{ marginBottom: 8 }}>
                    <strong>Required Skills:</strong> {selectedJob.required_skills}
                  </div>
                )}
                {selectedJob.benefits && (
                  <div style={{ marginBottom: 8 }}>
                    <strong>Benefits:</strong> {selectedJob.benefits}
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              {selectedJob.source_url && (
                <a href={selectedJob.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                  <IconExternalLink /> View Original
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
