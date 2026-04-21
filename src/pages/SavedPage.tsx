import { useEffect, useState, useCallback } from 'react';
import {
  fetchApplications,
  fetchBuckets,
  createBucket,
  deleteBucket,
  bulkUpdateApplications,
  updateApplication,
  deleteApplication,
} from '../lib/api';
import { useToast } from '../hooks/useToast';
import {
  IconPlus,
  IconX,
  IconTrash,
  IconExternalLink,
  IconChevronRight,
} from '../components/Icons';

export function SavedPage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [newBucketName, setNewBucketName] = useState('');
  const [showNewBucket, setShowNewBucket] = useState(false);
  const [movingBucket, setMovingBucket] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [appData, bucketData] = await Promise.all([
        fetchApplications({ status: 'saved', limit: '500' }),
        fetchBuckets(),
      ]);
      setApplications(appData.applications);
      setBuckets(bucketData);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group applications by bucket
  const grouped = new Map<string, any[]>();
  // Initialize with known buckets in order
  for (const b of buckets) {
    grouped.set(b.name, []);
  }
  // Add any buckets that exist on apps but not in the buckets table
  for (const app of applications) {
    const bucket = app.bucket || 'Uncategorized';
    if (!grouped.has(bucket)) {
      grouped.set(bucket, []);
    }
    grouped.get(bucket)!.push(app);
  }
  // Remove empty buckets that aren't in the buckets table (except Uncategorized)
  for (const [name, apps] of grouped) {
    if (apps.length === 0 && !buckets.find((b: any) => b.name === name) && name !== 'Uncategorized') {
      grouped.delete(name);
    }
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (bucketApps: any[]) => {
    const ids = bucketApps.map((a) => a.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleMoveToPipeline = async () => {
    if (selected.size === 0) {
      toast('Select jobs to move to pipeline', 'error');
      return;
    }
    try {
      await bulkUpdateApplications({ ids: Array.from(selected), action: 'move_to_pipeline' });
      toast(`Moved ${selected.size} job${selected.size > 1 ? 's' : ''} to Pipeline as "Applied"`, 'success');
      setSelected(new Set());
      loadData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleChangeBucket = async (targetBucket: string) => {
    if (selected.size === 0) return;
    try {
      await bulkUpdateApplications({ ids: Array.from(selected), action: 'change_bucket', bucket: targetBucket });
      toast(`Moved ${selected.size} job${selected.size > 1 ? 's' : ''} to "${targetBucket}"`, 'success');
      setSelected(new Set());
      setMovingBucket(null);
      loadData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Remove ${selected.size} saved job${selected.size > 1 ? 's' : ''}?`)) return;
    try {
      await bulkUpdateApplications({ ids: Array.from(selected), action: 'delete' });
      toast(`Removed ${selected.size} job${selected.size > 1 ? 's' : ''}`, 'success');
      setSelected(new Set());
      loadData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleCreateBucket = async () => {
    if (!newBucketName.trim()) return;
    try {
      await createBucket(newBucketName.trim());
      toast(`Bucket "${newBucketName}" created`, 'success');
      setNewBucketName('');
      setShowNewBucket(false);
      loadData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleDeleteBucket = async (id: number, name: string) => {
    if (!confirm(`Delete bucket "${name}"? Jobs will move to Uncategorized.`)) return;
    try {
      await deleteBucket(id);
      toast(`Bucket "${name}" deleted`, 'success');
      loadData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleRemoveSingle = async (id: number) => {
    try {
      await deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast('Removed from saved', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" /> Loading saved jobs...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h2>Saved Jobs</h2>
          <p>
            {applications.length} job{applications.length !== 1 ? 's' : ''} saved across{' '}
            {grouped.size} bucket{grouped.size !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          {selected.size > 0 && (
            <>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-accent)', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                {selected.size} selected
              </span>

              {/* Move to bucket dropdown */}
              <div style={{ position: 'relative' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setMovingBucket(movingBucket ? null : 'open')}>
                  Move to bucket
                </button>
                {movingBucket && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 4,
                    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', zIndex: 50,
                    minWidth: 200, padding: 'var(--space-xs)',
                  }}>
                    {Array.from(grouped.keys()).map((name) => (
                      <button
                        key={name}
                        className="btn btn-ghost btn-sm"
                        style={{ width: '100%', justifyContent: 'flex-start' }}
                        onClick={() => handleChangeBucket(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn btn-accent btn-sm" onClick={handleMoveToPipeline}>
                <IconChevronRight /> Move to Pipeline
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>
                <IconTrash />
              </button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNewBucket(true)}>
            <IconPlus /> New Bucket
          </button>
        </div>
      </div>

      {/* New bucket form */}
      {showNewBucket && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-md)' }}>
          <input
            className="input"
            style={{ flex: 1 }}
            placeholder="Bucket name (e.g., 'Green Hydrogen', 'Lisbon Companies')"
            value={newBucketName}
            onChange={(e) => setNewBucketName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateBucket()}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" onClick={handleCreateBucket}>Create</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setShowNewBucket(false); setNewBucketName(''); }}>
            <IconX />
          </button>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="empty-state">
          <h3>No saved jobs yet</h3>
          <p>Go to Job Listings and click "Track" on jobs you're interested in. They'll appear here organized by category.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
          {Array.from(grouped.entries()).map(([bucketName, bucketApps]) => {
            const bucketObj = buckets.find((b: any) => b.name === bucketName);
            const allSelected = bucketApps.length > 0 && bucketApps.every((a: any) => selected.has(a.id));

            return (
              <div key={bucketName}>
                {/* Bucket Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
                  marginBottom: 'var(--space-sm)', padding: '0 var(--space-sm)',
                }}>
                  {bucketApps.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => toggleSelectAll(bucketApps)}
                      title="Select all in bucket"
                      style={{ cursor: 'pointer' }}
                    />
                  )}
                  <h3 style={{
                    fontSize: '0.95rem', fontWeight: 700,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.01em',
                  }}>
                    {bucketName}
                  </h3>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                    background: 'var(--color-bg-hover)', padding: '1px 8px',
                    borderRadius: 'var(--radius-full)', color: 'var(--color-text-tertiary)',
                  }}>
                    {bucketApps.length}
                  </span>
                  <div style={{ flex: 1 }} />
                  {bucketObj && bucketName !== 'Other' && bucketName !== 'Uncategorized' && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}
                      onClick={() => handleDeleteBucket(bucketObj.id, bucketName)}
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>

                {/* Jobs in this bucket */}
                {bucketApps.length === 0 ? (
                  <div style={{
                    padding: 'var(--space-lg)', textAlign: 'center',
                    color: 'var(--color-text-tertiary)', fontSize: '0.85rem',
                    border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)',
                  }}>
                    No jobs in this bucket
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                    {bucketApps.map((app: any) => (
                      <div
                        key={app.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-md)',
                          padding: 'var(--space-sm) var(--space-md)',
                          background: selected.has(app.id) ? 'var(--color-accent-light)' : 'var(--color-bg-elevated)',
                          border: `1px solid ${selected.has(app.id) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                          borderRadius: 'var(--radius-md)',
                          transition: 'all 120ms ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(app.id)}
                          onChange={() => toggleSelect(app.id)}
                          style={{ cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem', lineHeight: 1.3 }}>
                            {app.title}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {app.company}
                            {app.location && <span> &middot; {app.location}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
                          {app.url && (
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-ghost btn-sm"
                              onClick={(e) => e.stopPropagation()}
                              title="View job posting"
                            >
                              <IconExternalLink />
                            </a>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleRemoveSingle(app.id)}
                            title="Remove"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            <IconX />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Click outside to close bucket dropdown */}
      {movingBucket && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => setMovingBucket(null)}
        />
      )}
    </div>
  );
}
