import { useEffect, useState, useMemo } from 'react';
import { useToast } from '../hooks/useToast';
import {
  IconSearch,
  IconMapPin,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
} from '../components/Icons';

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

const pageSize = 30;

export function DatabaseJobsPage() {
  const { toast } = useToast();
  const [allJobs, setAllJobs] = useState<DbJob[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);

  const [selectedJob, setSelectedJob] = useState<DbJob | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadJobs = async () => {
      setLoading(true);
      try {
        const response = await fetch('/jobs-data.json');
        if (!response.ok) throw new Error('Failed to load jobs data');
        const data: DbJob[] = await response.json();
        if (!cancelled) {
          setAllJobs(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          toast(e.message || 'Failed to load jobs', 'error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadJobs();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const filteredJobs = useMemo(() => {
    let result = [...allJobs];

    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (j) =>
          j.job_title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.job_description.toLowerCase().includes(q)
      );
    }
    if (location) {
      const loc = location.toLowerCase();
      result = result.filter(
        (j) =>
          j.location.toLowerCase().includes(loc) ||
          (j.location_country || '').toLowerCase().includes(loc) ||
          (j.location_city || '').toLowerCase().includes(loc)
      );
    }
    if (jobType) {
      result = result.filter((j) => j.job_type === jobType);
    }
    if (experienceLevel) {
      result = result.filter((j) => j.experience_level === experienceLevel);
    }
    if (remoteOnly) {
      result = result.filter((j) => j.location_remote === 1);
    }

    result.sort((a, b) => (b.date_added || '').localeCompare(a.date_added || ''));
    return result;
  }, [allJobs, query, location, jobType, experienceLevel, remoteOnly]);

  const totalPages = Math.ceil(filteredJobs.length / pageSize);
  const start = (page - 1) * pageSize;
  const displayedJobs = filteredJobs.slice(start, start + pageSize);

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h2>Job Listings Database</h2>
          <p>{filteredJobs.length} jobs{filteredJobs.length !== allJobs.length ? ` (from ${allJobs.length} total)` : ''}</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="search-input">
          <IconSearch />
          <input
            className="input"
            placeholder="Search jobs... (e.g., engineer, developer, analyst)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
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

      {loading ? (
        <div className="loading">
          <div className="spinner" /> Loading jobs...
        </div>
      ) : displayedJobs.length === 0 ? (
        <div className="empty-state">
          <h3>No jobs found</h3>
          <p>Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <>
          <div className="job-list">
            {displayedJobs.map((job) => (
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
