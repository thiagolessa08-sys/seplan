// src/lib/db.ts
// Prisma 7 requires a driver adapter. Using @prisma/adapter-pg for standard Postgres.
// Lazy proxy so PrismaClient is only instantiated at request time (DATABASE_URL may
// not be set at Next.js build time, but always available at runtime on Railway).
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL env var not set');
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Proxy defers actual client construction until first property access (request time).
export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client =
      globalForPrisma.prisma ?? (globalForPrisma.prisma = createClient());
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});
