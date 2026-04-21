// /api/applications - Application tracking CRUD
// GET: list applications (with optional status filter)
// POST: create new application (from job or manual)
// PUT: update application (status change, notes, etc.)
// DELETE: remove application

// GET /api/applications?status=applied&page=1&limit=50
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const status = url.searchParams.get('status') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '100'), 200);
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const countResult = await ctx.env.DB.prepare(
    `SELECT COUNT(*) as total FROM applications ${where}`
  )
    .bind(...params)
    .first<{ total: number }>();

  const applications = await ctx.env.DB.prepare(
    `SELECT * FROM applications ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all();

  return Response.json({
    success: true,
    data: {
      applications: applications.results,
      total: countResult?.total || 0,
      page,
      limit,
    },
  });
};

// POST /api/applications
// Body: { job_id?: number, company: string, title: string, url?: string, location?: string, status?: string, notes?: string }
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    job_id?: number;
    company?: string;
    title?: string;
    url?: string;
    location?: string;
    status?: string;
    notes?: string;
    salary_info?: string;
    contact_name?: string;
    contact_email?: string;
    bucket?: string;
  };

  let company = body.company || '';
  let title = body.title || '';
  let url = body.url || '';
  let location = body.location || '';
  let bucket = body.bucket || 'Uncategorized';

  // If job_id provided, pull data from job and auto-assign bucket from search_query
  if (body.job_id) {
    const job = await ctx.env.DB.prepare('SELECT * FROM jobs WHERE id = ?')
      .bind(body.job_id)
      .first<{ company: string; title: string; url: string; location: string; search_query: string }>();

    if (job) {
      company = company || job.company;
      title = title || job.title;
      url = url || job.url;
      location = location || job.location;

      // Auto-assign bucket based on search query keywords
      if (bucket === 'Uncategorized' && job.search_query) {
        const sq = job.search_query.toLowerCase();
        if (sq.includes('wind') || sq.includes('site assessment')) bucket = 'Wind Energy';
        else if (sq.includes('cfd') || sq.includes('hydrogen') || sq.includes('fluid')) bucket = 'CFD / Green Hydrogen';
        else if (sq.includes('thermal') || sq.includes('nvh') || sq.includes('aerod')) bucket = 'Thermal / NVH / Aero';
        else if (sq.includes('consultant') || sq.includes('simulation') || sq.includes('project manager')) bucket = 'Technical Consulting';
        else if (sq.includes('quant') || sq.includes('data scientist') || sq.includes('risk model')) bucket = 'Quant / Data Science';
        else bucket = 'Other';
      }
    }
  }

  if (!company || !title) {
    return Response.json(
      { success: false, error: 'Company and title are required' },
      { status: 400 }
    );
  }

  const status = body.status || 'saved';
  const appliedDate = status === 'applied' ? new Date().toISOString() : null;

  const result = await ctx.env.DB.prepare(
    `INSERT INTO applications (job_id, company, title, url, location, status, applied_date, notes, salary_info, contact_name, contact_email, bucket)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      body.job_id || null,
      company,
      title,
      url,
      location,
      status,
      appliedDate,
      body.notes || null,
      body.salary_info || null,
      body.contact_name || null,
      body.contact_email || null,
      bucket
    )
    .run();

  const appId = result.meta.last_row_id;

  // Record initial status in history
  await ctx.env.DB.prepare(
    'INSERT INTO status_history (application_id, old_status, new_status) VALUES (?, NULL, ?)'
  )
    .bind(appId, status)
    .run();

  // Fetch the created application
  const app = await ctx.env.DB.prepare('SELECT * FROM applications WHERE id = ?')
    .bind(appId)
    .first();

  return Response.json({ success: true, data: app }, { status: 201 });
};

