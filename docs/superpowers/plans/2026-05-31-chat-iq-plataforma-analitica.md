# Chat IQ — Plataforma Analítica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Next.js 15 analytical chat platform that lets municipal servants query Sybase IQ (DWPROD16) via natural language, using Claude AI to translate questions to SQL and execute via a Java HTTP Agent.

**Architecture:** Single Next.js 15 App Router service on Railway. Auth.js v5 handles multi-role auth (ADMIN/ANALYST/VIEWER) with JWT sessions and bcrypt passwords stored in Postgres. Claude orchestrates NL→SQL via tool use with a 5-block cached system prompt; all agent calls proxy through Next.js so credentials never reach the browser.

**Tech Stack:** Next.js 15, TypeScript 5, Tailwind CSS, shadcn/ui, Auth.js v5, Prisma 6, Postgres (Railway), @anthropic-ai/sdk, pino, Vitest

---

## File Map

```
seplan/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── types/domain.ts
│   ├── lib/
│   │   ├── db.ts
│   │   ├── logger.ts
│   │   ├── agent.ts
│   │   ├── schema-cache.ts
│   │   ├── prompts.ts
│   │   ├── anthropic.ts
│   │   └── auth.ts
│   ├── middleware.ts
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx
│   │   │   ├── chat/page.tsx
│   │   │   ├── favoritos/page.tsx
│   │   │   └── admin/
│   │   │       ├── usuarios/page.tsx
│   │   │       ├── glossario/page.tsx
│   │   │       ├── catalogo/page.tsx
│   │   │       └── sistema/page.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── chat/route.ts
│   │       ├── favorites/route.ts
│   │       ├── favorites/[id]/route.ts
│   │       ├── favorites/[id]/execute/route.ts
│   │       ├── feedback/route.ts
│   │       └── admin/
│   │           ├── users/route.ts
│   │           ├── users/[id]/route.ts
│   │           ├── glossary/route.ts
│   │           ├── schema/route.ts
│   │           ├── schema/refresh/route.ts
│   │           └── agent/health/route.ts
│   └── components/
│       ├── layout/Sidebar.tsx
│       ├── layout/Topbar.tsx
│       └── chat/
│           ├── ChatWindow.tsx
│           ├── MessageList.tsx
│           ├── MessageInput.tsx
│           ├── ResultTable.tsx
│           └── SqlBadge.tsx
├── tests/
│   ├── lib/agent.test.ts
│   ├── lib/schema-cache.test.ts
│   ├── lib/prompts.test.ts
│   └── lib/anthropic.test.ts
├── .env.example
├── railway.json
├── next.config.ts
└── vitest.config.ts
```

---

## Task 1: Scaffold project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `.env.example`

- [ ] **Step 1: Create Next.js app**

```bash
cd "C:\Users\CAPITANI\OneDrive\Documentos\seplan"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: Next.js 15 project scaffolded in current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install @prisma/client prisma next-auth@beta @auth/prisma-adapter bcryptjs @anthropic-ai/sdk pino
npm install -D @types/bcryptjs vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
npx shadcn@latest init --defaults
npx shadcn@latest add button input label card table badge textarea separator scroll-area tooltip dialog sheet
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 4: Create tests/setup.ts**

```typescript
// tests/setup.ts
import { vi } from 'vitest';

// Reset all mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

- [ ] **Step 5: Create .env.example**

```bash
# Agent HTTP (Java Agent → Sybase IQ DWPROD16)
AGENT_URL=https://wall-meyer-sip-forecast.trycloudflare.com
AGENT_API_KEY=chave123abc456def789

# LLM
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5

# Postgres (Railway injeta automaticamente)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth.js
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# Seed do admin inicial
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=changeme123

# Operacional (com defaults)
SCHEMA_CACHE_TTL_HOURS=24
DEFAULT_QUERY_LIMIT=100
CHAT_HISTORY_MAX_TURNS=5
```

- [ ] **Step 6: Create .env.local copiando .env.example e preenchendo valores reais**

- [ ] **Step 7: Add test script to package.json**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 8: Verify dev server starts**

```bash
npm run dev
```

Expected: Next.js starts on http://localhost:3000 without errors.

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 15 project with deps"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/types/domain.ts`

- [ ] **Step 1: Write types**

```typescript
// src/types/domain.ts

export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
}

export interface TableSchema {
  name: string;
  type: 'BASE' | 'VIEW';
  columns: ColumnDef[];
  includedInContext: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  count: number;
  truncated: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  result?: QueryResult;
  createdAt: Date;
}

export interface Favorite {
  id: string;
  name: string;
  naturalLanguage: string;
  sql: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackPayload {
  rating: 'POSITIVE' | 'NEGATIVE';
  comment?: string;
  naturalLanguage: string;
  sql: string;
  rowCount?: number;
}

// SSE event types sent from /api/chat
export type ChatSseEvent =
  | { type: 'text'; text: string }
  | { type: 'tool_start'; tool: string }
  | { type: 'sql'; sql: string }
  | { type: 'result'; columns: string[]; rows: unknown[][]; count: number; truncated: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string };
```

- [ ] **Step 2: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat: add domain types"
```

---

## Task 3: Prisma schema, migration and seed

**Files:**
- Create: `prisma/schema.prisma`, `prisma/seed.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String
  passwordHash String
  role         Role       @default(VIEWER)
  active       Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  favorites    Favorite[]
  feedbacks    Feedback[]
}

enum Role {
  ADMIN
  ANALYST
  VIEWER
}

model Favorite {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String
  naturalLanguage String
  sql             String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId])
}

model Feedback {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating          Rating
  comment         String?
  naturalLanguage String
  sql             String
  rowCount        Int?
  createdAt       DateTime @default(now())

  @@index([rating, createdAt])
}

enum Rating {
  POSITIVE
  NEGATIVE
}

model Glossary {
  id        Int      @id @default(1)
  content   String   @default("")
  updatedBy String?
  updatedAt DateTime @updatedAt
}

model SchemaTablePref {
  schemaName        String
  tableName         String
  includedInContext Boolean  @default(true)
  updatedAt         DateTime @updatedAt

  @@id([schemaName, tableName])
}
```

- [ ] **Step 3: Write prisma/seed.ts**

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set');
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

  console.log('Seed completed');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
```

- [ ] **Step 4: Add seed config to package.json**

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

- [ ] **Step 5: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration file created in `prisma/migrations/`.

- [ ] **Step 6: Run seed**

```bash
npx prisma db seed
```

Expected: `Seed completed`

- [ ] **Step 7: Verify with Prisma Studio**

```bash
npx prisma studio
```

Expected: Browser opens, shows User (1 ADMIN) and Glossary (1 empty row).

- [ ] **Step 8: Commit**

```bash
git add prisma/ package.json
git commit -m "feat: prisma schema, migration and seed"
```

---

## Task 4: Logger and db singleton

**Files:**
- Create: `src/lib/logger.ts`, `src/lib/db.ts`

- [ ] **Step 1: Write src/lib/logger.ts**

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(process.env.NODE_ENV === 'development' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});
```

- [ ] **Step 2: Write src/lib/db.ts**

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/logger.ts src/lib/db.ts
git commit -m "feat: add logger and db singleton"
```

---

## Task 5: Agent client

