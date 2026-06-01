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

FATO_INTERVENCAO_DOTACAO — execução orçamentária (dotações, empenhos, liquidações, pagamentos)
  Medidas: VL_LEI_MAIS_CREDITO, VL_SALDO_MES_SUPLEMENTACAO, VL_SALDO_MES_REDUCAO,
           VL_SALDO_PRE_EMPENHO, VL_SALDO_MES_EMPENHADO, VL_SALDO_MES_LIQUIDADO,
           VL_SALDO_MES_PAGO, VL_SALDO_ACRESCIMO_DESCENTRALIZACAO, VL_SALDO_REDUCAO_DESCENTRALIZACAO
  Flags:   IC_ORIGEM_DADOS (char 1), IC_CONVERSAO (char 1)
  INNER JOIN DIM_DATA_CALENDARIO     ON FATO_INTERVENCAO_DOTACAO.SK_DATA_CALENDARIO     = DIM_DATA_CALENDARIO.SK_DATA_CALENDARIO
  INNER JOIN DIM_UNIDADE_GESTORA     ON FATO_INTERVENCAO_DOTACAO.SK_UNIDADE_GESTORA     = DIM_UNIDADE_GESTORA.SK_UNIDADE_GESTORA
  INNER JOIN DIM_FONTE_RECURSO       ON FATO_INTERVENCAO_DOTACAO.SK_FONTE_RECURSO       = DIM_FONTE_RECURSO.SK_FONTE_RECURSO
  INNER JOIN DIM_NATUREZA_DESPESA    ON FATO_INTERVENCAO_DOTACAO.SK_NATUREZA_DESPESA    = DIM_NATUREZA_DESPESA.SK_NATUREZA_DESPESA
  INNER JOIN DIM_SUBACAO             ON FATO_INTERVENCAO_DOTACAO.SK_SUBACAO             = DIM_SUBACAO.SK_SUBACAO
  INNER JOIN DIM_INSTITUCIONAL       ON FATO_INTERVENCAO_DOTACAO.SK_INSTITUCIONAL       = DIM_INSTITUCIONAL.SK_INSTITUCIONAL
  INNER JOIN DIM_FORNECEDOR          ON FATO_INTERVENCAO_DOTACAO.SK_FORNECEDOR          = DIM_FORNECEDOR.SK_FORNECEDOR
  INNER JOIN DIM_EMENDA_PARLAMENTAR  ON FATO_INTERVENCAO_DOTACAO.SK_EMENDA_PARLAMENTAR  = DIM_EMENDA_PARLAMENTAR.SK_EMENDA_PARLAMENTAR
  INNER JOIN DIM_GRUPO_PROG_FINANCEIRA ON FATO_INTERVENCAO_DOTACAO.SK_GRUPO_PROG_FINANCEIRA = DIM_GRUPO_PROG_FINANCEIRA.SK_GRUPO_PROG_FINANCEIRA

FATO_EXECUCAO_RECEITA — arrecadação e deduções de receita
  Medidas: VL_ARRECADACAO_RECEITA, VL_DEDUCOES_ORCAMENTARIA, VL_DEDUCOES_FUNDEB,
           VL_DEDUCOES_TRANSF_CONST_LEGAIS, VL_DEDUCOES_TRANSF_CONST_LEGAIS_MUNICIPIOS,
           VL_DEDUCOES_RENUNCIA, VL_OUTRAS_DEDUCOES_RECEITA_REALIZADA
  INNER JOIN DIM_DATA_CALENDARIO  ON FATO_EXECUCAO_RECEITA.SK_DATA_CALENDARIO  = DIM_DATA_CALENDARIO.SK_DATA_CALENDARIO
  INNER JOIN DIM_UNIDADE_GESTORA  ON FATO_EXECUCAO_RECEITA.SK_UNIDADE_GESTORA  = DIM_UNIDADE_GESTORA.SK_UNIDADE_GESTORA
  INNER JOIN DIM_FONTE_RECURSO    ON FATO_EXECUCAO_RECEITA.SK_FONTE_RECURSO    = DIM_FONTE_RECURSO.SK_FONTE_RECURSO
  INNER JOIN DIM_NATUREZA_RECEITA ON FATO_EXECUCAO_RECEITA.SK_NATUREZA_RECEITA = DIM_NATUREZA_RECEITA.SK_NATUREZA_RECEITA

