// Quick connectivity check for Slack (and SMTP presence). Reads SLACK_WEBHOOK_URL
// from the environment or the local .env file, then posts a test message.
//
//   node scripts/notify-test.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env reader (no dependency) — only used to find the webhook locally.
function fromEnvFile(key) {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return "";
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, "");
  }
  return "";
}

const url = process.env.SLACK_WEBHOOK_URL || fromEnvFile("SLACK_WEBHOOK_URL");

if (!url) {
  console.error("✗ SLACK_WEBHOOK_URL is not set (env or .env). Add it, then re-run.");
  process.exit(1);
}

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "✅ Concertium test message — your Slack webhook is working. Daily alert digests will post here.",
  }),
});

if (res.ok) {
  console.log("✓ Slack webhook OK — check the channel for the test message.");
} else {
  console.error(`✗ Slack webhook failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
