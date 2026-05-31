import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/agent', () => ({
  agentListTables: vi.fn(),
  agentGetSchema: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: { schemaTablePref: { findMany: vi.fn().mockResolvedValue([]) } },
}));

import { agentListTables, agentGetSchema } from '@/lib/agent';
import { getSchema, refreshSchema, CATALOG_TABLE_NAMES, invalidateCache } from '@/lib/schema-cache';

const mockListTables = vi.mocked(agentListTables);
const mockGetSchema = vi.mocked(agentGetSchema);

const fakeCols = [{ name: 'ID', type: 'integer', nullable: false }];

beforeEach(() => {
  invalidateCache();
  mockListTables.mockResolvedValue(
    CATALOG_TABLE_NAMES.map((name) => ({ name, type: 'BASE' }))
  );
  mockGetSchema.mockResolvedValue(fakeCols);
});

describe('refreshSchema', () => {
  it('only loads CATALOG tables', async () => {
    mockListTables.mockResolvedValueOnce([
      { name: 'FATO_INTERVENCAO_DOTACAO', type: 'BASE' },
      { name: 'STG_SOME_STAGING_TABLE', type: 'BASE' },
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
