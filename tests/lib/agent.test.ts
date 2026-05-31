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
