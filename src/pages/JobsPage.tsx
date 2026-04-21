import { useEffect, useState, useCallback } from 'react';
import { fetchJobs, searchJobs, markJobsRead, createApplication, analyzeResume } from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
  IconSearch,
  IconRefresh,
  IconPlus,
  IconExternalLink,
  IconMapPin,
  IconX,
  IconStar,
  IconChevronLeft,
  IconChevronRight,
} from '../components/Icons';

export function JobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  // Filters
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [newOnly, setNewOnly] = useState(false);

  // Selected job for detail view
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '30' };
      if (query) params.query = query;
      if (location) params.location = location;
      if (source) params.source = source;
      if (remoteOnly) params.remote = '1';
      if (newOnly) params.new_only = '1';

      const data = await fetchJobs(params);
      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, query, location, source, remoteOnly, newOnly, toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const handleSearch = async () => {
    if (!query) {
      toast('Enter a search query first', 'error');
      return;
    }
    setSearching(true);
    try {
      const result = await searchJobs({ query, location: location || 'portugal,belgium' });
      toast(result.message, 'success');
      loadJobs();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleTrack = async (job: any) => {
    try {
      await createApplication({
        job_id: job.id,
        company: job.company,
        title: job.title,
        url: job.url,
        location: job.location,
        status: 'saved',
      });
      toast(`Saved "${job.title}" -- view in Saved tab`, 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markJobsRead({ mark_all: true });
      toast('All jobs marked as read', 'success');
      loadJobs();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleAnalyze = async (job: any) => {
    setAnalyzing(true);
    setAiAnalysis(null);
    try {
      const result = await analyzeResume({ job_id: job.id, job_title: job.title, job_description: job.description });
      setAiAnalysis(result.analysis);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return null;
    const fmt = (n: number) => {
      if (n >= 1000) return `${Math.round(n / 1000)}k`;
      return String(n);
    };
    const curr = currency === 'EUR' ? '\u20AC' : currency === 'GBP' ? '\u00A3' : '$';
    if (min && max) return `${curr}${fmt(min)}\u2013${curr}${fmt(max)}`;
    if (min) return `${curr}${fmt(min)}+`;
    return `Up to ${curr}${fmt(max!)}`;
  };

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h2>Job Listings</h2>
          <p>{total} jobs found across all sources</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {newOnly && (
            <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filters-bar">
        <div className="search-input">
          <IconSearch />
          <input
            className="input"
            placeholder="Search jobs... (e.g., wind turbine, CFD, data scientist)"
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
          value={source}
          onChange={(e) => { setSource(e.target.value); setPage(1); }}
        >
          <option value="">All Sources</option>
          <option value="theirstack">TheirStack</option>
          <option value="remotive">Remotive</option>
          <option value="arbeitnow">Arbeitnow</option>
          <option value="jobicy">Jobicy</option>
          <option value="adzuna">Adzuna</option>
          <option value="manual">Manual</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={remoteOnly} onChange={(e) => { setRemoteOnly(e.target.checked); setPage(1); }} />
          Remote only
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={newOnly} onChange={(e) => { setNewOnly(e.target.checked); setPage(1); }} />
          New only
        </label>
        <button className="btn btn-accent" onClick={handleSearch} disabled={searching}>
          <IconRefresh />
          {searching ? 'Searching...' : 'Fetch New'}
        </button>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="loading">
          <div className="spinner" /> Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <h3>No jobs found</h3>
          <p>Try a different search query or fetch new listings from job boards.</p>
        </div>
      ) : (
        <>
          <div className="job-list">
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`job-card ${job.is_new ? 'is-new' : ''}`}
                onClick={() => { setSelectedJob(job); setAiAnalysis(null); }}
              >
                <div className="job-card-body">
                  <div className="job-card-title">{job.title}</div>
                  <div className="job-card-company">{job.company}</div>
                  <div className="job-card-meta">
                    {job.location && (
                      <span><IconMapPin /> {job.location}</span>
                    )}
                    {job.date_posted && (
                      <span>{new Date(job.date_posted).toLocaleDateString()}</span>
                    )}
                    <span className="source-badge">{job.source}</span>
                    {job.remote === 1 && <span className="remote-badge">Remote</span>}
                  </div>
                </div>
                <div className="job-card-actions">
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                    <span className="job-salary">
                      {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
                    </span>
                  )}
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={(e) => { e.stopPropagation(); handleTrack(job); }}
                  >
                    <IconPlus /> Track
                  </button>
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
              <h3>{selectedJob.title}</h3>
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
                {selectedJob.remote === 1 && <span className="remote-badge">Remote</span>}
                <span className="source-badge">{selectedJob.source}</span>
                {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_currency) && (
                  <span className="job-salary">
                    {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_currency)}
                  </span>
                )}
              </div>
            </div>

            {selectedJob.description && (
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
                dangerouslySetInnerHTML={{ __html: selectedJob.description }}
              />
            )}

            {/* AI Analysis */}
            {aiAnalysis && (
              <div className="ai-analysis">
                <h4>AI Resume Analysis</h4>
                <div className="ai-analysis-content">{aiAnalysis}</div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => handleAnalyze(selectedJob)} disabled={analyzing}>
                <IconStar />
                {analyzing ? 'Analyzing...' : 'AI Resume Tips'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => { handleTrack(selectedJob); setSelectedJob(null); }}
              >
                <IconPlus /> Save Job
              </button>
              {selectedJob.url && (
                <a href={selectedJob.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
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
