// ============================================================
// API client for JobTracker backend (Pages Functions)
// All requests go to /api/* which Pages Functions handle.
// ============================================================

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || !(data as any).success) {
    throw new Error((data as any).error || `Request failed: ${res.status}`);
  }
  return (data as any).data as T;
}

// ---- Dashboard ----
export function fetchDashboard() {
  return request<any>('/api/dashboard');
}

// ---- Jobs ----
export interface JobsResponse {
  jobs: any[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export function fetchJobs(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<JobsResponse>(`/api/jobs?${qs}`);
}

export function searchJobs(body: { query?: string; location?: string; search_id?: number }) {
  return request<{ inserted: number; message: string }>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function markJobsRead(payload: { job_ids?: number[]; mark_all?: boolean }) {
  return request<void>('/api/jobs', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---- Applications ----
export function fetchApplications(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return request<{ applications: any[]; total: number }>(`/api/applications?${qs}`);
}

export function createApplication(body: Record<string, any>) {
  return request<any>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateApplication(body: Record<string, any>) {
  return request<any>('/api/applications', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteApplication(id: number) {
  return request<void>(`/api/applications?id=${id}`, { method: 'DELETE' });
}

export function bulkUpdateApplications(body: { ids: number[]; action: string; bucket?: string }) {
  return request<any>('/api/applications', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

// ---- Buckets ----
export function fetchBuckets() {
  return request<any[]>('/api/buckets');
}

export function createBucket(name: string) {
  return request<any>('/api/buckets', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function deleteBucket(id: number) {
  return request<void>(`/api/buckets?id=${id}`, { method: 'DELETE' });
}

// ---- Saved Searches ----
export function fetchSearches() {
  return request<any[]>('/api/searches');
}

export function createSearch(body: Record<string, any>) {
  return request<any>('/api/searches', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateSearch(body: Record<string, any>) {
  return request<any>('/api/searches', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteSearch(id: number) {
  return request<void>(`/api/searches?id=${id}`, { method: 'DELETE' });
}

// ---- Resume ----
export function fetchResume() {
  return request<any | null>('/api/resume');
}

export function uploadResume(body: { filename: string; text_content: string }) {
  return request<any>('/api/resume', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function analyzeResume(body: { job_id?: number; job_description?: string; job_title?: string }) {
  return request<{ analysis: string; job_title: string }>('/api/resume', {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

// ---- Import ----
export function importApplications(rows: Record<string, any>[]) {
  return request<{ imported: number; skipped: number; message: string; errors?: string[] }>(
    '/api/import',
    { method: 'POST', body: JSON.stringify({ rows }) }
  );
}

// ---- Notifications ----
export function fetchNotifications(unreadOnly = false) {
  return request<any[]>(`/api/notifications${unreadOnly ? '?unread_only=1' : ''}`);
}

export function markNotificationsRead(payload: { ids?: number[]; mark_all?: boolean }) {
  return request<void>('/api/notifications', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