**Files:**
- Create: `src/lib/agent.ts`, `tests/lib/agent.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/agent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubEnv('AGENT_URL', 'https://test-agent.example.com');
vi.stubEnv('AGENT_API_KEY', 'test-key');

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { agentHealth, agentListTables, agentGetSchema, agentRunQuery } from '@/lib/agent';

describe('agentHealth', () => {
  it('returns ok:true on 200', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok' }),
    });
    const result = await agentHealth();
    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://test-agent.example.com/health',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-API-Key': 'test-key' }) })
    );
  });

  it('throws on non-200', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(agentHealth()).rejects.toThrow('503');
  });
});

describe('agentListTables', () => {
  it('trims names and types', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tables: [
          { name: 'FATO_INTERVENCAO_DOTACAO   ', type: 'BASE         ' },
          { name: 'DIM_DATA_CALENDARIO        ', type: 'BASE         ' },
        ],
      }),
    });
    const tables = await agentListTables();
    expect(tables[0].name).toBe('FATO_INTERVENCAO_DOTACAO');
    expect(tables[0].type).toBe('BASE');
  });
});

describe('agentRunQuery', () => {
  it('posts sql and limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ columns: ['N'], rows: [['1']], count: 1, truncated: false }),
    });
    const result = await agentRunQuery('SELECT 1 AS N', 50);
    expect(result.columns).toEqual(['N']);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.sql).toBe('SELECT 1 AS N');
    expect(body.limit).toBe(50);
  });

  it('throws with status on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal error',
    });
    await expect(agentRunQuery('SELECT 1')).rejects.toThrow('500');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test tests/lib/agent.test.ts
```

Expected: FAIL — `agentHealth`, `agentListTables`, `agentRunQuery` not found.

- [ ] **Step 3: Write src/lib/agent.ts**

```typescript
// src/lib/agent.ts
import { logger } from '@/lib/logger';
import type { QueryResult } from '@/types/domain';

function getBase(): string {
  const url = process.env.AGENT_URL;
  if (!url) throw new Error('AGENT_URL env var not set');
  return url.replace(/\/$/, '');
}

function getHeaders(): Record<string, string> {
  return {
    'X-API-Key': process.env.AGENT_API_KEY ?? '',
    'Content-Type': 'application/json',
  };
}

export async function agentHealth(): Promise<{ ok: boolean }> {
  const res = await fetch(`${getBase()}/health`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Agent /health returned ${res.status}`);
  const data = await res.json() as { status: string };
  return { ok: data.status === 'ok' };
}

export interface TableRef {
  name: string;
  type: string;
}

export async function agentListTables(): Promise<TableRef[]> {
  const res = await fetch(`${getBase()}/tables`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Agent /tables returned ${res.status}`);
  const data = await res.json() as { tables: Array<{ name: string; type: string }> };
  return data.tables.map((t) => ({ name: t.name.trim(), type: t.type.trim() }));
}

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
}

export async function agentGetSchema(table: string): Promise<ColumnDef[]> {
  const res = await fetch(`${getBase()}/schema/${encodeURIComponent(table)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Agent /schema/${table} returned ${res.status}`);
  const data = await res.json() as { columns: Array<{ name: string; type: string; nullable: boolean }> };
  return data.columns.map((c) => ({
    name: c.name.trim(),
    type: c.type.trim(),
    nullable: c.nullable,
  }));
}

export async function agentRunQuery(sql: string, limit = 100): Promise<QueryResult> {
  logger.debug({ sql, limit }, 'agent.runQuery');
  const res = await fetch(`${getBase()}/query`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ sql, limit }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Agent /query returned ${res.status}: ${text}`);
  }
  return res.json() as Promise<QueryResult>;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test tests/lib/agent.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent.ts tests/lib/agent.test.ts
git commit -m "feat: agent HTTP client with tests"
```

---

## Task 6: Schema cache

**Files:**
- Create: `src/lib/schema-cache.ts`, `tests/lib/schema-cache.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/schema-cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/agent', () => ({
  agentListTables: vi.fn(),
  agentGetSchema: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: { schemaTablePref: { findMany: vi.fn().mockResolvedValue([]) } },
}));

import { agentListTables, agentGetSchema } from '@/lib/agent';
import { getSchema, refreshSchema, CATALOG_TABLE_NAMES } from '@/lib/schema-cache';

const mockListTables = vi.mocked(agentListTables);
const mockGetSchema = vi.mocked(agentGetSchema);

const fakeCols = [{ name: 'ID', type: 'integer', nullable: false }];

beforeEach(() => {
  mockListTables.mockResolvedValue(
    CATALOG_TABLE_NAMES.map((name) => ({ name, type: 'BASE' }))
  );
  mockGetSchema.mockResolvedValue(fakeCols);
});

describe('refreshSchema', () => {
  it('only loads CATALOG tables', async () => {
    mockListTables.mockResolvedValueOnce([
      { name: 'FATO_INTERVENCAO_DOTACAO', type: 'BASE' },
      { name: 'STG_SOME_STAGING_TABLE', type: 'BASE' }, // should be ignored
      { name: 'DIM_DATA_CALENDARIO', type: 'BASE' },
    ]);
    const tables = await refreshSchema();
    const names = tables.map((t) => t.name);
    expect(names).toContain('FATO_INTERVENCAO_DOTACAO');
    expect(names).toContain('DIM_DATA_CALENDARIO');
    expect(names).not.toContain('STG_SOME_STAGING_TABLE');
  });

  it('defaults includedInContext to true', async () => {
    const tables = await refreshSchema();
    expect(tables.every((t) => t.includedInContext)).toBe(true);
  });
});

