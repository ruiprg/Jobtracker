// /api/jobs - Job listing aggregation and management
// GET: fetch jobs from DB with filters
// POST: trigger a manual job search from external APIs
// Sources: Remotive, Arbeitnow, Jobicy (all free, no keys) + Adzuna (optional, free signup)

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  url: string;
  publication_date: string;
  tags: string[];
}

interface ArbeitnowJob {
  slug: string;
  title: string;
  company_name: string;
  location: string;
  description: string;
  url: string;
  created_at: string;
  remote: boolean;
  tags: string[];
}

interface JobicyJob {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobType: string[];
  jobLevel: string;
  jobExcerpt: string;
  jobDescription: string;
  pubDate: string;
  annualSalaryMin?: number;
  annualSalaryMax?: number;
  salaryCurrency?: string;
}

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  description: string;
  redirect_url: string;
  created: string;
}

type NormalizedJob = {
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  url: string;
  external_id: string;
  date_posted: string;
  remote?: boolean;
  tags: string[];
};

// ============================================================
// Source: Remotive (free, no key, remote jobs)
// ============================================================
async function fetchRemotive(query: string): Promise<NormalizedJob[]> {
  try {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=50`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs: RemotiveJob[] };

    return (data.jobs || []).map((job) => {
      let salaryMin: number | null = null;
      let salaryMax: number | null = null;
      if (job.salary) {
        const nums = job.salary.match(/[\d,]+/g);
        if (nums && nums.length >= 1) salaryMin = parseInt(nums[0].replace(/,/g, ''));
        if (nums && nums.length >= 2) salaryMax = parseInt(nums[1].replace(/,/g, ''));
      }
      return {
        title: job.title,
        company: job.company_name,
        location: job.candidate_required_location || 'Remote',
        salary_min: salaryMin,
        salary_max: salaryMax,
        description: job.description || '',
        url: job.url,
        external_id: `remotive-${job.id}`,
        date_posted: job.publication_date,
        remote: true,
      };
    });
  } catch (e) {
    console.error('Remotive error:', e);
    return [];
  }
}

// ============================================================
// Source: Arbeitnow (free, no key, European jobs)
// ============================================================
async function fetchArbeitnow(query: string): Promise<NormalizedJob[]> {
  try {
    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { data: ArbeitnowJob[] };

    return (data.data || []).map((job) => ({
      title: job.title,
      company: job.company_name,
      location: job.location || 'Europe',
      salary_min: null,
      salary_max: null,
      description: job.description || '',
      url: job.url,
      external_id: `arbeitnow-${job.slug}`,
      date_posted: job.created_at,
      remote: job.remote,
    }));
  } catch (e) {
    console.error('Arbeitnow error:', e);
    return [];
  }
}

// ============================================================
// Source: Jobicy (free, no key, European remote jobs)
// ============================================================
async function fetchJobicy(query: string): Promise<NormalizedJob[]> {
  try {
    // Jobicy uses tag-based filtering. Map common terms to their tags.
    const url = `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { jobs: JobicyJob[] };

    return (data.jobs || []).map((job) => ({
      title: job.jobTitle,
      company: job.companyName,
      location: job.jobGeo || 'Remote',
      salary_min: job.annualSalaryMin || null,
      salary_max: job.annualSalaryMax || null,
      description: job.jobDescription || job.jobExcerpt || '',
      url: job.url,
      external_id: `jobicy-${job.id}`,
      date_posted: job.pubDate,
      remote: true,
    }));
  } catch (e) {
    console.error('Jobicy error:', e);
    return [];
  }
}

// ============================================================
// Source: Adzuna (free signup at developer.adzuna.com)
// Covers Portugal (pt) and Belgium (be) with salary data
// Only runs if ADZUNA_APP_ID and ADZUNA_APP_KEY are configured
// ============================================================
async function fetchAdzuna(
  query: string,
  location: string,
  appId: string,
  appKey: string
): Promise<NormalizedJob[]> {
  if (!appId || !appKey) return [];

  const countryMap: Record<string, string> = {
    portugal: 'pt',
    belgium: 'be',
    remote: 'gb',
  };

  const locations = location.split(',').map((l) => l.trim().toLowerCase());
  const results: NormalizedJob[] = [];

  for (const loc of locations) {
    const country = countryMap[loc] || 'gb';
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = (await res.json()) as { results: AdzunaJob[] };
      for (const job of data.results || []) {
        results.push({
          title: job.title,
          company: job.company?.display_name || 'Unknown',
          location: job.location?.display_name || loc,
          salary_min: job.salary_min || null,
          salary_max: job.salary_max || null,
          description: job.description || '',
          url: job.redirect_url,
          external_id: `adzuna-${job.id}`,
          date_posted: job.created,
        });
      }
    } catch (e) {
      console.error(`Adzuna error for ${loc}:`, e);
    }
  }

  return results;
}

