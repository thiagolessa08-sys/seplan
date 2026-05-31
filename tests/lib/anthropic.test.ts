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