describe('getSchema', () => {
  it('uses cache on second call within TTL', async () => {
    await refreshSchema();
    mockListTables.mockClear();
    await getSchema();
    expect(mockListTables).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

```bash
npm test tests/lib/schema-cache.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write src/lib/schema-cache.ts**

```typescript
// src/lib/schema-cache.ts
import { agentListTables, agentGetSchema } from '@/lib/agent';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { TableSchema } from '@/types/domain';

export const CATALOG_TABLE_NAMES = [
  'FATO_INTERVENCAO_DOTACAO',
  'FATO_EXECUCAO_RECEITA',
  'FATO_REPASSE_FINANCEIRO',
  'DIM_DATA_CALENDARIO',
  'DIM_UNIDADE_GESTORA',
  'DIM_FONTE_RECURSO',
  'DIM_NATUREZA_DESPESA',
  'DIM_SUBACAO',
  'DIM_INSTITUCIONAL',
  'DIM_FORNECEDOR',
  'DIM_EMENDA_PARLAMENTAR',
  'DIM_GRUPO_PROG_FINANCEIRA',
  'DIM_NATUREZA_RECEITA',
] as const;

const DEFAULT_SCHEMA = 'DWPROD16';
const TTL_MS = (Number(process.env.SCHEMA_CACHE_TTL_HOURS) || 24) * 60 * 60 * 1000;

let cache: { tables: TableSchema[]; loadedAt: Date } | null = null;

export async function getSchema(): Promise<TableSchema[]> {
  if (cache && Date.now() - cache.loadedAt.getTime() < TTL_MS) {
    return cache.tables;
  }
  return refreshSchema();
}

export async function refreshSchema(): Promise<TableSchema[]> {
  logger.info('schema-cache: refreshing');

  const [allTables, prefs] = await Promise.all([
    agentListTables(),
    db.schemaTablePref.findMany(),
  ]);

  const prefMap = new Map(
    prefs.map((p) => [`${p.schemaName}.${p.tableName}`, p.includedInContext])
  );

  const catalogSet = new Set<string>(CATALOG_TABLE_NAMES);
  const filtered = allTables.filter((t) => catalogSet.has(t.name));

  const tables: TableSchema[] = await Promise.all(
    filtered.map(async (t) => {
      const columns = await agentGetSchema(t.name);
      const prefKey = `${DEFAULT_SCHEMA}.${t.name}`;
      const includedInContext = prefMap.get(prefKey) ?? true;
      return {
        name: t.name,
        type: t.type as 'BASE' | 'VIEW',
        columns,
        includedInContext,
      };
    })
  );

  cache = { tables, loadedAt: new Date() };
  logger.info({ count: tables.length }, 'schema-cache: refreshed');
  return tables;
}

export function invalidateCache(): void {
  cache = null;
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test tests/lib/schema-cache.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/schema-cache.ts tests/lib/schema-cache.test.ts
git commit -m "feat: schema cache with 13-table catalog"
```

---

## Task 7: System prompts

**Files:**
- Create: `src/lib/prompts.ts`, `tests/lib/prompts.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/prompts.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemBlocks } from '@/lib/prompts';
import type { TableSchema } from '@/types/domain';

const fakeTables: TableSchema[] = [
  {
    name: 'FATO_INTERVENCAO_DOTACAO',
    type: 'BASE',
    includedInContext: true,
    columns: [
      { name: 'ID_FATO', type: 'integer', nullable: false },
      { name: 'SK_DATA_CALENDARIO', type: 'integer', nullable: true },
      { name: 'VL_SALDO_MES_PAGO', type: 'numeric', nullable: true },
    ],
  },
  {
    name: 'DIM_DATA_CALENDARIO',
    type: 'BASE',
    includedInContext: true,
    columns: [
      { name: 'SK_DATA_CALENDARIO', type: 'integer', nullable: false },
      { name: 'NO_ANO', type: 'smallint', nullable: true },
    ],
  },
  {
    name: 'TEMP_TABLE',
    type: 'BASE',
    includedInContext: false, // should be excluded
    columns: [{ name: 'ID', type: 'integer', nullable: false }],
  },
];

describe('buildSystemBlocks', () => {
  it('returns 4 blocks', () => {
    const blocks = buildSystemBlocks(fakeTables, 'glossary text');
    expect(blocks).toHaveLength(4);
  });

  it('each block has cache_control', () => {
    const blocks = buildSystemBlocks(fakeTables, '');
    blocks.forEach((b) => expect(b.cache_control).toEqual({ type: 'ephemeral' }));
  });

  it('catalog block includes only includedInContext tables', () => {
    const blocks = buildSystemBlocks(fakeTables, '');
    const catalog = blocks[2].text;
    expect(catalog).toContain('FATO_INTERVENCAO_DOTACAO');
    expect(catalog).toContain('DIM_DATA_CALENDARIO');
    expect(catalog).not.toContain('TEMP_TABLE');
  });

  it('catalog block includes SK relationships', () => {
    const blocks = buildSystemBlocks(fakeTables, '');
    expect(blocks[2].text).toContain('JOIN DIM_DATA_CALENDARIO ON SK_DATA_CALENDARIO');
  });

  it('glossary block includes provided text', () => {
    const blocks = buildSystemBlocks(fakeTables, 'receita = arrecadação de IPTU');
    expect(blocks[3].text).toContain('receita = arrecadação de IPTU');
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

```bash
npm test tests/lib/prompts.test.ts
```

- [ ] **Step 3: Write src/lib/prompts.ts**

```typescript
// src/lib/prompts.ts
import type { TableSchema } from '@/types/domain';

interface SystemBlock {
  type: 'text';
  text: string;
  cache_control: { type: 'ephemeral' };
}

const BLOCK_INSTRUCTIONS = `Você é um assistente analítico do governo. Sua tarefa é responder perguntas em português gerando SQL para o banco Sybase IQ 16 (DWPROD16).

COMPORTAMENTO:
- Sempre responda em português do Brasil.
- Use a ferramenta run_query para executar a consulta final.
- Use a ferramenta sample_table quando precisar entender os valores reais de uma coluna antes de gerar o SQL.
- Após receber os resultados, explique o que encontrou em 1-3 frases simples.
- Se a pergunta for ambígua, pergunte ao usuário antes de gerar SQL.

RESTRIÇÕES:
- Apenas SELECT é permitido. Nunca gere INSERT, UPDATE, DELETE, DDL ou DML.
- Nunca mencione nomes de usuários, senhas ou configurações internas do banco.
- Não invente colunas ou tabelas que não estejam no catálogo.`;

const BLOCK_SYBASE_IQ = `BOAS PRÁTICAS OBRIGATÓRIAS — SYBASE IQ 16 (BANCO COLUNAR):

PERFORMANCE:
- NUNCA envolva colunas em funções no WHERE ou JOIN (UPPER, LOWER, CAST, SUBSTRING).
  Isso desativa índices HG/LF/HNG e força full scan.
  ❌ WHERE UPPER(DS_FORNECEDOR) = 'PREFEITURA'
  ✅ WHERE DS_FORNECEDOR = 'Prefeitura'
- NUNCA use SELECT *. Liste apenas as colunas necessárias.
- Use TOP N no lugar de LIMIT. Paginação: TOP N START AT M.
- Sybase IQ não tem LIMIT/OFFSET padrão SQL.

SINTAXE:
- Literais de data: DATE('2024-01-01') no formato 'YYYY-MM-DD'.
- Strings com aspas simples. Aspas duplas são para identificadores.
- JOINs sempre explícitos: INNER JOIN ... ON (nunca vírgula no FROM).
- COUNT(*) é otimizado; prefira a COUNT(coluna).

ANALYTICS:
- Funções de janela: ROW_NUMBER() OVER(...), SUM() OVER(PARTITION BY ...).
- Para top-N por grupo use ROW_NUMBER() OVER(PARTITION BY ...).

CUIDADOS:
- NULL: sempre IS NULL / IS NOT NULL, nunca = NULL.
- DIVISION BY ZERO retorna NULL em IQ. Use NULLIF(denominador, 0) para controlar.
- IC_* colunas são flags CHAR. Consulte sample_table para saber os valores possíveis antes de filtrar.`;

const RELATIONSHIPS = `
RELACIONAMENTOS (sempre faça JOIN via SK):
FATO_INTERVENCAO_DOTACAO:
  INNER JOIN DIM_DATA_CALENDARIO ON FATO_INTERVENCAO_DOTACAO.SK_DATA_CALENDARIO = DIM_DATA_CALENDARIO.SK_DATA_CALENDARIO
  INNER JOIN DIM_UNIDADE_GESTORA ON FATO_INTERVENCAO_DOTACAO.SK_UNIDADE_GESTORA = DIM_UNIDADE_GESTORA.SK_UNIDADE_GESTORA
  INNER JOIN DIM_FONTE_RECURSO ON FATO_INTERVENCAO_DOTACAO.SK_FONTE_RECURSO = DIM_FONTE_RECURSO.SK_FONTE_RECURSO
  INNER JOIN DIM_NATUREZA_DESPESA ON FATO_INTERVENCAO_DOTACAO.SK_NATUREZA_DESPESA = DIM_NATUREZA_DESPESA.SK_NATUREZA_DESPESA
  INNER JOIN DIM_SUBACAO ON FATO_INTERVENCAO_DOTACAO.SK_SUBACAO = DIM_SUBACAO.SK_SUBACAO
  INNER JOIN DIM_INSTITUCIONAL ON FATO_INTERVENCAO_DOTACAO.SK_INSTITUCIONAL = DIM_INSTITUCIONAL.SK_INSTITUCIONAL
  INNER JOIN DIM_FORNECEDOR ON FATO_INTERVENCAO_DOTACAO.SK_FORNECEDOR = DIM_FORNECEDOR.SK_FORNECEDOR
  INNER JOIN DIM_EMENDA_PARLAMENTAR ON FATO_INTERVENCAO_DOTACAO.SK_EMENDA_PARLAMENTAR = DIM_EMENDA_PARLAMENTAR.SK_EMENDA_PARLAMENTAR
  INNER JOIN DIM_GRUPO_PROG_FINANCEIRA ON FATO_INTERVENCAO_DOTACAO.SK_GRUPO_PROG_FINANCEIRA = DIM_GRUPO_PROG_FINANCEIRA.SK_GRUPO_PROG_FINANCEIRA

FATO_EXECUCAO_RECEITA:
  INNER JOIN DIM_DATA_CALENDARIO ON FATO_EXECUCAO_RECEITA.SK_DATA_CALENDARIO = DIM_DATA_CALENDARIO.SK_DATA_CALENDARIO
  INNER JOIN DIM_UNIDADE_GESTORA ON FATO_EXECUCAO_RECEITA.SK_UNIDADE_GESTORA = DIM_UNIDADE_GESTORA.SK_UNIDADE_GESTORA
  INNER JOIN DIM_FONTE_RECURSO ON FATO_EXECUCAO_RECEITA.SK_FONTE_RECURSO = DIM_FONTE_RECURSO.SK_FONTE_RECURSO
  INNER JOIN DIM_NATUREZA_RECEITA ON FATO_EXECUCAO_RECEITA.SK_NATUREZA_RECEITA = DIM_NATUREZA_RECEITA.SK_NATUREZA_RECEITA

FATO_REPASSE_FINANCEIRO:
  INNER JOIN DIM_DATA_CALENDARIO ON FATO_REPASSE_FINANCEIRO.SK_DATA_CALENDARIO = DIM_DATA_CALENDARIO.SK_DATA_CALENDARIO
  INNER JOIN DIM_UNIDADE_GESTORA ON FATO_REPASSE_FINANCEIRO.SK_UNIDADE_GESTORA = DIM_UNIDADE_GESTORA.SK_UNIDADE_GESTORA
  INNER JOIN DIM_GRUPO_PROG_FINANCEIRA ON FATO_REPASSE_FINANCEIRO.SK_GRUPO_PROG_FINANCEIRA = DIM_GRUPO_PROG_FINANCEIRA.SK_GRUPO_PROG_FINANCEIRA
  INNER JOIN DIM_FONTE_RECURSO ON FATO_REPASSE_FINANCEIRO.SK_FONTE_RECURSO = DIM_FONTE_RECURSO.SK_FONTE_RECURSO`;

function buildCatalogBlock(tables: TableSchema[]): string {
  const included = tables.filter((t) => t.includedInContext);
  const tablesText = included
    .map((t) => {
      const cols = t.columns
        .map((c) => `  ${c.name.padEnd(45)} ${c.type.padEnd(12)} ${c.nullable ? 'NULL' : 'NOT NULL'}`)
        .join('\n');
      return `Tabela: ${t.name}\n${cols}`;
    })
    .join('\n\n');

  return `CATÁLOGO DO BANCO DWPROD16 (${included.length} tabelas):\n\n${tablesText}\n${RELATIONSHIPS}`;
}

export function buildSystemBlocks(tables: TableSchema[], glossaryContent: string): SystemBlock[] {
  return [
    { type: 'text', text: BLOCK_INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: BLOCK_SYBASE_IQ, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: buildCatalogBlock(tables), cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text: glossaryContent
        ? `REGRAS DE NEGÓCIO (definidas pelo administrador):\n\n${glossaryContent}`
        : 'REGRAS DE NEGÓCIO: (nenhuma regra definida ainda)',
      cache_control: { type: 'ephemeral' },
    },
  ];
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test tests/lib/prompts.test.ts
```

Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompts.ts tests/lib/prompts.test.ts
git commit -m "feat: system prompt builder with 4 cached blocks"
```

---

## Task 8: Anthropic orchestration client

**Files:**
- Create: `src/lib/anthropic.ts`, `tests/lib/anthropic.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/lib/anthropic.test.ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { stream: vi.fn() },
  })),
  Anthropic: vi.fn().mockImplementation(() => ({
    messages: { stream: vi.fn() },
  })),
}));

vi.mock('@/lib/agent', () => ({
  agentRunQuery: vi.fn().mockResolvedValue({
    columns: ['TOTAL'], rows: [['42']], count: 1, truncated: false,
  }),
}));

vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
vi.stubEnv('ANTHROPIC_MODEL', 'claude-haiku-4-5');

import { TOOLS } from '@/lib/anthropic';

describe('TOOLS', () => {
  it('exports sample_table and run_query tools', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toContain('sample_table');
    expect(names).toContain('run_query');
  });

  it('run_query requires sql param', () => {
    const runQuery = TOOLS.find((t) => t.name === 'run_query')!;
    expect(runQuery.input_schema.required).toContain('sql');
  });
});
```

- [ ] **Step 2: Run tests to confirm fail**

```bash
npm test tests/lib/anthropic.test.ts
```

- [ ] **Step 3: Write src/lib/anthropic.ts**

```typescript
// src/lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, Tool, ContentBlock } from '@anthropic-ai/sdk/resources/messages';
import { agentRunQuery } from '@/lib/agent';
import { logger } from '@/lib/logger';
import type { QueryResult, ChatMessage } from '@/types/domain';

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export const TOOLS: Tool[] = [
  {
    name: 'sample_table',
    description:
      'Retorna as primeiras 5 linhas de uma tabela para entender os dados reais antes de gerar o SQL final.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: { type: 'string', description: 'Nome da tabela (sem schema prefix).' },
      },
      required: ['table'],
    },
  },
  {
    name: 'run_query',
    description: 'Executa a query SELECT final no banco Sybase IQ e retorna os resultados.',
    input_schema: {
      type: 'object' as const,
      properties: {
        sql: { type: 'string', description: 'Query SELECT a ser executada.' },
        limit: { type: 'number', description: 'Máximo de linhas (default 100).' },
      },
      required: ['sql'],
    },
  },
];

