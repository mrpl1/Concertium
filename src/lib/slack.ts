import "server-only";

// Slack delivery via an Incoming Webhook URL. The URL is a per-workspace
// setting (Workspace.slackWebhookUrl); it is passed in explicitly rather than
// read from a global env var.

export function isSlackConfigured(url: string | null | undefined): boolean {
  return Boolean(url && url.trim());
}

export async function sendSlack(
  url: string | null | undefined,
  text: string
): Promise<void> {
  if (!url) throw new Error("No Slack webhook URL configured for this workspace.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
  }
}
