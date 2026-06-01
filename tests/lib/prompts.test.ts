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
    includedInContext: false,
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
