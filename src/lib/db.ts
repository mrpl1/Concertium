import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Reuse a single PrismaClient across hot reloads / requests in the same
// Worker isolate to avoid exhausting D1 connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const { env } = getCloudflareContext();
  return new PrismaClient({
    adapter: new PrismaD1(env.DB),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

// Lazily constructed on first query rather than at module load, since the D1
// binding is only available via getCloudflareContext() once a request is in
// flight (module-level code can run before that, e.g. during Worker startup).
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = (globalForPrisma.prisma ??= createClient());
    return Reflect.get(client as object, prop, receiver);
  },
});