FATO_REPASSE_FINANCEIRO — repasses entre unidades gestoras
  Medidas: VL_REPASSE_RECEBIDO, VL_REPASSE_A_UTILIZAR, VL_REPASSE_UTILIZADO,
           VL_REPASSE_A_SOLICITAR, VL_REPASSE_SOLICITADO, VL_REPASSE_DEVOLVIDO
  Flags:   IC_CONVERSAO (char 1)
  INNER JOIN DIM_DATA_CALENDARIO       ON FATO_REPASSE_FINANCEIRO.SK_DATA_CALENDARIO       = DIM_DATA_CALENDARIO.SK_DATA_CALENDARIO
  INNER JOIN DIM_UNIDADE_GESTORA       ON FATO_REPASSE_FINANCEIRO.SK_UNIDADE_GESTORA       = DIM_UNIDADE_GESTORA.SK_UNIDADE_GESTORA
  INNER JOIN DIM_GRUPO_PROG_FINANCEIRA ON FATO_REPASSE_FINANCEIRO.SK_GRUPO_PROG_FINANCEIRA = DIM_GRUPO_PROG_FINANCEIRA.SK_GRUPO_PROG_FINANCEIRA
  INNER JOIN DIM_FONTE_RECURSO         ON FATO_REPASSE_FINANCEIRO.SK_FONTE_RECURSO         = DIM_FONTE_RECURSO.SK_FONTE_RECURSO

DESCRITORES-CHAVE DAS DIMENSÕES:
  DIM_DATA_CALENDARIO     → NO_ANO, NO_MES, DS_MES, NO_ANO_MES (YYYYMM), NO_TRIMESTRE_ANO, NO_SEMESTRE_ANO
  DIM_UNIDADE_GESTORA     → CD_UNIDADE_GESTORA, DS_UNIDADE_GESTORA, NR_CNPJ_UNIDADE_GESTORA
  DIM_INSTITUCIONAL       → CD_ORGAO, DS_ORGAO, DS_ORGAO_MNEMONICO, CD_UO, DS_UO, DS_UO_MNEMONICO, IC_ADMINISTRACAO
  DIM_FONTE_RECURSO       → CD_FONTE_RECURSO, DS_FONTE_RECURSO, CD_GRUPO_FONTE, DS_GRUPO_FONTE, DS_ESPECIFICACAO_FONTE
  DIM_NATUREZA_DESPESA    → CD_NATUREZA_DESPESA, DS_NATUREZA_DESPESA, CD_SUB_ELEMENTO_DESPESA, DS_SUB_ELEMENTO_DESPESA
  DIM_SUBACAO             → CD_SUBACAO, DS_TITULO_SUBACAO, CD_PROGRAMA_TRABALHO, DS_ESFERA_ORCAMENTARIA, DS_STATUS_SUBACAO
  DIM_FORNECEDOR          → CD_FORNECEDOR, DS_FORNECEDOR, CD_CPF_CNPJ_FORNECEDOR, DS_TIPO_FORNECEDOR, DS_NATUREZA_FORNECEDOR
  DIM_EMENDA_PARLAMENTAR  → CD_EMENDA_PARLAMENTAR, NM_EMENDA_PARLAMENTAR, NO_ANO
  DIM_GRUPO_PROG_FINANCEIRA → CD_GRUPO, DS_GRUPO, DET_GRUPO, NO_ANO
  DIM_NATUREZA_RECEITA    → CD_NATUREZA_RECEITA, DS_NATUREZA_RECEITA, DS_CATEGORIA_ECONOMICA_RECEITA,
                            DS_ORIGEM_RECEITA, DS_ESPECIE_RECEITA, DS_RUBRICA_RECEITA, DS_ALINEA_RECEITA`;

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
