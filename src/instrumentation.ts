// Next.js startup hook. Runs once when the server process boots.
export async function register() {
  // Only on the Node.js server runtime (not edge/middleware).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./lib/scheduler");
    startScheduler();
  }
}
