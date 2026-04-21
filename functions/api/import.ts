// /api/import - Excel file import endpoint
// POST: upload .xlsx file, parse company/title/url, create applications

// We parse the XLSX on the client side using the xlsx library and send JSON
// This avoids needing xlsx parsing in the Worker environment

// POST /api/import
// Body: { rows: Array<{ company: string, title: string, url?: string, location?: string, status?: string }> }
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    rows: Array<{
      company: string;
      title: string;
      url?: string;
      location?: string;
      status?: string;
      notes?: string;
    }>;
  };

  if (!body.rows || !Array.isArray(body.rows) || body.rows.length === 0) {
    return Response.json(
      { success: false, error: 'No rows to import' },
      { status: 400 }
    );
  }

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of body.rows) {
    if (!row.company || !row.title) {
      skipped++;
      continue;
    }

    try {
      // Check if we already have an application with the same company+title
      const existing = await ctx.env.DB.prepare(
        'SELECT id FROM applications WHERE company = ? AND title = ?'
      )
        .bind(row.company.trim(), row.title.trim())
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      // Also try to match with an existing job in the DB by URL
      let jobId: number | null = null;
      if (row.url) {
        const job = await ctx.env.DB.prepare('SELECT id FROM jobs WHERE url = ?')
          .bind(row.url.trim())
          .first<{ id: number }>();
        if (job) jobId = job.id;
      }

      const status = row.status?.toLowerCase() || 'applied';
      const validStatuses = ['saved', 'applied', 'interview', 'offer', 'accepted', 'rejected'];
      const finalStatus = validStatuses.includes(status) ? status : 'applied';

      await ctx.env.DB.prepare(
        `INSERT INTO applications (job_id, company, title, url, location, status, notes, applied_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
        .bind(
          jobId,
          row.company.trim(),
          row.title.trim(),
          row.url?.trim() || null,
          row.location?.trim() || null,
          finalStatus,
          row.notes?.trim() || null
        )
        .run();

      imported++;
    } catch (e: any) {
      errors.push(`Row "${row.company} - ${row.title}": ${e.message}`);
    }
  }

  return Response.json({
    success: true,
    data: {
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      message: `Imported ${imported} applications, skipped ${skipped} duplicates`,
    },
  });
};
