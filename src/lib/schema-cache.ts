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
  const filtered = allTables.filter((t) => catalogSet.has(t.name.toUpperCase()));

  const tables: TableSchema[] = await Promise.all(
    filtered.map(async (t) => {
      const normalizedName = t.name.toUpperCase();
      const columns = await agentGetSchema(normalizedName);
      const prefKey = `${DEFAULT_SCHEMA}.${normalizedName}`;
      const includedInContext = prefMap.get(prefKey) ?? true;
      return {
        name: normalizedName,
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
