import { useEffect, useState } from 'react';
import { fetchDashboard } from '../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  saved: '#6B7280',
  applied: '#2563EB',
  interview: '#7C3AED',
  offer: '#D97706',
  accepted: '#059669',
  rejected: '#DC2626',
};

const SOURCE_COLORS = ['#2563EB', '#7C3AED', '#D97706', '#059669', '#DC2626', '#6B7280'];

export function AnalyticsPage() {
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
        <div className="spinner" /> Loading analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="empty-state">
        <h3>No data yet</h3>
        <p>Start tracking applications to see analytics.</p>
      </div>
    );
  }

  // Prepare pipeline funnel data
  const funnelData = Object.entries(data.by_status || {})
    .filter(([status]) => status !== 'rejected')
    .map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count as number,
      fill: STATUS_COLORS[status] || '#6B7280',
    }));

  // Prepare pie data for status distribution
  const pieData = Object.entries(data.by_status || {})
    .filter(([, count]) => (count as number) > 0)
    .map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count as number,
    }));

  // Applications over time
  const timelineData = (data.applications_over_time || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    applications: d.count,
  }));

  // Source distribution
  const sourceData = (data.top_sources || []).map((d: any, i: number) => ({
    name: d.source,
    jobs: d.count,
    fill: SOURCE_COLORS[i % SOURCE_COLORS.length],
  }));

  return (
    <div>
      <div className="page-header">
        <h2>Analytics</h2>
        <p>Insights into your job search performance</p>
      </div>

      {/* Summary Stats */}
      <div className="stat-grid">
        <div className="card">
          <div className="card-title">Total Applications</div>
          <div className="card-value" style={{ color: 'var(--color-info)', marginTop: 8 }}>
            {data.total_applications}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Response Rate</div>
          <div className="card-value" style={{ color: 'var(--color-success)', marginTop: 8 }}>
            {data.response_rate}%
          </div>
        </div>
        <div className="card">
          <div className="card-title">This Week</div>
          <div className="card-value" style={{ color: 'var(--color-accent)', marginTop: 8 }}>
            {data.applications_this_week}
          </div>
        </div>
        <div className="card">
          <div className="card-title">Jobs in Database</div>
          <div className="card-value" style={{ color: 'var(--color-interview)', marginTop: 8 }}>
            {data.total_jobs}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Pipeline Funnel */}
        <div className="chart-card">
          <h4>Pipeline Funnel</h4>
          {funnelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={funnelData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E0" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No application data</div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="chart-card">
          <h4>Status Distribution</h4>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.name.toLowerCase()] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No application data</div>
          )}
        </div>

        {/* Applications Over Time */}
        <div className="chart-card">
          <h4>Applications Over Time (Last 30 Days)</h4>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#D97706"
                  strokeWidth={2}
                  dot={{ fill: '#D97706', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No timeline data yet</div>
          )}
        </div>

        {/* Job Sources */}
        <div className="chart-card">
          <h4>Jobs by Source</h4>
          {sourceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E4E0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="jobs" radius={[4, 4, 0, 0]}>
                  {sourceData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">No job source data</div>
          )}
        </div>
      </div>
    </div>
  );
}
