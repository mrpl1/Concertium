// Secrets set via `wrangler secret put` (not declared in wrangler.jsonc, so
// `wrangler types` / cloudflare-env.d.ts never sees them). Declared here
// instead, in a file that isn't gitignored or regenerated, so it survives
// `npm run cf-typegen`.
interface CloudflareEnv {
  CRON_SECRET?: string;
}
