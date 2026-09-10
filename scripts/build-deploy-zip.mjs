/**
 * Build the deploy archive for a Hostinger Web App.
 *
 *   npm run deploy:zip           -- package the current commit
 *   npm run deploy:zip -- main   -- package a specific ref
 *
 * The host expects a zip whose single top-level folder matches the app's root
 * directory setting (`Concertium-main`), containing the source only — it runs
 * `npm install` and `npm run build` itself after the upload.
 *
 * Built with `git archive`, so the contents are exactly the tracked files at
 * the named commit. That matters more than it sounds: an archive zipped from a
 * working directory picks up node_modules, .next and .env, which is both a
 * multi-hundred-megabyte upload and a way to publish credentials. The
 * assertions below fail the build rather than trusting that.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT_DIR = "Concertium-main";
const OUT = resolve(process.argv[3] ?? `dist/${ROOT_DIR}.zip`);

// Anything matching these must never reach the host.
const FORBIDDEN = [
  { label: "dependencies", re: /(^|\/)node_modules\// },
  { label: "build output", re: /(^|\/)\.next\// },
  // .env.example is tracked on purpose and documents the required variables.
  // Only real env files carry secrets.
  { label: "environment file", re: /(^|\/)\.env(\.(?!example$|sample$|template$).*|$)/ },
  { label: "local database", re: /\.db(-journal)?$/ },
  { label: "key material", re: /\.pem$/ },
];

// Without these the host's build cannot run at all.
const REQUIRED = [
  "package.json",
  "package-lock.json",
  "server.js",
  "next.config.mjs",
  "prisma/schema.prisma",
];

const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" }).trim();

const ref = process.argv[2] ?? "HEAD";

let sha;
try {
  sha = git("rev-parse", "--verify", `${ref}^{commit}`);
} catch {
  console.error(`\n  ERROR  "${ref}" is not a commit in this repository.\n`);
  process.exit(1);
}

const subject = git("log", "-1", "--format=%s", sha);
const dirty = git("status", "--porcelain");

console.log(`\n  Packaging ${ref} (${sha.slice(0, 7)}) — ${subject}`);
if (dirty) {
  // Not fatal: the archive comes from the commit, so this is only ever a
  // mismatch between what was tested locally and what ships.
  const n = dirty.split("\n").length;
  console.log(
    `  NOTE   ${n} uncommitted change${n === 1 ? "" : "s"} in the working tree are NOT included.`,
  );
}

mkdirSync(dirname(OUT), { recursive: true });
execFileSync(
  "git",
  ["archive", "--format=zip", `--prefix=${ROOT_DIR}/`, "-o", OUT, sha],
  { stdio: "inherit" },
);

// Read back what was actually written, rather than assuming git did as asked.
const entries = execFileSync("unzip", ["-Z1", OUT], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const problems = [];

const stray = entries.filter((e) => !e.startsWith(`${ROOT_DIR}/`));
if (stray.length) {
  problems.push(
    `${stray.length} entr${stray.length === 1 ? "y is" : "ies are"} not under ${ROOT_DIR}/ ` +
      `(the host would see the wrong root): ${stray.slice(0, 3).join(", ")}`,
  );
}

for (const { label, re } of FORBIDDEN) {
  const hits = entries.filter((e) => re.test(e));
  if (hits.length) {
    problems.push(
      `${hits.length} ${label} entr${hits.length === 1 ? "y" : "ies"} leaked in: ` +
        hits.slice(0, 3).join(", "),
    );
  }
}

const files = new Set(entries.map((e) => e.slice(ROOT_DIR.length + 1)));
for (const required of REQUIRED) {
  if (!files.has(required)) problems.push(`missing ${required}`);
}

if (problems.length) {
  console.error("\n  Archive is not safe to upload:\n");
  for (const p of problems) console.error(`  ERROR  ${p}`);
  console.error("");
  process.exit(1);
}

const bytes = statSync(OUT).size;
const digest = createHash("sha256").update(readFileSync(OUT)).digest("hex");
const fileCount = entries.filter((e) => !e.endsWith("/")).length;

console.log(`  ${OUT}`);
console.log(`  ${fileCount} files, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`  sha256 ${digest}`);
console.log(`\n  Next: docs/DEPLOYMENT.md §1 — back up the database before uploading.\n`);
