// ============================================================
// JobTracker Cron Worker
// Runs daily at 7am UTC to:
// 1. Execute all active saved searches (Remotive + Arbeitnow + Jobicy + Adzuna)
// 2. Send email notifications for new jobs found
// 3. Send follow-up reminders
//
// Deploy: wrangler deploy -c worker/wrangler.jsonc
// ============================================================

interface Env {
  DB: D1Database;
  RESEND_API_KEY?: string;
  NOTIFICATION_EMAIL?: string;
  ADZUNA_APP_ID?: string;
  ADZUNA_APP_KEY?: string;
  THEIRSTACK_API_KEY?: string;
}

interface SavedSearch {
  id: number;
  name: string;
  keywords: string;
  location: string;
  remote_only: number;
  active: number;
}

// --- Remotive (free, no key) ---
async function fetchRemotive(query: string) {
  try {
    const res = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=25`);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return (data.jobs || []).map((job: any) => ({
      external_id: `remotive-${job.id}`,
      title: job.title,
      company: job.company_name,
      location: job.candidate_required_location || 'Remote',
      salary_min: null, salary_max: null,
      description: (job.description || '').substring(0, 5000),
      url: job.url,
      date_posted: job.publication_date,
      remote: 1,
      source: 'remotive',
      search_query: query,
    }));
  } catch { return []; }
}

// --- Arbeitnow (free, no key) ---
async function fetchArbeitnow(query: string) {
  try {
    const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return (data.data || []).map((job: any) => ({
      external_id: `arbeitnow-${job.slug}`,
      title: job.title,
      company: job.company_name,
      location: job.location || 'Europe',
      salary_min: null, salary_max: null,
      description: (job.description || '').substring(0, 5000),
      url: job.url,
      date_posted: job.created_at,
      remote: job.remote ? 1 : 0,
      source: 'arbeitnow',
      search_query: query,
    }));
  } catch { return []; }
}

// --- Jobicy (free, no key, European remote) ---
async function fetchJobicy(query: string) {
  try {
    const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=25&tag=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    return (data.jobs || []).map((job: any) => ({
      external_id: `jobicy-${job.id}`,
      title: job.jobTitle,
      company: job.companyName,
      location: job.jobGeo || 'Remote',
      salary_min: job.annualSalaryMin || null,
      salary_max: job.annualSalaryMax || null,
      description: (job.jobDescription || job.jobExcerpt || '').substring(0, 5000),
      url: job.url,
      date_posted: job.pubDate,
      remote: 1,
      source: 'jobicy',
      search_query: query,
    }));
  } catch { return []; }
}

// --- Adzuna (optional, free signup at developer.adzuna.com) ---
async function fetchAdzuna(query: string, location: string, appId: string, appKey: string) {
  if (!appId || !appKey) return [];
  const countryMap: Record<string, string> = { portugal: 'pt', belgium: 'be', remote: 'gb' };
  const locations = location.split(',').map((l) => l.trim().toLowerCase());
  const results: any[] = [];

  for (const loc of locations) {
    const country = countryMap[loc] || 'gb';
    try {
      const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&what=${encodeURIComponent(query)}&content-type=application/json`);
      if (!res.ok) continue;
      const data = (await res.json()) as any;
      for (const job of data.results || []) {
        results.push({
          external_id: `adzuna-${job.id}`,
          title: job.title,
          company: job.company?.display_name || 'Unknown',
          location: job.location?.display_name || loc,
          salary_min: job.salary_min || null,
          salary_max: job.salary_max || null,
          description: (job.description || '').substring(0, 5000),
          url: job.redirect_url,
          date_posted: job.created,
          remote: 0,
          source: 'adzuna',
          search_query: query,
        });
      }
    } catch {}
  }
  return results;
}

