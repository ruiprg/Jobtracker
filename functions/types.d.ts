// Types for Cloudflare Pages Functions
// Run `npx wrangler types --path='./functions/types.d.ts'` to regenerate

interface Env {
  DB: D1Database;
  AI: Ai;
  NOTIFICATION_EMAIL?: string;
  RESEND_API_KEY?: string;
  // Optional: sign up free at developer.adzuna.com for PT/BE job coverage
  ADZUNA_APP_ID?: string;
  ADZUNA_APP_KEY?: string;
  // TheirStack: aggregates LinkedIn, Indeed, Greenhouse, Lever + more
  THEIRSTACK_API_KEY?: string;
}
