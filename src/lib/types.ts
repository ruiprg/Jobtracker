// ============================================================
// Shared types for JobTracker
// ============================================================

export interface Job {
  id: number;
  external_id: string | null;
  title: string;
  company: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string | null;
  url: string;
  source: 'theirstack' | 'remotive' | 'arbeitnow' | 'jobicy' | 'adzuna' | 'rss' | 'manual';
  search_query: string | null;
  tags: string[];
  remote: number;
  date_posted: string | null;
  date_found: string;
  is_new: number;
}

export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'accepted' | 'rejected';

export interface Application {
  id: number;
  job_id: number | null;
  company: string;
  title: string;
  url: string | null;
  location: string | null;
  status: ApplicationStatus;
  applied_date: string | null;
  notes: string | null;
  salary_info: string | null;
  contact_name: string | null;
  contact_email: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedSearch {
  id: number;
  name: string;
  keywords: string;
  location: string | null;
  remote_only: number;
  active: number;
  last_run: string | null;
  results_count: number;
  created_at: string;
}

export interface Resume {
  id: number;
  filename: string | null;
  text_content: string;
  uploaded_at: string;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  sent_to: string | null;
  sent_at: string;
  read: number;
}

export interface StatusHistoryEntry {
  id: number;
  application_id: number;
  old_status: string | null;
  new_status: string;
  changed_at: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  remote?: boolean;
  source?: string;
  page?: number;
  limit?: number;
}

export interface DashboardStats {
  total_jobs: number;
  new_jobs: number;
  total_applications: number;
  by_status: Record<ApplicationStatus, number>;
  recent_applications: Application[];
  upcoming_followups: Application[];
  applications_this_week: number;
  response_rate: number;
}

// Pipeline column definition
export const PIPELINE_STAGES: { key: ApplicationStatus; label: string; color: string }[] = [
  { key: 'saved', label: 'Saved', color: '#6B7280' },
  { key: 'applied', label: 'Applied', color: '#3B82F6' },
  { key: 'interview', label: 'Interview', color: '#8B5CF6' },
  { key: 'offer', label: 'Offer', color: '#F59E0B' },
  { key: 'accepted', label: 'Accepted', color: '#10B981' },
  { key: 'rejected', label: 'Rejected', color: '#EF4444' },
];