// ============================================================
// Source: TheirStack (API key required)
// Aggregates from LinkedIn, Indeed, Greenhouse, Lever, and
// hundreds of other sources. Excellent PT/BE coverage.
// ============================================================
async function fetchTheirStack(
  query: string,
  location: string,
  apiKey: string
): Promise<any[]> {
  if (!apiKey) return [];

  // Map location to country codes
  const codes: string[] = [];
  const loc = location.toLowerCase();
  if (loc.includes('portugal') || loc.includes('pt')) codes.push('PT');
  if (loc.includes('belgium') || loc.includes('be')) codes.push('BE');
  if (codes.length === 0) { codes.push('PT'); codes.push('BE'); }

  const requestBody = JSON.stringify({
    job_title_or: [query],
    job_country_code_or: codes,
    posted_at_max_age_days: 30,
    page: 0,
    limit: 25,
  });

  const res = await fetch('https://api.theirstack.com/v1/jobs/search', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: requestBody,
  });

  if (!res.ok) return [];

  const json = await res.json() as any;
  if (!json.data || !Array.isArray(json.data)) return [];

  return json.data.map((job: any) => {
    let jobLocation = job.long_location || job.short_location || job.country || '';
    if (job.remote) jobLocation = jobLocation ? jobLocation + ' (Remote)' : 'Remote';

    return {
      title: job.job_title || '',
      company: job.company || (job.company_object ? job.company_object.name : 'Unknown'),
      location: jobLocation,
      salary_min: job.min_annual_salary || null,
      salary_max: job.max_annual_salary || null,
      description: (job.description || '').substring(0, 5000),
      url: job.url || job.final_url || job.source_url || '',
      external_id: 'theirstack-' + job.id,
      date_posted: job.date_posted || job.discovered_at || '',
      remote: job.remote ? true : false,
    };
  });
}

// ============================================================
// Store jobs in DB, skip duplicates by URL
// ============================================================
async function storeJobs(
  db: D1Database,
  jobs: (NormalizedJob & { source: string; search_query: string; tags: string[] })[]
): Promise<number> {
  let inserted = 0;
  for (const job of jobs) {
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO jobs (external_id, title, company, location, salary_min, salary_max, description, url, source, search_query, remote, date_posted, tags)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          job.external_id,
          job.title,
          job.company,
          job.location,
          job.salary_min,
          job.salary_max,
          job.description?.substring(0, 5000) || '',
          job.url,
          job.source,
          job.search_query,
          job.remote ? 1 : 0,
          job.date_posted,
          JSON.stringify(job.tags)
        )
        .run();
      inserted++;
    } catch (e) {
      // Duplicate URL, skip
    }
  }
  return inserted;
}

// ============================================================
// GET /api/jobs - list jobs from DB with filters
// ============================================================
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const query = url.searchParams.get('query') || '';
  const location = url.searchParams.get('location') || '';
  const source = url.searchParams.get('source') || '';
  const remote = url.searchParams.get('remote') || '';
  const newOnly = url.searchParams.get('new_only') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;

let where = 'WHERE 1=1';
const params: any[] = [];

