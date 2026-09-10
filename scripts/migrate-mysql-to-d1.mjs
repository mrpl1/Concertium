#!/usr/bin/env node
// One-off data migration: export every row from the live Hostinger MySQL
// database and load it into Cloudflare D1, converting types along the way.
//
// This is NOT run automatically by anything (npm install, build, deploy).
// Read docs/CLOUDFLARE.md before running it — this moves production data
// into a different database engine, once.
//
// Usage:
//   MYSQL_URL="mysql://user:pass@host:3306/dbname" node scripts/migrate-mysql-to-d1.mjs --dry-run
//   MYSQL_URL="mysql://user:pass@host:3306/dbname" node scripts/migrate-mysql-to-d1.mjs --out migration.sql
//   npx wrangler d1 execute concertium --remote --file migration.sql
//
// --dry-run prints row counts and one sample transformed row per table and
// writes nothing. Without it, the script writes a SQL file of INSERT
// statements (in FK-safe order) instead of touching D1 directly — review it,
// then apply it yourself with `wrangler d1 execute --file`. The target D1
// database must already have the schema applied (0001_init.sql).
//
// Requires the source database to be reachable from wherever this runs —
// Hostinger's MySQL is localhost-only by default; enable "Remote MySQL" in
// hPanel first, or tunnel/run this from the Hostinger host itself.

import mysql from "mysql2/promise";
import { writeFileSync } from "node:fs";

const MYSQL_URL = process.env.MYSQL_URL;
if (!MYSQL_URL) {
  console.error("Set MYSQL_URL to the source MySQL connection string.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const outIdx = process.argv.indexOf("--out");
const outFile = outIdx !== -1 ? process.argv[outIdx + 1] : "migration.sql";

// Parent-before-child order, matching the FKs in prisma/schema.prisma.
// _ProjectToTag is Prisma's implicit many-to-many join table (columns A, B,
// sorted alphabetically by model name — Project before Tag).
const TABLES = [
  { name: "Workspace", pk: "id" },
  { name: "User", pk: "id" },
  { name: "Invite", pk: "id" },
  { name: "Client", pk: "id" },
  { name: "Tag", pk: "id" },
  { name: "Project", pk: "id" },
  { name: "ProjectLink", pk: "id" },
  { name: "TimeEntry", pk: "id" },
  { name: "Deliverable", pk: "id" },
  { name: "DeadlineChange", pk: "id" },
  { name: "StatusUpdate", pk: "id" },
  { name: "ProjectMember", pk: "id" },
  { name: "ClientAssignment", pk: "id" },
  { name: "_ProjectToTag", pk: null },
];

// Columns that are Prisma Boolean fields (MySQL tinyint(1) -> SQLite 0/1).
const BOOLEAN_COLUMNS = new Set([
  "weeklyReportEnabled",
  "weeklyReport",
]);

// Columns that are Prisma DateTime fields (MySQL DATETIME -> SQLite ISO text,
// matching what Prisma itself writes).
const DATETIME_COLUMNS = new Set([
  "createdAt",
  "updatedAt",
  "expiresAt",
  "acceptedAt",
  "lastReportSentAt",
  "startDate",
  "dueDate",
  "baselineDueDate",
  "approvedAt",
  "date",
  "oldDate",
  "newDate",
]);

function sqlQuote(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

function transformRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = null;
    } else if (BOOLEAN_COLUMNS.has(key)) {
      out[key] = value ? 1 : 0;
    } else if (DATETIME_COLUMNS.has(key) && value instanceof Date) {
      out[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      out[key] = value.toString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  const conn = await mysql.createConnection(MYSQL_URL);
  const statements = [];

  for (const table of TABLES) {
    const [rows] = await conn.query(`SELECT * FROM \`${table.name}\``);
    console.log(`${table.name}: ${rows.length} row(s)`);

    if (dryRun) {
      if (rows.length) console.log(" sample:", transformRow(rows[0]));
      continue;
    }
    if (!rows.length) continue;

    for (const raw of rows) {
      const row = transformRow(raw);
      const columns = Object.keys(row);
      const values = columns.map((c) => sqlQuote(row[c]));
      statements.push(
        `INSERT INTO "${table.name}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${values.join(", ")});`
      );
    }
  }

  await conn.end();

  if (dryRun) {
    console.log("\nDry run only — no file written. Drop --dry-run to generate the SQL file.");
    return;
  }

  writeFileSync(outFile, statements.join("\n") + "\n");
  console.log(`\nWrote ${statements.length} statement(s) to ${outFile}.`);
  console.log(`Review it, then apply with:\n  npx wrangler d1 execute concertium --remote --file ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