// PUT /api/applications
// Body: { id: number, ...fields to update }
export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    id: number;
    status?: string;
    notes?: string;
    salary_info?: string;
    contact_name?: string;
    contact_email?: string;
    follow_up_date?: string;
    applied_date?: string;
    bucket?: string;
  };

  if (!body.id) {
    return Response.json({ success: false, error: 'Application ID is required' }, { status: 400 });
  }

  // Get current application for status history
  const current = await ctx.env.DB.prepare('SELECT status FROM applications WHERE id = ?')
    .bind(body.id)
    .first<{ status: string }>();

  if (!current) {
    return Response.json({ success: false, error: 'Application not found' }, { status: 404 });
  }

  // Build dynamic update
  const updates: string[] = ['updated_at = datetime("now")'];
  const values: any[] = [];

  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);

    // Set applied_date when moving to 'applied'
    if (body.status === 'applied' && !body.applied_date) {
      updates.push('applied_date = datetime("now")');
    }
  }
  if (body.notes !== undefined) {
    updates.push('notes = ?');
    values.push(body.notes);
  }
  if (body.salary_info !== undefined) {
    updates.push('salary_info = ?');
    values.push(body.salary_info);
  }
  if (body.contact_name !== undefined) {
    updates.push('contact_name = ?');
    values.push(body.contact_name);
  }
  if (body.contact_email !== undefined) {
    updates.push('contact_email = ?');
    values.push(body.contact_email);
  }
  if (body.follow_up_date !== undefined) {
    updates.push('follow_up_date = ?');
    values.push(body.follow_up_date);
  }
  if (body.applied_date !== undefined) {
    updates.push('applied_date = ?');
    values.push(body.applied_date);
  }
  if (body.bucket !== undefined) {
    updates.push('bucket = ?');
    values.push(body.bucket);
  }

  values.push(body.id);

  await ctx.env.DB.prepare(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // Record status change in history
  if (body.status && body.status !== current.status) {
    await ctx.env.DB.prepare(
      'INSERT INTO status_history (application_id, old_status, new_status) VALUES (?, ?, ?)'
    )
      .bind(body.id, current.status, body.status)
      .run();
  }

  // Return updated application
  const updated = await ctx.env.DB.prepare('SELECT * FROM applications WHERE id = ?')
    .bind(body.id)
    .first();

  return Response.json({ success: true, data: updated });
};

// PATCH /api/applications - bulk operations
// Body: { ids: number[], action: 'move_to_pipeline' | 'change_bucket' | 'delete', bucket?: string }
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    ids: number[];
    action: 'move_to_pipeline' | 'change_bucket' | 'delete';
    bucket?: string;
  };

  if (!body.ids || body.ids.length === 0) {
    return Response.json({ success: false, error: 'No application IDs provided' }, { status: 400 });
  }

  const placeholders = body.ids.map(() => '?').join(',');

  if (body.action === 'move_to_pipeline') {
    // Move selected saved jobs to 'applied' status in the pipeline
    await ctx.env.DB.prepare(
      `UPDATE applications SET status = 'applied', applied_date = datetime('now'), updated_at = datetime('now') WHERE id IN (${placeholders}) AND status = 'saved'`
    ).bind(...body.ids).run();

    // Record status change for each
    for (const id of body.ids) {
      await ctx.env.DB.prepare(
        "INSERT INTO status_history (application_id, old_status, new_status) VALUES (?, 'saved', 'applied')"
      ).bind(id).run();
    }

    return Response.json({ success: true, data: { moved: body.ids.length } });
  }

  if (body.action === 'change_bucket') {
    if (!body.bucket) {
      return Response.json({ success: false, error: 'Bucket name is required' }, { status: 400 });
    }
    await ctx.env.DB.prepare(
      `UPDATE applications SET bucket = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`
    ).bind(body.bucket, ...body.ids).run();

    return Response.json({ success: true, data: { updated: body.ids.length } });
  }

  if (body.action === 'delete') {
    await ctx.env.DB.prepare(
      `DELETE FROM applications WHERE id IN (${placeholders})`
    ).bind(...body.ids).run();

    return Response.json({ success: true, data: { deleted: body.ids.length } });
  }

  return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });
};

// DELETE /api/applications?id=123
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ success: false, error: 'Application ID is required' }, { status: 400 });
  }

  await ctx.env.DB.prepare('DELETE FROM applications WHERE id = ?').bind(parseInt(id)).run();

  return Response.json({ success: true });
};
