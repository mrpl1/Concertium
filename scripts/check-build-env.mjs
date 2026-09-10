/**
 * Build-time environment preflight.
 *
 * `npm run build` runs `prisma db push`, so the build step — not just the
 * running app — needs DATABASE_URL. On a host where environment variables are
 * configured through a control panel rather than a shell, it is easy to set a
 * variable for the runtime and not for the build. Without this check that
 * shows up as a Prisma connection stack trace, which reads like a broken
 * database rather than a missing variable.
 *
 * Never print the credentials themselves. This project previously shipped a
 * diagnostic block that logged the database user and password length on every
 * start; the whole point of a preflight is that it can run in a build log that
 * someone else may read.
 */

const problems = [];
const warnings = [];
const notes = [];

const rawUrl = process.env.DATABASE_URL?.trim();

if (!rawUrl) {
  problems.push(
    "DATABASE_URL is not set.\n" +
      "    The build itself needs it: `build` runs `prisma db push` to create and\n" +
      "    update tables before `next build`. Setting it only for the running app\n" +
      "    is not enough.\n" +
      "    On Hostinger: hPanel > your Web App > Environment variables, then\n" +
      "    Redeploy so the build re-runs with the variable present.",
  );
} else {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    problems.push(
      "DATABASE_URL is set but is not a valid URL.\n" +
        "    Expected the form mysql://USER:PASSWORD@HOST:PORT/DATABASE",
    );
  }

  if (parsed) {
    const protocol = parsed.protocol.replace(/:$/, "");
    if (protocol !== "mysql") {
      problems.push(
        `DATABASE_URL uses the "${protocol}" protocol, but prisma/schema.prisma
    declares a mysql datasource. Expected a mysql:// URL.`,
      );
    }

    const database = parsed.pathname.replace(/^\//, "");
    if (!database) {
      problems.push(
        "DATABASE_URL has no database name.\n" +
          "    Expected mysql://USER:PASSWORD@HOST:PORT/DATABASE — the /DATABASE is missing.",
      );
    }

    // Host and database name only. Never the user, the password, or its length.
    if (!problems.length) {
      notes.push(
        `database "${database}" on ${parsed.hostname}:${parsed.port || "3306"}`,
      );
    }
  }
}

// Not required to build, but a build that succeeds and then returns a 500 on
// every authenticated page is worse than one that fails loudly here.
const secret = process.env.AUTH_SECRET?.trim();
if (!secret) {
  warnings.push(
    "AUTH_SECRET is not set. The build will succeed, but every page that reads\n" +
      "    a session throws at runtime. Set it before the app serves traffic.",
  );
} else if (secret.length < 16) {
  warnings.push(
    `AUTH_SECRET is only ${secret.length} characters. src/lib/auth.ts requires at\n` +
      "    least 16 and throws at runtime below that.",
  );
}

for (const w of warnings) console.warn(`\n  WARNING  ${w}`);

if (problems.length) {
  console.error("\n  Cannot build: the environment is incomplete.\n");
  for (const p of problems) console.error(`  ERROR  ${p}\n`);
  console.error(
    "  See docs/DEPLOYMENT.md for the full deploy procedure.\n",
  );
  process.exit(1);
}

console.log(`  Build environment OK — ${notes.join(", ")}`);