// --- TheirStack (aggregates LinkedIn, Indeed, Greenhouse, Lever, etc.) ---
async function fetchTheirStack(query: string, location: string, apiKey: string) {
  if (!apiKey) return [];

  const locationParts = location.split(',').map((l) => l.trim().toLowerCase());
  const countryCodes: string[] = [];
  for (const loc of locationParts) {
    if (loc.includes('portugal') || loc === 'pt') countryCodes.push('PT');
    if (loc.includes('belgium') || loc === 'be') countryCodes.push('BE');
  }

  const body: Record<string, any> = {
    job_title_or: [query],
    posted_at_max_age_days: 7, // Only last 7 days for cron (daily)
    page: 0,
    limit: 25,
    order_by: [{ desc: true, field: "date_posted" }],
  };
  if (countryCodes.length > 0) body.job_country_code_or = countryCodes;

  const results: any[] = [];
  try {
    const res = await fetch('https://api.theirstack.com/v1/jobs/search', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    for (const job of data.data || []) {
      let jobLocation = job.long_location || job.short_location || job.country || '';
      if (job.remote) jobLocation = jobLocation ? `${jobLocation} (Remote)` : 'Remote';
      results.push({
        external_id: `theirstack-${job.id}`,
        title: job.job_title || '',
        company: job.company || job.company_object?.name || 'Unknown',
        location: jobLocation,
        salary_min: job.min_annual_salary || null,
        salary_max: job.max_annual_salary || null,
        description: (job.description || '').substring(0, 5000),
        url: job.url || job.final_url || job.source_url || '',
        date_posted: job.date_posted || job.discovered_at || '',
        remote: job.remote ? 1 : 0,
        source: 'theirstack',
        search_query: query,
      });
    }
  } catch {}
  return results;
}

// --- Store jobs ---
async function storeJobs(db: D1Database, jobs: any[]): Promise<number> {
  let inserted = 0;
  for (const job of jobs) {
    try {
      const result = await db.prepare(
        `INSERT OR IGNORE INTO jobs (external_id, title, company, location, salary_min, salary_max, description, url, source, search_query, remote, date_posted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        job.external_id, job.title, job.company, job.location,
        job.salary_min, job.salary_max, job.description, job.url,
        job.source, job.search_query, job.remote, job.date_posted
      ).run();
      if (result.meta.changes > 0) inserted++;
    } catch {}
  }
  return inserted;
}

// --- Email via Resend ---
async function sendEmail(apiKey: string, to: string, subject: string, html: string) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: 'JobTracker <noreply@resend.dev>', to: [to], subject, html }),
    });
  } catch (e) { console.error('Email send error:', e); }
}

// --- Main cron handler ---
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log('Cron triggered at', new Date().toISOString());

    const searches = await env.DB.prepare('SELECT * FROM saved_searches WHERE active = 1').all<SavedSearch>();
    let totalNewJobs = 0;
    const searchSummary: string[] = [];

    for (const search of searches.results) {
      const keywords = search.keywords.split(',').map((k) => k.trim()).filter(Boolean);
      let searchInserted = 0;

      for (const keyword of keywords) {
        const [remotive, arbeitnow, jobicy, adzuna, theirstack] = await Promise.all([
          fetchRemotive(keyword),
          fetchArbeitnow(keyword),
          fetchJobicy(keyword),
          fetchAdzuna(keyword, search.location || 'portugal,belgium', env.ADZUNA_APP_ID || '', env.ADZUNA_APP_KEY || ''),
          fetchTheirStack(keyword, search.location || 'portugal,belgium', env.THEIRSTACK_API_KEY || ''),
        ]);

        const inserted = await storeJobs(env.DB, [...remotive, ...arbeitnow, ...jobicy, ...adzuna, ...theirstack]);
        searchInserted += inserted;
      }

      await env.DB.prepare(
        'UPDATE saved_searches SET last_run = datetime("now"), results_count = results_count + ? WHERE id = ?'
      ).bind(searchInserted, search.id).run();

      totalNewJobs += searchInserted;
      if (searchInserted > 0) searchSummary.push(`${search.name}: ${searchInserted} new`);
    }

    const followups = await env.DB.prepare(
      `SELECT * FROM applications WHERE follow_up_date = date('now') AND status NOT IN ('accepted', 'rejected')`
    ).all();
    const followupReminders = followups.results.map((app: any) => `- ${app.title} at ${app.company}`);

    if (totalNewJobs > 0) {
      await env.DB.prepare('INSERT INTO notifications (type, message, sent_to) VALUES (?, ?, ?)')
        .bind('new_jobs', `Found ${totalNewJobs} new jobs from ${searches.results.length} saved searches`, env.NOTIFICATION_EMAIL || null).run();
    }
    if (followupReminders.length > 0) {
      await env.DB.prepare('INSERT INTO notifications (type, message, sent_to) VALUES (?, ?, ?)')
        .bind('follow_up_reminder', `Follow-up reminders for today:\n${followupReminders.join('\n')}`, env.NOTIFICATION_EMAIL || null).run();
    }

    if (env.RESEND_API_KEY && env.NOTIFICATION_EMAIL && (totalNewJobs > 0 || followupReminders.length > 0)) {
      let html = '<h2>JobTracker Daily Update</h2>';
      if (totalNewJobs > 0) {
        html += `<h3>${totalNewJobs} New Jobs Found</h3><ul>${searchSummary.map(s => `<li>${s}</li>`).join('')}</ul>`;
      }
      if (followupReminders.length > 0) {
        html += `<h3>Follow-up Reminders</h3><ul>${followupReminders.map(r => `<li>${r}</li>`).join('')}</ul>`;
      }
      await sendEmail(env.RESEND_API_KEY, env.NOTIFICATION_EMAIL,
        `JobTracker: ${totalNewJobs} new jobs${followupReminders.length > 0 ? ' + reminders' : ''}`, html);
    }

    console.log(`Cron complete: ${totalNewJobs} new jobs, ${followupReminders.length} reminders`);
  },
};
