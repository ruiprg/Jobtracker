// /api/notifications - Notification management
// GET: list notifications
// PATCH: mark as read

// GET /api/notifications?unread_only=1
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const url = new URL(ctx.request.url);
  const unreadOnly = url.searchParams.get('unread_only') === '1';

  const where = unreadOnly ? 'WHERE read = 0' : '';
  const notifications = await ctx.env.DB.prepare(
    `SELECT * FROM notifications ${where} ORDER BY sent_at DESC LIMIT 50`
  ).all();

  return Response.json({
    success: true,
    data: notifications.results,
  });
};

// PATCH /api/notifications - mark as read
// Body: { ids?: number[], mark_all?: boolean }
export const onRequestPatch: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    ids?: number[];
    mark_all?: boolean;
  };

  if (body.mark_all) {
    await ctx.env.DB.prepare('UPDATE notifications SET read = 1 WHERE read = 0').run();
  } else if (body.ids?.length) {
    const placeholders = body.ids.map(() => '?').join(',');
    await ctx.env.DB.prepare(
      `UPDATE notifications SET read = 1 WHERE id IN (${placeholders})`
    )
      .bind(...body.ids)
      .run();
  }

  return Response.json({ success: true });
};
