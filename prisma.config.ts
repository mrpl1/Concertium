import { defineConfig } from "prisma/config";

// CLI-only config (Prisma 7 requires this file for `prisma generate`/`migrate`
// commands since datasource `url` was removed from schema.prisma). The
// `datasource.url` below is only used to let `prisma migrate diff` compute
// migration SQL locally — the app itself connects through @prisma/adapter-d1
// with the real D1 binding at runtime (see src/lib/db.ts), never through this
// file or a live connection to this placeholder file.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "file:./prisma/migrate-shadow.db",
  },
});
