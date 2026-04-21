import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../lib/api';
import { IconBriefcase, IconSearch, IconCalendar, IconChevronRight } from '../components/Icons';

export function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        Loading dashboard...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <h3>Welcome to JobTracker</h3>
        <p>Head to <Link to="/settings">Settings</Link> to configure your saved searches and start finding jobs.</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Jobs Found', value: data.total_jobs, color: 'var(--color-info)' },
    { label: 'New (Unseen)', value: data.new_jobs, color: 'var(--color-accent)' },
    { label: 'Applications', value: data.total_applications, color: 'var(--color-interview)' },
    { label: 'This Week', value: data.applications_this_week, color: 'var(--color-success)' },
    { label: 'Response Rate', value: `${data.response_rate}%`, color: 'var(--color-warning)' },
    { label: 'Notifications', value: data.unread_notifications, color: 'var(--color-error)' },
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your job search progress</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        {statCards.map((stat) => (
          <div className="card" key={stat.label}>
            <div className="card-title">{stat.label}</div>
            <div className="card-value" style={{ color: stat.color, marginTop: 8 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline Summary */}
      <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <div className="card-title">Application Pipeline</div>
          <Link to="/pipeline" className="btn btn-ghost btn-sm">
            View Board <IconChevronRight />
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          {Object.entries(data.by_status || {}).map(([status, count]) => (
            <div key={status} style={{ textAlign: 'center', flex: '1 1 80px' }}>
              <div className={`status-badge status-badge--${status}`} style={{ marginBottom: 4 }}>
                {status}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.2rem' }}>
                {count as number}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: Recent + Follow-ups */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)' }}>
        {/* Recent Applications */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Applications</div>
            <Link to="/pipeline" className="btn btn-ghost btn-sm">
              View All <IconChevronRight />
            </Link>
          </div>
          {data.recent_applications?.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
              <p>No applications yet. Start by browsing <Link to="/jobs">job listings</Link>.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {(data.recent_applications || []).slice(0, 5).map((app: any) => (
                <div
                  key={app.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-sm) 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{app.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      {app.company}
                    </div>
                  </div>
                  <span className={`status-badge status-badge--${app.status}`}>{app.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Follow-ups */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Upcoming Follow-ups</div>
          </div>
          {data.upcoming_followups?.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
              <IconCalendar />
              <p style={{ marginTop: 8 }}>No follow-ups scheduled</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {(data.upcoming_followups || []).map((app: any) => (
                <div
                  key={app.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-sm) 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{app.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                      {app.company}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {new Date(app.follow_up_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
