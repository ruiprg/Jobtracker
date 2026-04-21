import { useEffect, useState, useCallback } from 'react';
import { fetchApplications, updateApplication, deleteApplication, createApplication } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { PIPELINE_STAGES, type ApplicationStatus } from '../lib/types';
import {
  IconPlus,
  IconX,
  IconTrash,
  IconEdit,
  IconExternalLink,
  IconChevronRight,
  IconCalendar,
} from '../components/Icons';

export function PipelinePage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingApp, setEditingApp] = useState<any>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      const data = await fetchApplications({ limit: '200' });
      setApplications(data.applications);
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleStatusChange = async (appId: number, newStatus: ApplicationStatus) => {
    try {
      await updateApplication({ id: appId, status: newStatus });
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: newStatus, updated_at: new Date().toISOString() } : a))
      );
      toast(`Moved to ${newStatus}`, 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = async (appId: number) => {
    if (!confirm('Remove this application from tracking?')) return;
    try {
      await deleteApplication(appId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      toast('Application removed', 'success');
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const grouped = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    apps: applications.filter((a) => a.status === stage.key),
  }));

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" /> Loading pipeline...
      </div>
    );
  }

  return (
    <div>
      <div className="page-header page-header-actions">
        <div>
          <h2>Application Pipeline</h2>
          <p>{applications.length} applications tracked</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
          <IconPlus /> Add Application
        </button>
      </div>

      {/* Kanban Board */}
      <div className="pipeline-board">
        {grouped.map((col) => (
          <div className="pipeline-column" key={col.key}>
            <div className="pipeline-column-header">
              <span className="dot" style={{ background: col.color }} />
              {col.label}
              <span className="count">{col.apps.length}</span>
            </div>
            <div className="pipeline-cards">
              {col.apps.map((app) => (
                <div
                  className="pipeline-card"
                  key={app.id}
                  onClick={() => setEditingApp(app)}
                >
                  <div className="pipeline-card-title">{app.title}</div>
                  <div className="pipeline-card-company">{app.company}</div>
                  {app.location && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                      {app.location}
                    </div>
                  )}
                  {app.applied_date && (
                    <div className="pipeline-card-date">
                      Applied {new Date(app.applied_date).toLocaleDateString()}
                    </div>
                  )}
                  {app.follow_up_date && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-accent)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconCalendar /> Follow up {new Date(app.follow_up_date).toLocaleDateString()}
                    </div>
                  )}
                  <div className="pipeline-card-actions">
                    {/* Move forward / back buttons */}
                    {col.key !== 'rejected' && col.key !== 'accepted' && (
                      <>
                        {PIPELINE_STAGES.findIndex((s) => s.key === col.key) > 0 && (
                          <button
                            className="btn btn-sm btn-ghost"
                            title="Move back"
                            onClick={(e) => {
                              e.stopPropagation();
                              const idx = PIPELINE_STAGES.findIndex((s) => s.key === col.key);
                              handleStatusChange(app.id, PIPELINE_STAGES[idx - 1].key);
                            }}
                          >
                            &larr;
                          </button>
                        )}
                        {PIPELINE_STAGES.findIndex((s) => s.key === col.key) < PIPELINE_STAGES.length - 3 && (
                          <button
                            className="btn btn-sm btn-secondary"
                            title="Move forward"
                            onClick={(e) => {
                              e.stopPropagation();
                              const idx = PIPELINE_STAGES.findIndex((s) => s.key === col.key);
                              handleStatusChange(app.id, PIPELINE_STAGES[idx + 1].key);
                            }}
                          >
                            &rarr;
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              {col.apps.length === 0 && (
                <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
                  No applications
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Application Modal */}
      {editingApp && (
        <EditApplicationModal
          app={editingApp}
          onClose={() => setEditingApp(null)}
          onSave={async (updates) => {
            try {
              const updated = await updateApplication({ id: editingApp.id, ...updates });
              setApplications((prev) => prev.map((a) => (a.id === editingApp.id ? updated : a)));
              setEditingApp(null);
              toast('Application updated', 'success');
            } catch (e: any) {
              toast(e.message, 'error');
            }
          }}
          onDelete={() => {
            handleDelete(editingApp.id);
            setEditingApp(null);
          }}
        />
      )}

      {/* New Application Modal */}
      {showNewModal && (
        <NewApplicationModal
          onClose={() => setShowNewModal(false)}
          onSave={async (data) => {
            try {
              await createApplication(data);
              toast('Application added', 'success');
              setShowNewModal(false);
              loadApplications();
            } catch (e: any) {
              toast(e.message, 'error');
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Edit Application Modal
// ============================================================
function EditApplicationModal({
  app,
  onClose,
  onSave,
  onDelete,
}: {
  app: any;
  onClose: () => void;
  onSave: (updates: Record<string, any>) => void;
  onDelete: () => void;
}) {
  const [status, setStatus] = useState(app.status);
  const [notes, setNotes] = useState(app.notes || '');
  const [salaryInfo, setSalaryInfo] = useState(app.salary_info || '');
  const [contactName, setContactName] = useState(app.contact_name || '');
  const [contactEmail, setContactEmail] = useState(app.contact_email || '');
  const [followUpDate, setFollowUpDate] = useState(app.follow_up_date?.split('T')[0] || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Application</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div style={{ marginBottom: 'var(--space-md)' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{app.title}</div>
          <div style={{ color: 'var(--color-text-secondary)' }}>{app.company}</div>
          {app.url && (
            <a href={app.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <IconExternalLink /> View job posting
            </a>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this application..." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Salary Info</label>
            <input className="input" value={salaryInfo} onChange={(e) => setSalaryInfo(e.target.value)} placeholder="e.g., 60k-80k EUR" />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-up Date</label>
            <input className="input" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Contact Name</label>
            <input className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Recruiter name" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Email</label>
            <input className="input" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="recruiter@company.com" />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            <IconTrash /> Delete
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSave({
                status,
                notes,
                salary_info: salaryInfo,
                contact_name: contactName,
                contact_email: contactEmail,
                follow_up_date: followUpDate || undefined,
              })
            }
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// New Application Modal
// ============================================================
function NewApplicationModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}) {
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('saved');
  const [notes, setNotes] = useState('');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Application</h3>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Company *</label>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
          </div>
          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Job URL</label>
            <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., Lisbon, Remote" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {PIPELINE_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!company || !title}
            onClick={() => onSave({ company, title, url, location, status, notes })}
          >
            <IconPlus /> Add Application
          </button>
        </div>
      </div>
    </div>
  );
}
