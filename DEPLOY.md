# JobTracker - Deployment Guide

## Prerequisites

- Node.js 18+ installed
- A Cloudflare account (free tier works)
- Wrangler CLI (installed as dev dependency)

## Step 1: Install Dependencies

```bash
cd jobtracker
npm install
```

## Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This opens a browser window to authorize Wrangler.

## Step 3: Create the D1 Database

```bash
npx wrangler d1 create jobtracker-db
```

This outputs a `database_id`. **Copy it** and update **both** config files:

1. `wrangler.jsonc` → replace `YOUR_D1_DATABASE_ID`
2. `worker/wrangler.jsonc` → replace `YOUR_D1_DATABASE_ID`

## Step 4: Run Database Migrations

```bash
# Apply schema to remote database
npm run db:migrate:remote
```

This creates all tables and seeds the default saved searches.

## Step 5: Set Up Adzuna API (Free)

1. Go to https://developer.adzuna.com/ and create a free account
2. Create an application to get your `app_id` and `app_key`
3. Set them in `wrangler.jsonc` under `vars`:

```jsonc
"vars": {
  "ADZUNA_APP_ID": "your_app_id_here",
  "ADZUNA_APP_KEY": "your_app_key_here"
}
```

**Note**: Without Adzuna credentials, the app still works with Remotive and Arbeitnow
(free, no key needed). Adzuna adds Portugal and Belgium-specific listings with salary data.

## Step 6: Build and Deploy

```bash
# Build the frontend + deploy everything
npm run deploy
```

This builds the Vite app and deploys to Cloudflare Pages. The first deploy
creates the Pages project. Wrangler will give you a URL like:
`https://jobtracker.your-subdomain.pages.dev`

## Step 7: Deploy the Cron Worker (Optional)

The cron worker runs daily at 7:00 AM UTC to automatically fetch new jobs
and send email notifications.

```bash
# Deploy the scheduled worker
npx wrangler deploy -c worker/wrangler.jsonc
```

### Email Notifications (Optional)

To enable email notifications:

1. Sign up at https://resend.com (free tier: 100 emails/day)
2. Get your API key
3. Set secrets:

```bash
# Set secrets for the cron worker
echo "your-resend-api-key" | npx wrangler secret put RESEND_API_KEY -c worker/wrangler.jsonc
echo "husband@email.com" | npx wrangler secret put NOTIFICATION_EMAIL -c worker/wrangler.jsonc

# Also set Adzuna keys as secrets for the cron worker
echo "your_app_id" | npx wrangler secret put ADZUNA_APP_ID -c worker/wrangler.jsonc
echo "your_app_key" | npx wrangler secret put ADZUNA_APP_KEY -c worker/wrangler.jsonc
```

4. Update the email URL in `worker/cron.ts` line with your actual Pages URL:
   Replace `https://your-jobtracker-url.pages.dev` with your real URL.

## Step 8: Bind D1 and AI to Pages (Dashboard)

After the first deploy, go to the Cloudflare Dashboard to verify bindings:

1. Go to **Workers & Pages** → **jobtracker** → **Settings** → **Bindings**
2. Verify these bindings exist:
   - **D1 Database**: `DB` → `jobtracker-db`
   - **Workers AI**: `AI`
3. If missing, add them manually in the dashboard

## Local Development

```bash
# Run locally with D1 and AI bindings
npm run db:migrate:local   # Set up local database
npm run dev:worker         # Start dev server with Wrangler proxy
```

This runs Vite's dev server proxied through Wrangler, so Pages Functions
work locally with a local D1 database.

## Project Structure

```
jobtracker/
├── functions/api/          # Cloudflare Pages Functions (serverless API)
│   ├── jobs.ts             # Job aggregation from Adzuna/Remotive/Arbeitnow
│   ├── applications.ts     # Application tracking CRUD
│   ├── searches.ts         # Saved search management
│   ├── import.ts           # Excel import
│   ├── resume.ts           # PDF resume + Workers AI analysis
│   ├── dashboard.ts        # Dashboard stats aggregation
│   └── notifications.ts    # Notification management
├── worker/                 # Separate cron worker
│   ├── cron.ts             # Scheduled job refresh + email notifications
│   └── wrangler.jsonc      # Cron worker config
├── migrations/             # D1 database migrations
│   └── 0001_initial_schema.sql
├── src/                    # React frontend (Vite)
│   ├── App.tsx             # Layout + routing
│   ├── pages/              # Dashboard, Jobs, Pipeline, Analytics, Settings
│   ├── components/         # Icons, shared components
│   ├── hooks/              # useToast
│   └── lib/                # API client, types
├── wrangler.jsonc          # Pages project config
└── package.json
```

## Usage Tips

### Importing his existing spreadsheet
1. Go to **Settings** → **Import Data** tab
2. Upload the `.xlsx` file
3. Map the columns (company, title, URL)
4. Click "Import All Rows"

### First job search
1. Go to **Settings** → **Saved Searches** tab
2. Default searches are pre-configured for his profile
3. Click "Run All Active" to fetch initial job listings
4. Go to **Job Listings** to browse results

### Resume analysis
1. Go to **Settings** → **Resume** tab
2. Upload his PDF resume (or paste the text)
3. Browse **Job Listings**, click any job, then click "AI Resume Tips"
4. Workers AI compares the resume against the job description

### Tracking applications
- From **Job Listings**: click "Track" on any job to add it to the pipeline
- From **Pipeline**: click "Add Application" to manually add one
- Drag cards between columns or use arrow buttons to move them
- Click any card to edit notes, contact info, salary, follow-up dates

## Costs

Everything runs on Cloudflare's free tier:

| Service | Free Tier |
|---------|-----------|
| Pages | 500 deploys/month, 100k function requests/day |
| D1 | 5M reads/day, 100k writes/day, 5GB storage |
| Workers AI | 10,000 neurons/day (~50 resume analyses) |
| Cron Worker | Included in free Workers plan |
| Adzuna API | Requires free signup, generous limits |
| Remotive/Arbeitnow | Free, no signup needed |
| Resend (email) | 100 emails/day free (optional) |