export interface StreamChatOptions {
  systemBlocks: Array<{ type: 'text'; text: string; cache_control: { type: 'ephemeral' } }>;
  history: Pick<ChatMessage, 'role' | 'content'>[];
  question: string;
  onText: (text: string) => void;
  onToolStart: (toolName: string) => void;
  onSql: (sql: string) => void;
  onResult: (result: QueryResult) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function streamChat(options: StreamChatOptions): Promise<void> {
  const client = getClient();
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
  const limit = Number(process.env.DEFAULT_QUERY_LIMIT) || 100;

  const messages: MessageParam[] = [
    ...options.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: options.question },
  ];

  let lastSql = '';

  // Tool-use loop (Claude may call tools multiple times)
  for (let round = 0; round < 5; round++) {
    const textParts: string[] = [];
    const toolUseBlocks: ContentBlock[] = [];

    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: options.systemBlocks as MessageParam['content'],
      messages,
      tools: TOOLS,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        options.onText(event.delta.text);
        textParts.push(event.delta.text);
      }
    }

    const finalMsg = await stream.finalMessage();
    const allBlocks = finalMsg.content;

    for (const block of allBlocks) {
      if (block.type === 'tool_use') toolUseBlocks.push(block);
    }

    if (finalMsg.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      logger.info(
        {
          inputTokens: finalMsg.usage.input_tokens,
          cacheReadTokens: (finalMsg.usage as Record<string, number>).cache_read_input_tokens ?? 0,
          outputTokens: finalMsg.usage.output_tokens,
        },
        'claude.usage'
      );
      options.onDone();
      return;
    }

    // Execute tools
    messages.push({ role: 'assistant', content: allBlocks });
    const toolResults: MessageParam['content'] = [];

    for (const block of toolUseBlocks) {
      if (block.type !== 'tool_use') continue;
      options.onToolStart(block.name);

      try {
        let resultText: string;
        const input = block.input as Record<string, unknown>;

        if (block.name === 'run_query') {
          const sql = input.sql as string;
          lastSql = sql;
          options.onSql(sql);
          const result = await agentRunQuery(sql, (input.limit as number) ?? limit);
          options.onResult(result);
          resultText = JSON.stringify(result);
        } else if (block.name === 'sample_table') {
          const sql = `SELECT TOP 5 * FROM ${input.table as string}`;
          const result = await agentRunQuery(sql, 5);
          resultText = JSON.stringify(result);
        } else {
          resultText = JSON.stringify({ error: `Unknown tool: ${block.name}` });
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: resultText,
        });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: (err as Error).message }),
          is_error: true,
        });
      }
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Safety: 5 rounds exceeded
  options.onError(new Error('Número máximo de rounds de tool use excedido'));
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test tests/lib/anthropic.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/anthropic.ts tests/lib/anthropic.test.ts
git commit -m "feat: Claude orchestration with tool use and streaming"
```

---

## Task 9: Auth.js v5

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/types/next-auth.d.ts` (create)