if (query) {
  where += ' AND (title LIKE ? OR company LIKE ? OR description LIKE ?)';
  const q = `%${query}%`;
  params.push(q, q, q);
}
if (location) {
  where += ' AND location LIKE ?';
  params.push(`%${location}%`);
}
if (source) {
  where += ' AND source = ?';
  params.push(source);
}
if (remote === '1') {
  where += ' AND remote = 1';
}
if (newOnly === '1') {
  where += ' AND is_new = 1';
}
const tagsParam = url.searchParams.get('tags') || '';
if (tagsParam) {
  const tagsArray = tagsParam.split(',').map((t) => t.trim()).filter(Boolean);
  for (const tag of tagsArray) {
    where += ' AND tags LIKE ?';
    // We are looking for the tag as a string in the JSON array, e.g., '"engineer"' in '["engineer","remote"]'
    params.push(`%${tag}%`);
  }
}

  const countResult = await ctx.env.DB.prepare(`SELECT COUNT(*) as total FROM jobs ${where}`)
    .bind(...params)
    .first<{ total: number }>();

  const jobs = await ctx.env.DB.prepare(
    `SELECT * FROM jobs ${where} ORDER BY date_found DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all();

  return Response.json({
    success: true,
    data: {
      jobs: jobs.results,
      total: countResult?.total || 0,
      page,
      limit,
      total_pages: Math.ceil((countResult?.total || 0) / limit),
    },
  });
};

// ============================================================
// POST /api/jobs - trigger a job search from all sources
// Body: { query, location } OR { search_id } for saved search
// ============================================================
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    query?: string;
    location?: string;
    search_id?: number;
  };

  let query = body.query || '';
  let location = body.location || 'portugal,belgium';

  if (body.search_id) {
    const search = await ctx.env.DB.prepare('SELECT * FROM saved_searches WHERE id = ?')
      .bind(body.search_id)
      .first<{ keywords: string; location: string; remote_only: number }>();

    if (!search) {
      return Response.json({ success: false, error: 'Saved search not found' }, { status: 404 });
    }
    query = search.keywords;
    location = search.location || 'portugal,belgium';
  }

  if (!query) {
    return Response.json({ success: false, error: 'Query is required' }, { status: 400 });
  }

  const keywords = query.split(',').map((k) => k.trim()).filter(Boolean);
  let totalInserted = 0;
  const sourceCounts: Record<string, number> = {};

  for (const keyword of keywords) {
    // Fetch TheirStack first (best source, uses API credits)
    let theirstackJobs: any[] = [];
    const tsKey = ctx.env.THEIRSTACK_API_KEY || '';
    if (tsKey) {
      theirstackJobs = await fetchTheirStack(keyword, location, tsKey);
    }

    // Fetch free sources in parallel
    const [remotiveJobs, arbeitnowJobs, jobicyJobs, adzunaJobs] = await Promise.all([
      fetchRemotive(keyword),
      fetchArbeitnow(keyword),
      fetchJobicy(keyword),
      fetchAdzuna(keyword, location, ctx.env.ADZUNA_APP_ID || '', ctx.env.ADZUNA_APP_KEY || ''),
    ]);

    // Track counts per source
    sourceCounts['theirstack'] = (sourceCounts['theirstack'] || 0) + theirstackJobs.length;
    sourceCounts['remotive'] = (sourceCounts['remotive'] || 0) + remotiveJobs.length;
    sourceCounts['arbeitnow'] = (sourceCounts['arbeitnow'] || 0) + arbeitnowJobs.length;
    sourceCounts['jobicy'] = (sourceCounts['jobicy'] || 0) + jobicyJobs.length;
    sourceCounts['adzuna'] = (sourceCounts['adzuna'] || 0) + adzunaJobs.length;

    const allJobs = [
      ...theirstackJobs.map((j: any) => ({ ...j, source: 'theirstack', search_query: keyword, tags: keywords })),
      ...remotiveJobs.map((j: any) => ({ ...j, source: 'remotive', search_query: keyword, tags: keywords })),
      ...arbeitnowJobs.map((j: any) => ({ ...j, source: 'arbeitnow', search_query: keyword, tags: keywords })),
      ...jobicyJobs.map((j: any) => ({ ...j, source: 'jobicy', search_query: keyword, tags: keywords })),
      ...adzunaJobs.map((j: any) => ({ ...j, source: 'adzuna', search_query: keyword, tags: keywords })),
    ];

    const inserted = await storeJobs(ctx.env.DB, allJobs);
    totalInserted += inserted;
  }

  if (body.search_id) {
    await ctx.env.DB.prepare(
      'UPDATE saved_searches SET last_run = datetime("now"), results_count = results_count + ? WHERE id = ?'
    )
      .bind(totalInserted, body.search_id)
      .run();
  }

  return Response.json({
    success: true,
    data: {
      inserted: totalInserted,
      message: `Found and stored ${totalInserted} new jobs`,
      sources: sourceCounts,

    },
  });
};

// ============================================================
// PATCH /api/jobs - mark jobs as read
// ============================================================
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as { job_ids?: number[]; mark_all?: boolean };

  if (body.mark_all) {
    await ctx.env.DB.prepare('UPDATE jobs SET is_new = 0 WHERE is_new = 1').run();
  } else if (body.job_ids?.length) {
    const placeholders = body.job_ids.map(() => '?').join(',');
    await ctx.env.DB.prepare(`UPDATE jobs SET is_new = 0 WHERE id IN (${placeholders})`)
      .bind(...body.job_ids)
      .run();
  }

  return Response.json({ success: true });
};
