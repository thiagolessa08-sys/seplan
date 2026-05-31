import { logger } from '@/lib/logger';
import type { QueryResult } from '@/types/domain';

function getBase(): string {
  const url = process.env.AGENT_URL;
  if (!url) throw new Error('AGENT_URL env var not set');
  return url.replace(/\/$/, '');
}

function getHeaders(): Record<string, string> {
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) throw new Error('AGENT_API_KEY env var not set');
  return {
    'X-API-Key': apiKey,
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