- [ ] **Step 1: Create src/types/next-auth.d.ts**

```typescript
// src/types/next-auth.d.ts
import type { Role } from '@/types/domain';
import 'next-auth';

declare module 'next-auth' {
  interface User {
    role: Role;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: Role;
    id: string;
  }
}
```

- [ ] **Step 2: Write src/lib/auth.ts**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { Role } from '@/types/domain';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, role: user.role as Role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: Role }).role;
        token.id = user.id!;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      return session;
    },
  },
  pages: { signIn: '/login' },
});
```

- [ ] **Step 3: Write src/app/api/auth/[...nextauth]/route.ts**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
export { handlers as GET, handlers as POST } from '@/lib/auth';
```

- [ ] **Step 4: Test login manually**

Start dev server and navigate to http://localhost:3000/login. Login with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Should redirect to `/chat` (even if page doesn't exist yet, no 401 error).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/types/next-auth.d.ts
git commit -m "feat: Auth.js v5 credentials provider with role in JWT"
```

---

## Task 10: Middleware and route protection

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Write src/middleware.ts**

```typescript
// src/middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    if (isLoggedIn && pathname === '/login') {
      return NextResponse.redirect(new URL('/chat', req.url));
    }
    return NextResponse.next();
  }

  // API routes — return 401 JSON instead of redirect
  if (pathname.startsWith('/api/')) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Admin API protection
    if (pathname.startsWith('/api/admin/') && req.auth?.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // All other routes require login
  if (!isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
};
```

- [ ] **Step 2: Verify protection**

With dev server running, open http://localhost:3000/chat in an incognito window. Should redirect to `/login`.

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: route protection middleware with role guard"
```

---

## Task 11: Login page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create login page**

```typescript
// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Email ou senha incorretos.');
    } else {
      router.push(params.get('callbackUrl') ?? '/chat');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            {/* Logo placeholder — substituir por <Image src="/logo.png" ... /> quando disponível */}
            <span className="text-2xl font-bold text-gray-800">Chat IQ</span>
          </div>
          <CardTitle className="text-lg">Acesso à plataforma</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Test login flow**

Navigate to http://localhost:3000/login. Login with seed credentials. Should redirect to `/chat`.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat: login page with credentials form"
```

---

## Task 12: App shell (layout, sidebar, topbar)

**Files:**
- Create: `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, `src/app/(app)/layout.tsx`

- [ ] **Step 1: Write Sidebar**

```typescript
// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Star, Users, BookOpen, Database, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/domain';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/chat', label: 'Chat IQ', icon: MessageSquare, roles: ['ADMIN', 'ANALYST'] },
  { href: '/favoritos', label: 'Favoritos', icon: Star, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  { href: '/admin/glossario', label: 'Glossário', icon: BookOpen, roles: ['ADMIN'] },
  { href: '/admin/catalogo', label: 'Catálogo', icon: Database, roles: ['ADMIN'] },
  { href: '/admin/sistema', label: 'Sistema', icon: Activity, roles: ['ADMIN'] },
];

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-700">
        <span className="font-bold text-white text-lg">Chat IQ</span>
        <p className="text-xs text-gray-400 mt-0.5">DWPROD16</p>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Write Topbar**

```typescript
// src/components/layout/Topbar.tsx
'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import type { Role } from '@/types/domain';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
};

interface TopbarProps {
  userName: string;
  role: Role;
}

export function Topbar({ userName, role }: TopbarProps) {
  return (
    <header className="h-12 border-b bg-white flex items-center justify-between px-4">
      <div />
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-none">{userName}</p>
          <p className="text-xs text-gray-500">{ROLE_LABELS[role]}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: '/login' })}
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Write app layout**

```typescript
// src/app/(app)/layout.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import type { Role } from '@/types/domain';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role as Role;

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userName={session.user.name ?? ''} role={role} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add redirect from root**

```typescript
// src/app/page.tsx  (replace existing)
import { redirect } from 'next/navigation';
export default function Home() { redirect('/chat'); }
```

- [ ] **Step 5: Verify layout**

Login and check that sidebar + topbar render, role-filtered nav items show correctly.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/app/\(app\)/layout.tsx src/app/page.tsx
git commit -m "feat: app shell with sidebar and topbar"
```

---

## Task 13: Chat API route (streaming)

**Files:**
- Create: `src/app/api/chat/route.ts`

- [ ] **Step 1: Write src/app/api/chat/route.ts**

```typescript
// src/app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { streamChat } from '@/lib/anthropic';
import { getSchema } from '@/lib/schema-cache';
import { buildSystemBlocks } from '@/lib/prompts';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { ChatMessage } from '@/types/domain';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response('Unauthorized', { status: 401 });
  if (session.user.role === 'VIEWER') return new Response('Forbidden', { status: 403 });

  const { question, history } = (await req.json()) as {
    question: string;
    history: Pick<ChatMessage, 'role' | 'content'>[];
  };

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: 'question is required' }), { status: 400 });
  }

  const maxTurns = Number(process.env.CHAT_HISTORY_MAX_TURNS) || 5;
  const trimmedHistory = (history ?? []).slice(-maxTurns * 2);

  const [schema, glossary] = await Promise.all([
    getSchema(),
    db.glossary.findUnique({ where: { id: 1 } }),
  ]);

  const systemBlocks = buildSystemBlocks(schema, glossary?.content ?? '');
  const start = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await streamChat({
          systemBlocks,
          history: trimmedHistory,
          question,
          onText: (text) => send('text', { text }),
          onToolStart: (tool) => send('tool_start', { tool }),
          onSql: (sql) => send('sql', { sql }),
          onResult: (result) => send('result', result),
          onDone: () => {
            send('done', {});
            logger.info(
              { userId: session.user.id, latencyMs: Date.now() - start },
              'chat.done'
            );
            controller.close();
          },
          onError: (err) => {
            send('error', { message: err.message });
            controller.close();
          },
        });
      } catch (err) {
        send('error', { message: (err as Error).message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: streaming chat API route with SSE"
```

---

## Task 14: Favorites API

**Files:**
- Create: `src/app/api/favorites/route.ts`, `src/app/api/favorites/[id]/route.ts`, `src/app/api/favorites/[id]/execute/route.ts`

- [ ] **Step 1: Write src/app/api/favorites/route.ts**

```typescript
// src/app/api/favorites/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, naturalLanguage: true, sql: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role === 'VIEWER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, naturalLanguage, sql } = await req.json();
  if (!name || !naturalLanguage || !sql) {
    return NextResponse.json({ error: 'name, naturalLanguage and sql required' }, { status: 400 });
  }

  const favorite = await db.favorite.create({
    data: { userId: session.user.id, name, naturalLanguage, sql },
  });

  return NextResponse.json(favorite, { status: 201 });
}
```

- [ ] **Step 2: Write src/app/api/favorites/[id]/route.ts**

```typescript
// src/app/api/favorites/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const fav = await db.favorite.findUnique({ where: { id } });
  if (!fav || fav.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await db.favorite.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
```

- [ ] **Step 3: Write src/app/api/favorites/[id]/execute/route.ts**

```typescript
// src/app/api/favorites/[id]/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { agentRunQuery } from '@/lib/agent';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const fav = await db.favorite.findUnique({ where: { id } });
  if (!fav) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // All roles can execute favorites
  const result = await agentRunQuery(
    fav.sql,
    Number(process.env.DEFAULT_QUERY_LIMIT) || 100
  );

  return NextResponse.json(result);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/favorites/
git commit -m "feat: favorites API (list, create, delete, execute)"
```

---

## Task 15: Feedback and Admin APIs

**Files:**
- Create: `src/app/api/feedback/route.ts`, `src/app/api/admin/users/route.ts`, `src/app/api/admin/users/[id]/route.ts`, `src/app/api/admin/glossary/route.ts`, `src/app/api/admin/schema/route.ts`, `src/app/api/admin/schema/refresh/route.ts`, `src/app/api/admin/agent/health/route.ts`

- [ ] **Step 1: Write feedback API**

```typescript
// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { FeedbackPayload } from '@/types/domain';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await req.json()) as FeedbackPayload;
  if (!body.rating || !body.naturalLanguage || !body.sql) {
    return NextResponse.json({ error: 'rating, naturalLanguage and sql required' }, { status: 400 });
  }

  const feedback = await db.feedback.create({
    data: {
      userId: session.user.id,
      rating: body.rating,
      comment: body.comment,
      naturalLanguage: body.naturalLanguage,
      sql: body.sql,
      rowCount: body.rowCount,
    },
  });

  return NextResponse.json(feedback, { status: 201 });
}
```

- [ ] **Step 2: Write admin users API**

```typescript
// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Middleware already enforces ADMIN role for /api/admin/*

export async function GET() {
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const { email, name, password, role } = await req.json();
  if (!email || !name || !password || !role) {
    return NextResponse.json({ error: 'email, name, password, role required' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password as string, 12);
  const user = await db.user.create({
    data: { email, name, passwordHash, role },
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
  });

  return NextResponse.json(user, { status: 201 });
}
```

- [ ] **Step 3: Write admin users [id] API**

```typescript
// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json() as { name?: string; role?: string; active?: boolean };

  const user = await db.user.update({
    where: { id },
    data: body,
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  return NextResponse.json(user);
}
```

- [ ] **Step 4: Write glossary API**

```typescript
// src/app/api/admin/glossary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  const glossary = await db.glossary.findUnique({ where: { id: 1 } });
  return NextResponse.json({ content: glossary?.content ?? '' });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  const { content } = await req.json() as { content: string };

  const glossary = await db.glossary.upsert({
    where: { id: 1 },
    update: { content, updatedBy: session?.user.id },
    create: { id: 1, content, updatedBy: session?.user.id },
  });

  return NextResponse.json({ content: glossary.content });
}
```

- [ ] **Step 5: Write schema APIs**

```typescript
// src/app/api/admin/schema/route.ts
import { NextResponse } from 'next/server';
import { getSchema } from '@/lib/schema-cache';

export async function GET() {
  const tables = await getSchema();
  return NextResponse.json(tables);
}
```

```typescript
// src/app/api/admin/schema/refresh/route.ts
import { NextResponse } from 'next/server';
import { refreshSchema } from '@/lib/schema-cache';

export async function POST() {
  const tables = await refreshSchema();
  return NextResponse.json({ count: tables.length, refreshedAt: new Date().toISOString() });
}
```

- [ ] **Step 6: Write agent health API**

```typescript
// src/app/api/admin/agent/health/route.ts
import { NextResponse } from 'next/server';
import { agentHealth } from '@/lib/agent';

export async function GET() {
  try {
    const result = await agentHealth();
    return NextResponse.json({ ok: result.ok, agentUrl: process.env.AGENT_URL });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 503 });
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/feedback/ src/app/api/admin/
git commit -m "feat: feedback and admin APIs"
```

---

## Task 16: Chat UI components

**Files:**
- Create: `src/components/chat/ResultTable.tsx`, `src/components/chat/SqlBadge.tsx`, `src/components/chat/MessageList.tsx`, `src/components/chat/MessageInput.tsx`, `src/components/chat/ChatWindow.tsx`

- [ ] **Step 1: Write ResultTable**

```typescript
// src/components/chat/ResultTable.tsx
import { Badge } from '@/components/ui/badge';
import type { QueryResult } from '@/types/domain';

interface ResultTableProps {
  result: QueryResult;
}

export function ResultTable({ result }: ResultTableProps) {
  return (
    <div className="mt-2 space-y-1">
      <div className="overflow-x-auto rounded-md border">
        <table className="text-sm w-full">
          <thead className="bg-gray-50">
            <tr>
              {result.columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {result.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-gray-800 whitespace-nowrap">
                    {cell === null ? <span className="text-gray-400 italic">null</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>{result.count} linha{result.count !== 1 ? 's' : ''}</span>
        {result.truncated && <Badge variant="secondary">Resultado truncado</Badge>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write SqlBadge**

```typescript
// src/components/chat/SqlBadge.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface SqlBadgeProps {
  sql: string;
}

export function SqlBadge({ sql }: SqlBadgeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2 rounded-md border bg-gray-900 text-gray-100 text-xs">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-gray-400 font-mono">SQL gerado</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={copy}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>
      {open && <pre className="px-3 pb-3 overflow-x-auto whitespace-pre-wrap">{sql}</pre>}
    </div>
  );
}
```

- [ ] **Step 3: Write MessageList**

```typescript
// src/components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { ResultTable } from './ResultTable';
import { SqlBadge } from './SqlBadge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import type { ChatMessage } from '@/types/domain';

interface MessageListProps {
  messages: ChatMessage[];
  onFeedback: (msg: ChatMessage, rating: 'POSITIVE' | 'NEGATIVE') => void;
  onFavorite: (msg: ChatMessage) => void;
}

export function MessageList({ messages, onFeedback, onFavorite }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-gray-400 text-sm">
          Faça uma pergunta sobre os dados orçamentários.
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-3xl w-full ${msg.role === 'user' ? 'pl-8' : 'pr-8'}`}>
            <div
              className={`rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white ml-auto max-w-xl'
                  : 'bg-white border shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.sql && <SqlBadge sql={msg.sql} />}
              {msg.result && <ResultTable result={msg.result} />}
            </div>
            {msg.role === 'assistant' && msg.sql && (
              <div className="flex items-center gap-1 mt-1 ml-1">
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-green-600"
                  onClick={() => onFeedback(msg, 'POSITIVE')}
                  title="Resposta útil"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-red-600"
                  onClick={() => onFeedback(msg, 'NEGATIVE')}
                  title="Resposta incorreta"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-yellow-500"
                  onClick={() => onFavorite(msg)}
                  title="Salvar como favorito"
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 4: Write MessageInput**

```typescript
// src/components/chat/MessageInput.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSend: (question: string) => void;
  loading: boolean;
}

export function MessageInput({ onSend, loading }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const q = value.trim();
    if (!q || loading) return;
    setValue('');
    onSend(q);
  }

  return (
    <div className="border-t bg-white px-4 py-3">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre os dados orçamentários... (Enter para enviar)"
          className="min-h-[44px] max-h-32 resize-none"
          disabled={loading}
        />
        <Button onClick={submit} disabled={!value.trim() || loading} className="shrink-0 h-11">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-1">Shift+Enter para nova linha</p>
    </div>
  );
}
```

- [ ] **Step 5: Write ChatWindow**

```typescript
// src/components/chat/ChatWindow.tsx
'use client';

import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { ChatMessage, QueryResult } from '@/types/domain';

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (question: string) => {
    const userMsg: ChatMessage = {
      id: nanoid(), role: 'user', content: question, createdAt: new Date(),
    };
    const assistantId = nanoid();
    const assistantMsg: ChatMessage = {
      id: assistantId, role: 'assistant', content: '', createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });

      if (!res.body) throw new Error('No stream body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const updateAssistant = (patch: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m))
        );
      };

      let textAccum = '';
      let lastSql = '';
      let lastResult: QueryResult | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const raw of events) {
          const eventLine = raw.match(/^event: (.+)/m)?.[1];
          const dataLine = raw.match(/^data: (.+)/m)?.[1];
          if (!eventLine || !dataLine) continue;
          const data = JSON.parse(dataLine);

          if (eventLine === 'text') {
            textAccum += data.text;
            updateAssistant({ content: textAccum });
          } else if (eventLine === 'tool_start') {
            updateAssistant({ content: textAccum + '\n\n⏳ Consultando banco de dados...' });
          } else if (eventLine === 'sql') {
            lastSql = data.sql;
            updateAssistant({ sql: lastSql });
          } else if (eventLine === 'result') {
            lastResult = data as QueryResult;
            updateAssistant({ result: lastResult, content: textAccum });
          } else if (eventLine === 'done') {
            updateAssistant({ content: textAccum, sql: lastSql || undefined, result: lastResult });
          } else if (eventLine === 'error') {
            updateAssistant({ content: `Erro: ${data.message}` });
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Erro ao processar: ${(err as Error).message}` } : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [messages]);

  async function handleFeedback(msg: ChatMessage, rating: 'POSITIVE' | 'NEGATIVE') {
    if (!msg.sql) return;
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        naturalLanguage: messages.find((m) => m.role === 'user' && messages.indexOf(m) === messages.indexOf(msg) - 1)?.content ?? '',
        sql: msg.sql,
        rowCount: msg.result?.count,
      }),
    });
  }

  async function handleFavorite(msg: ChatMessage) {
    if (!msg.sql) return;
    const name = prompt('Nome para este favorito:');
    if (!name) return;
    const userMsg = messages[messages.indexOf(msg) - 1];
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        naturalLanguage: userMsg?.content ?? '',
        sql: msg.sql,
      }),
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <MessageList messages={messages} onFeedback={handleFeedback} onFavorite={handleFavorite} />
      <MessageInput onSend={send} loading={loading} />
    </div>
  );
}
```

- [ ] **Step 6: Install nanoid**

```bash
npm install nanoid
```

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/
git commit -m "feat: chat UI components with streaming SSE"
```

---

## Task 17: Chat page and Favorites page

**Files:**
- Create: `src/app/(app)/chat/page.tsx`, `src/app/(app)/favoritos/page.tsx`

- [ ] **Step 1: Chat page**

```typescript
// src/app/(app)/chat/page.tsx
import { ChatWindow } from '@/components/chat/ChatWindow';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function ChatPage() {
  const session = await auth();
  if (session?.user?.role === 'VIEWER') redirect('/favoritos');
  return <ChatWindow />;
}
```

- [ ] **Step 2: Favorites page**

```typescript
// src/app/(app)/favoritos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResultTable } from '@/components/chat/ResultTable';
import { Play, Trash2, Star } from 'lucide-react';
import type { Favorite, QueryResult } from '@/types/domain';

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/favorites').then((r) => r.json()).then(setFavorites);
  }, []);

  async function execute(fav: Favorite) {
    setLoading((p) => ({ ...p, [fav.id]: true }));
    const res = await fetch(`/api/favorites/${fav.id}/execute`, { method: 'POST' });
    const result = await res.json();
    setResults((p) => ({ ...p, [fav.id]: result }));
    setLoading((p) => ({ ...p, [fav.id]: false }));
  }

  async function remove(id: string) {
    await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
    setFavorites((p) => p.filter((f) => f.id !== id));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-500" />
        <h1 className="text-xl font-semibold">Favoritos</h1>
      </div>
      {favorites.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum favorito salvo. Use o chat para salvar consultas.</p>
      )}
      {favorites.map((fav) => (
        <Card key={fav.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{fav.name}</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">{fav.naturalLanguage}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm" variant="outline"
                  onClick={() => execute(fav)}
                  disabled={loading[fav.id]}
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  {loading[fav.id] ? 'Executando...' : 'Executar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(fav.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {results[fav.id] && (
            <CardContent>
              <ResultTable result={results[fav.id]} />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Test end-to-end**

Login → Chat page → type "Qual é o total pago em 2024?" → verify streaming response, SQL badge, result table, thumbs + star buttons.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/chat/ src/app/\(app\)/favoritos/
git commit -m "feat: chat page and favorites page"
```

---

## Task 18: Admin pages

**Files:**
- Create: `src/app/(app)/admin/usuarios/page.tsx`, `src/app/(app)/admin/glossario/page.tsx`, `src/app/(app)/admin/catalogo/page.tsx`, `src/app/(app)/admin/sistema/page.tsx`

- [ ] **Step 1: Admin — Usuários**

```typescript
// src/app/(app)/admin/usuarios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus } from 'lucide-react';
import type { Role } from '@/types/domain';

interface UserRow { id: string; email: string; name: string; role: Role; active: boolean; }

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  ANALYST: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-700',
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'ANALYST' as Role });

  useEffect(() => {
    fetch('/api/admin/users').then((r) => r.json()).then(setUsers);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) {
      const user = await res.json();
      setUsers((p) => [user, ...p]);
      setForm({ email: '', name: '', password: '', role: 'ANALYST' });
    }
  }

  async function toggle(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    });
    setUsers((p) => p.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Usuários</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex gap-2"><UserPlus className="w-4 h-4 mt-0.5" />Novo usuário</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-2 gap-3">
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <Input type="password" placeholder="Senha" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            <select className="border rounded-md px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}>
              <option value="ADMIN">Admin</option>
              <option value="ANALYST">Analista</option>
              <option value="VIEWER">Visualizador</option>
            </select>
            <Button type="submit" className="col-span-2">Criar usuário</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 bg-white border rounded-md">
            <div>
              <p className="font-medium text-sm">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
              <Button size="sm" variant={u.active ? 'outline' : 'secondary'} onClick={() => toggle(u)}>
                {u.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Admin — Glossário**

```typescript
// src/app/(app)/admin/glossario/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Save } from 'lucide-react';

export default function GlossarioPage() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/glossary').then((r) => r.json()).then((d) => setContent(d.content));
  }, []);

  async function save() {
    await fetch('/api/admin/glossary', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Glossário de Regras de Negócio</h1>
      </div>
      <p className="text-sm text-gray-500">
        Escreva regras em linguagem natural. Exemplo: "Para receita própria, somar IPTU + ISS + Taxas."
        Este texto será enviado ao Claude em toda consulta.
      </p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva as regras de negócio aqui..."
        className="min-h-64 font-mono text-sm"
      />
      <Button onClick={save} className="flex gap-2">
        <Save className="w-4 h-4" />
        {saved ? 'Salvo!' : 'Salvar'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Admin — Catálogo**

```typescript
// src/app/(app)/admin/catalogo/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw } from 'lucide-react';
import type { TableSchema } from '@/types/domain';

export default function CatalogoPage() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = await fetch('/api/admin/schema').then((r) => r.json());
    setTables(data);
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    const data = await fetch('/api/admin/schema/refresh', { method: 'POST' }).then((r) => r.json());
    await load();
    setRefreshing(false);
    alert(`Catálogo atualizado: ${data.count} tabelas`);
  }

  const fatos = tables.filter((t) => t.name.startsWith('FATO_'));
  const dims = tables.filter((t) => t.name.startsWith('DIM_'));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h1 className="text-xl font-semibold">Catálogo de Tabelas</h1>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing} className="flex gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar catálogo
        </Button>
      </div>

      {[{ label: 'Tabelas Fato', items: fatos }, { label: 'Dimensões', items: dims }].map(({ label, items }) => (
        <div key={label} className="space-y-2">
          <h2 className="font-medium text-gray-700">{label} ({items.length})</h2>
          {items.map((t) => (
            <div key={t.name} className="bg-white border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono font-medium">{t.name}</code>
                <Badge variant={t.includedInContext ? 'default' : 'secondary'}>
                  {t.includedInContext ? 'No contexto' : 'Excluído'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.columns.map((c) => (
                  <span key={c.name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Admin — Sistema**

```typescript
// src/app/(app)/admin/sistema/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface HealthStatus { ok: boolean; agentUrl?: string; error?: string; }

export default function SistemaPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    const data = await fetch('/api/admin/agent/health').then((r) => r.json());
    setHealth(data);
    setChecking(false);
  }

  useEffect(() => { check(); }, []);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Status do Sistema</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Java Agent (Sybase IQ)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {health && (
            <div className="flex items-center gap-2">
              {health.ok
                ? <CheckCircle className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-600" />}
              <span className={`font-medium ${health.ok ? 'text-green-700' : 'text-red-700'}`}>
                {health.ok ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
          {health?.agentUrl && (
            <p className="text-xs text-gray-500 font-mono break-all">{health.agentUrl}</p>
          )}
          {health?.error && <p className="text-xs text-red-600">{health.error}</p>}
          <p className="text-xs text-gray-400">
            Para trocar a URL do Agent: edite AGENT_URL no Railway e reinicie o serviço.
          </p>
          <Button variant="outline" size="sm" onClick={check} disabled={checking} className="flex gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Testar conexão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/admin/
git commit -m "feat: admin pages (users, glossary, catalog, system)"
```

---

## Task 19: Security headers and Railway deploy config

**Files:**
- Modify: `next.config.ts`
- Create: `railway.json`

- [ ] **Step 1: Update next.config.ts with security headers**

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self'",
              "connect-src 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

- [ ] **Step 2: Create railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npx prisma generate && npx prisma migrate deploy && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/admin/agent/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

- [ ] **Step 3: Add .gitignore entries (verify .env.local is excluded)**

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` is listed. If not: `echo ".env.local" >> .gitignore`

- [ ] **Step 4: Final build check**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 6: Final commit**

```bash
git add next.config.ts railway.json
git commit -m "feat: security headers and Railway deploy config"
```

---

## Task 20: Railway deploy

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/<seu-usuario>/seplan.git
git push -u origin main
```

- [ ] **Step 2: Create Railway project**

1. Acesse https://railway.app
2. New Project → Deploy from GitHub → selecione o repositório `seplan`
3. Add Plugin → PostgreSQL

- [ ] **Step 3: Configure environment variables no Railway**

No painel do serviço web, adicione todas as vars do `.env.example` com valores reais:
```
AGENT_URL=https://wall-meyer-sip-forecast.trycloudflare.com
AGENT_API_KEY=chave123abc456def789
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://<seu-app>.up.railway.app
SEED_ADMIN_EMAIL=admin@...
SEED_ADMIN_PASSWORD=<senha forte>
SCHEMA_CACHE_TTL_HOURS=24
DEFAULT_QUERY_LIMIT=100
CHAT_HISTORY_MAX_TURNS=5
```

`DATABASE_URL` já é injetado automaticamente pelo Railway ao adicionar o plugin Postgres.

- [ ] **Step 4: Trigger deploy e verificar**

O Railway faz deploy automático no push. Acompanhe o log de build.

- [ ] **Step 5: Rodar seed em produção**

No Railway: abra o terminal do serviço web e execute:
```bash
npx prisma db seed
```

- [ ] **Step 6: Acessar a URL pública e fazer login**

Acesse `https://<seu-app>.up.railway.app` e logue com as credenciais do seed.

- [ ] **Step 7: Verificar /admin/sistema**

Confirme que o agent está Online. Se URL mudou, atualize `AGENT_URL` no Railway.

---

## Self-Review

### Spec coverage check

| Requisito | Task que implementa |
|---|---|
| F1 — Login multi-usuário, 3 roles | Task 9, 10, 11 |
| F2 — Chat NL→SQL via Claude | Task 8, 13, 16, 17 |
| F3 — Multi-turn limitado a 5 trocas | Task 13 (trimmedHistory) |
| F4 — Glossário editável | Task 15, 18 |
| F5 — Favoritar + re-executar | Task 14, 17, 17 |
| F6 — Feedback +/- | Task 15, 16 |
| F7 — Admin gerencia usuários | Task 15, 18 |
| F8 — Refresh manual do catálogo | Task 6, 15, 18 |
| F9 — Testar conexão com agent | Task 15, 18 |
| NF1 — Single service Railway | Task 19, 20 |
| NF2 — AGENT_URL via env var | Task 5, 19, 20 |
| NF3 — Credenciais só no servidor | Task 10, 13 |
| NF4 — Streaming SSE | Task 8, 13, 16 |
| NF5 — Prompt caching | Task 7, 8 |
| NF6 — Boas práticas Sybase IQ | Task 7 |
| 13 tabelas mapeadas | Task 6 (CATALOG_TABLE_NAMES) |
| Schema com trim de espaços | Task 5 (agentListTables, agentGetSchema) |
