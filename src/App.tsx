import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ToastProvider } from './hooks/useToast';
import {
  IconDashboard,
  IconBriefcase,
  IconKanban,
  IconChart,
  IconSettings,
  IconWind,
  IconStar,
  IconFile,
} from './components/Icons';
import { DashboardPage } from './pages/DashboardPage';
import { JobsPage } from './pages/JobsPage';
import { DatabaseJobsPage } from './pages/DatabaseJobsPage';
import { SavedPage } from './pages/SavedPage';
import { PipelinePage } from './pages/PipelinePage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/db-jobs" element={<DatabaseJobsPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <IconWind />
        <h1>JobTracker</h1>
      </div>

      <div className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IconDashboard /> Dashboard
        </NavLink>
        <NavLink to="/jobs" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IconBriefcase /> Job Listings
        </NavLink>
        <NavLink to="/db-jobs" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IconFile /> Job Listings Database
        </NavLink>
        <NavLink to="/saved" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IconStar /> Saved
        </NavLink>
        <NavLink to="/pipeline" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IconKanban /> Pipeline
        </NavLink>
        <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IconChart /> Analytics
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <IconSettings /> Settings
        </NavLink>
      </div>

      <div className="sidebar-footer">
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
          PT &middot; BE &middot; Remote
        </span>
      </div>
    </nav>
  );
}
