// /api/dashboard - Analytics and dashboard stats
// GET: return aggregated dashboard data

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  // Run all queries in parallel using D1 batch
  const results = await ctx.env.DB.batch([
    // Total jobs in DB
    ctx.env.DB.prepare('SELECT COUNT(*) as total FROM jobs'),
    // New (unseen) jobs
    ctx.env.DB.prepare('SELECT COUNT(*) as total FROM jobs WHERE is_new = 1'),
    // Total applications
    ctx.env.DB.prepare('SELECT COUNT(*) as total FROM applications'),
    // Applications by status
    ctx.env.DB.prepare(
      'SELECT status, COUNT(*) as count FROM applications GROUP BY status'
    ),
    // Recent applications (last 10)
    ctx.env.DB.prepare(
      'SELECT * FROM applications ORDER BY updated_at DESC LIMIT 10'
    ),
    // Upcoming follow-ups
    ctx.env.DB.prepare(
      `SELECT * FROM applications 
       WHERE follow_up_date IS NOT NULL 
       AND follow_up_date >= date('now') 
       AND status NOT IN ('accepted', 'rejected')
       ORDER BY follow_up_date ASC 
       LIMIT 10`
    ),
    // Applications this week
    ctx.env.DB.prepare(
      `SELECT COUNT(*) as total FROM applications 
       WHERE applied_date >= date('now', '-7 days')`
    ),
    // Applications with responses (interview/offer/accepted/rejected)
    ctx.env.DB.prepare(
      `SELECT COUNT(*) as total FROM applications 
       WHERE status IN ('interview', 'offer', 'accepted', 'rejected')`
    ),
    // Total applied+ (for response rate calculation)
    ctx.env.DB.prepare(
      `SELECT COUNT(*) as total FROM applications 
       WHERE status != 'saved'`
    ),
    // Unread notifications
    ctx.env.DB.prepare(
      'SELECT COUNT(*) as total FROM notifications WHERE read = 0'
    ),
    // Applications over time (last 30 days, grouped by date)
    ctx.env.DB.prepare(
      `SELECT date(applied_date) as date, COUNT(*) as count 
       FROM applications 
       WHERE applied_date >= date('now', '-30 days')
       AND applied_date IS NOT NULL
       GROUP BY date(applied_date) 
       ORDER BY date ASC`
    ),
    // Status changes over time (last 30 days)
    ctx.env.DB.prepare(
      `SELECT date(changed_at) as date, new_status, COUNT(*) as count 
       FROM status_history 
       WHERE changed_at >= date('now', '-30 days')
       GROUP BY date(changed_at), new_status 
       ORDER BY date ASC`
    ),
    // Top sources
    ctx.env.DB.prepare(
      'SELECT source, COUNT(*) as count FROM jobs GROUP BY source ORDER BY count DESC'
    ),
  ]);

  const totalJobs = (results[0].results[0] as any)?.total || 0;
  const newJobs = (results[1].results[0] as any)?.total || 0;
  const totalApplications = (results[2].results[0] as any)?.total || 0;

  // Build status counts
  const byStatus: Record<string, number> = {
    saved: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    accepted: 0,
    rejected: 0,
  };
  for (const row of results[3].results as any[]) {
    byStatus[row.status] = row.count;
  }

  const applicationsThisWeek = (results[6].results[0] as any)?.total || 0;
  const withResponses = (results[7].results[0] as any)?.total || 0;
  const totalAppliedPlus = (results[8].results[0] as any)?.total || 0;
  const responseRate = totalAppliedPlus > 0 ? Math.round((withResponses / totalAppliedPlus) * 100) : 0;
  const unreadNotifications = (results[9].results[0] as any)?.total || 0;

  return Response.json({
    success: true,
    data: {
      total_jobs: totalJobs,
      new_jobs: newJobs,
      total_applications: totalApplications,
      by_status: byStatus,
      recent_applications: results[4].results,
      upcoming_followups: results[5].results,
      applications_this_week: applicationsThisWeek,
      response_rate: responseRate,
      unread_notifications: unreadNotifications,
      applications_over_time: results[10].results,
      status_changes_over_time: results[11].results,
      top_sources: results[12].results,
    },
  });
};
