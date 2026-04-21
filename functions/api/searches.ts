// /api/searches - Saved searches CRUD
// GET: list all saved searches
// POST: create a new saved search
// PUT: update a saved search
// DELETE: remove a saved search

// GET /api/searches
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const searches = await ctx.env.DB.prepare(
    'SELECT * FROM saved_searches ORDER BY created_at DESC'
  ).all();

  return Response.json({
    success: true,
    data: searches.results,
  });
};

// POST /api/searches
// Body: { name: string, keywords: string, location?: string, remote_only?: boolean }
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    name: string;
    keywords: string;
    location?: string;
    remote_only?: boolean;
  };

  if (!body.name || !body.keywords) {
    return Response.json(
      { success: false, error: 'Name and keywords are required' },
      { status: 400 }
    );
  }

  const result = await ctx.env.DB.prepare(
    'INSERT INTO saved_searches (name, keywords, location, remote_only) VALUES (?, ?, ?, ?)'
  )
    .bind(body.name, body.keywords, body.location || null, body.remote_only ? 1 : 0)
    .run();

  const search = await ctx.env.DB.prepare('SELECT * FROM saved_searches WHERE id = ?')
    .bind(result.meta.last_row_id)
    .first();

  return Response.json({ success: true, data: search }, { status: 201 });
};

// PUT /api/searches
// Body: { id: number, name?: string, keywords?: string, location?: string, remote_only?: boolean, active?: boolean }
export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    id: number;
    name?: string;
    keywords?: string;
    location?: string;
    remote_only?: boolean;
    active?: boolean;
  };

  if (!body.id) {
    return Response.json({ success: false, error: 'Search ID is required' }, { status: 400 });
  }

  const updates: string[] = [];
  const values: any[] = [];

  if (body.name !== undefined) {
    updates.push('name = ?');
    values.push(body.name);
  }
  if (body.keywords !== undefined) {
    updates.push('keywords = ?');
    values.push(body.keywords);
  }
  if (body.location !== undefined) {
    updates.push('location = ?');
    values.push(body.location);
  }
  if (body.remote_only !== undefined) {
    updates.push('remote_only = ?');
    values.push(body.remote_only ? 1 : 0);
  }
  if (body.active !== undefined) {
    updates.push('active = ?');
    values.push(body.active ? 1 : 0);
  }

  if (updates.length === 0) {
    return Response.json({ success: false, error: 'No fields to update' }, { status: 400 });
  }

  values.push(body.id);
  await ctx.env.DB.prepare(`UPDATE saved_searches SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const search = await ctx.env.DB.prepare('SELECT * FROM saved_searches WHERE id = ?')
    .bind(body.id)
    .first();

  return Response.json({ success: true, data: search });
};

// DELETE /api/searches?id=123
export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ success: false, error: 'Search ID is required' }, { status: 400 });
  }

  await ctx.env.DB.prepare('DELETE FROM saved_searches WHERE id = ?').bind(parseInt(id)).run();
  return Response.json({ success: true });
};
