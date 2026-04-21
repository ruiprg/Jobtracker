// /api/buckets - Manage job buckets/categories
// GET: list all buckets
// POST: create a new bucket
// DELETE: remove a bucket (moves jobs to 'Uncategorized')

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const buckets = await ctx.env.DB.prepare(
    'SELECT * FROM buckets ORDER BY sort_order ASC, name ASC'
  ).all();

  return Response.json({ success: true, data: buckets.results });
};

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as { name: string };

  if (!body.name || !body.name.trim()) {
    return Response.json({ success: false, error: 'Bucket name is required' }, { status: 400 });
  }

  try {
    const result = await ctx.env.DB.prepare(
      'INSERT INTO buckets (name) VALUES (?)'
    ).bind(body.name.trim()).run();

    const bucket = await ctx.env.DB.prepare('SELECT * FROM buckets WHERE id = ?')
      .bind(result.meta.last_row_id).first();

    return Response.json({ success: true, data: bucket }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return Response.json({ success: false, error: 'Bucket already exists' }, { status: 409 });
    }
    throw e;
  }
};

export const onRequestDelete: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return Response.json({ success: false, error: 'Bucket ID is required' }, { status: 400 });
  }

  // Get bucket name before deleting
  const bucket = await ctx.env.DB.prepare('SELECT name FROM buckets WHERE id = ?')
    .bind(parseInt(id)).first<{ name: string }>();

  if (bucket) {
    // Move all applications in this bucket to 'Uncategorized'
    await ctx.env.DB.prepare(
      "UPDATE applications SET bucket = 'Uncategorized' WHERE bucket = ?"
    ).bind(bucket.name).run();

    await ctx.env.DB.prepare('DELETE FROM buckets WHERE id = ?').bind(parseInt(id)).run();
  }

  return Response.json({ success: true });
};
