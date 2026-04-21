// /api/resume - Resume upload and AI analysis
// POST: store resume text (client extracts text from PDF)
// GET: get stored resume
// PUT: analyze resume against a specific job description using Workers AI

// GET /api/resume
export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const resume = await ctx.env.DB.prepare(
    'SELECT * FROM resume ORDER BY uploaded_at DESC LIMIT 1'
  ).first();

  return Response.json({
    success: true,
    data: resume || null,
  });
};

// POST /api/resume
// Body: { filename: string, text_content: string }
export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    filename: string;
    text_content: string;
  };

  if (!body.text_content) {
    return Response.json(
      { success: false, error: 'Resume text content is required' },
      { status: 400 }
    );
  }

  // Replace existing resume (keep only one)
  await ctx.env.DB.prepare('DELETE FROM resume').run();

  await ctx.env.DB.prepare(
    'INSERT INTO resume (filename, text_content) VALUES (?, ?)'
  )
    .bind(body.filename || 'resume.pdf', body.text_content)
    .run();

  return Response.json({ success: true, data: { message: 'Resume uploaded successfully' } });
};

// PUT /api/resume - Analyze resume against job description
// Body: { job_id?: number, job_description?: string, job_title?: string }
export const onRequestPut: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.request.json()) as {
    job_id?: number;
    job_description?: string;
    job_title?: string;
  };

  // Get resume
  const resume = await ctx.env.DB.prepare(
    'SELECT text_content FROM resume ORDER BY uploaded_at DESC LIMIT 1'
  ).first<{ text_content: string }>();

  if (!resume) {
    return Response.json(
      { success: false, error: 'No resume uploaded. Please upload your resume first.' },
      { status: 400 }
    );
  }

  // Get job description
  let jobDescription = body.job_description || '';
  let jobTitle = body.job_title || '';

  if (body.job_id) {
    const job = await ctx.env.DB.prepare('SELECT title, description FROM jobs WHERE id = ?')
      .bind(body.job_id)
      .first<{ title: string; description: string }>();

    if (job) {
      jobDescription = job.description || jobDescription;
      jobTitle = job.title || jobTitle;
    }
  }

  if (!jobDescription) {
    return Response.json(
      { success: false, error: 'Job description is required for analysis' },
      { status: 400 }
    );
  }

  // Use Workers AI to analyze
  const prompt = `You are a career advisor helping a job applicant improve their resume for a specific position.

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription.substring(0, 3000)}

CANDIDATE'S RESUME:
${resume.text_content.substring(0, 3000)}

Please provide a structured analysis with these sections:

1. **Match Score**: Rate 1-10 how well the resume matches this job
2. **Key Matching Skills**: List skills from the resume that match the job requirements
3. **Missing Keywords**: Important keywords/skills from the job description that are NOT in the resume
4. **Suggested Improvements**: Specific, actionable suggestions to tailor the resume for this role
5. **Cover Letter Tips**: 2-3 key points to emphasize in a cover letter for this position

Keep your response concise and actionable.`;

  try {
    const aiResponse = await ctx.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'You are an expert career advisor and resume consultant. Provide practical, specific advice.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
    });

    return Response.json({
      success: true,
      data: {
        analysis: (aiResponse as any).response || 'No analysis generated',
        job_title: jobTitle,
      },
    });
  } catch (e: any) {
    console.error('AI analysis error:', e);
    return Response.json(
      {
        success: false,
        error: 'AI analysis failed. This may happen if the Workers AI service is temporarily unavailable.',
      },
      { status: 500 }
    );
  }
};
