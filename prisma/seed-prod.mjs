// seed-prod.mjs — Plain ESM, no TypeScript required
// Runs on Railway to create the initial admin user and glossary
// Safe to run multiple times (uses upsert)

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Prisma 7: pass datasourceUrl explicitly
const db = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set — skipping seed');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await db.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Admin', passwordHash, role: 'ADMIN', active: true },
  });

  await db.glossary.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, content: '' },
  });

  console.log('Seed completed — admin user:', email);
}

main()
  .catch((e) => { console.error('Seed error:', e.message); })
  .finally(() => db.$disconnect());
