# JobTracker

A personal job search dashboard built for finding engineering roles in Portugal and Belgium. Aggregates job listings from multiple sources, organizes them into buckets, and tracks applications through a Kanban pipeline.

**Live site**: https://jobtracker-2s1.pages.dev/

## What it does

- **Job aggregation** from TheirStack (LinkedIn, Indeed, Greenhouse, Lever), Remotive, Arbeitnow, and Jobicy
- **Saved jobs** organized into buckets by job type (Wind Energy, CFD, Data Science, etc.)
- **Application pipeline** -- Kanban board: Saved > Applied > Interview > Offer > Accepted/Rejected
- **AI resume analysis** -- upload your resume, compare it against job descriptions (powered by Cloudflare Workers AI)
- **Analytics dashboard** -- charts showing application funnel, response rate, timeline
- **Excel import** -- import existing application tracking spreadsheet
- **Daily cron job** -- automatically fetches new listings and sends email notifications

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | Cloudflare Pages Functions |
| Database | Cloudflare D1 (SQLite) |
| AI | Cloudflare Workers AI (Llama 3.1) |
| Job sources | TheirStack, Remotive, Arbeitnow, Jobicy |
| Cron | Cloudflare Workers (scheduled) |

---

## Setup guide (for a new Cloudflare account)

### Prerequisites

- Node.js 18+ installed
- A Cloudflare account (free tier works for everything)
- A TheirStack API key (get one at https://app.theirstack.com/settings/api-keys)

### Step 1: Clone and install

```bash
git clone https://github.com/leonorburmester/Jobtracker.git
cd Jobtracker
npm install
```

### Step 2: Login to Cloudflare

```bash
npx wrangler login
```

This opens your browser to authorize Wrangler with your Cloudflare account.

### Step 3: Create the database

```bash
npx wrangler d1 create jobtracker-db
```

This outputs a `database_id`. Copy it and paste it into **two files**:

- `wrangler.jsonc` -- line 13, replace `YOUR_D1_DATABASE_ID`
- `worker/wrangler.jsonc` -- line 18, replace `YOUR_D1_DATABASE_ID`

### Step 4: Run database migrations

```bash
npm run db:migrate:remote
```

This creates all tables and seeds default saved searches for wind energy, CFD, thermal engineering, data science, etc.

### Step 5: Set up API keys

Go to **Cloudflare Dashboard** > **Workers & Pages** > **jobtracker** > **Settings** > **Environment Variables** and add:

| Variable | Value | Where to get it |
|---|---|---|
| `THEIRSTACK_API_KEY` | Your TheirStack JWT token | https://app.theirstack.com/settings/api-keys |
| `ADZUNA_APP_ID` | *(optional)* Your Adzuna app ID | https://developer.adzuna.com |
| `ADZUNA_APP_KEY` | *(optional)* Your Adzuna app key | https://developer.adzuna.com |

For **local development**, create a `.dev.vars` file in the project root (it's gitignored):

```
THEIRSTACK_API_KEY=your_key_here
```

### Step 6: Deploy

```bash
npm run deploy
```

After the first deploy, go to **Cloudflare Dashboard** > **Workers & Pages** > **jobtracker** > **Settings** > **Bindings** and verify:

- **D1 Database**: `DB` is bound to `jobtracker-db`
- **Workers AI**: `AI` binding exists

If they're missing, add them manually, then redeploy.

### Step 7 (optional): Deploy the cron worker

The cron worker automatically fetches new jobs daily at 7:00 AM UTC.

```bash
npx wrangler deploy -c worker/wrangler.jsonc
```

For email notifications, set these secrets:

```bash
echo "your-resend-api-key" | npx wrangler secret put RESEND_API_KEY -c worker/wrangler.jsonc
echo "your@email.com" | npx wrangler secret put NOTIFICATION_EMAIL -c worker/wrangler.jsonc
echo "your-theirstack-key" | npx wrangler secret put THEIRSTACK_API_KEY -c worker/wrangler.jsonc
```

### Step 8: Connect GitHub for auto-deploy (recommended)

Instead of running `npm run deploy` manually, connect GitHub for automatic deployments:

1. Go to **Cloudflare Dashboard** > **Workers & Pages** > **jobtracker** > **Settings** > **Builds & Deployments**
2. Click **Connect to Git** and select this repository
3. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`

Now every push to `main` automatically deploys.

---

## Local development

```bash
npm run db:migrate:local   # Set up local database
npm run dev:worker         # Start dev server with Pages Functions
```

This runs Vite + Wrangler locally. The app is at http://localhost:5173 with API functions proxied through Wrangler.

---

## Project structure

```
jobtracker/
├── functions/api/          # Backend API (Cloudflare Pages Functions)
│   ├── jobs.ts             # Job search + aggregation from all sources
│   ├── applications.ts     # Application tracking CRUD + bulk ops
│   ├── buckets.ts          # Bucket management for Saved page
│   ├── searches.ts         # Saved search management
│   ├── import.ts           # Excel spreadsheet import
│   ├── resume.ts           # Resume upload + AI analysis
│   ├── dashboard.ts        # Dashboard statistics
│   └── notifications.ts    # Notification management
├── worker/                 # Cron worker (daily job refresh)
│   ├── cron.ts
│   └── wrangler.jsonc
├── migrations/             # D1 database schema
├── src/                    # React frontend
│   ├── pages/              # Dashboard, Jobs, Saved, Pipeline, Analytics, Settings
│   ├── components/         # Icons
│   ├── hooks/              # Toast notifications
│   └── lib/                # API client, types
├── wrangler.jsonc          # Cloudflare Pages config
└── package.json
```

## Making changes

You can edit code in two ways:

1. **On GitHub directly** -- click any file, click the pencil icon, edit, and commit. Cloudflare auto-deploys if connected.
2. **Locally** -- clone the repo, make changes, run `npm run dev:worker` to test, then push to deploy.

### Common things you might want to change

| What | Where |
|---|---|
| Add/edit saved searches | Use the app: Settings > Saved Searches |
| Change job sources or search behavior | `functions/api/jobs.ts` |
| Change the UI layout or pages | `src/pages/` folder |
| Add a new pipeline stage | `src/lib/types.ts` (PIPELINE_STAGES) + migration |
| Change cron schedule | `worker/wrangler.jsonc` (triggers.crons) |
| Styling | `src/index.css` |

---

## Costs

Everything runs on Cloudflare's free tier:

| Service | Free Tier |
|---|---|
| Pages | 500 deploys/month |
| D1 | 5M reads/day, 100k writes/day, 5GB storage |
| Workers AI | 10,000 neurons/day |
| TheirStack | 200 API credits (free plan) |
| Remotive / Arbeitnow / Jobicy | Unlimited, no key |
