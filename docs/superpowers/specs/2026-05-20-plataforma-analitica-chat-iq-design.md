# Plataforma Analítica com Chat IQ — Design (Fase 1: Estrutura e Conexão)

**Data:** 2026-05-20
**Status:** Aprovado pelo usuário, pendente de revisão final
**Escopo desta fase:** Arquitetura, conexão com o banco, modelo de dados, orquestração do chat, deploy. UI/dashboards/análises ficam para Fase 2.

---

## 1. Contexto e objetivo

Construir uma plataforma analítica web hospedada no Railway que permite a servidores da Prefeitura de Arujá-SP fazer perguntas em linguagem natural sobre dados do banco Sybase IQ 16, com respostas geradas via LLM (Claude da Anthropic) que traduz português para SQL, executa via um agent HTTP intermediário e devolve resultados em tabela + explicação.

A plataforma também precisa permitir que administradores ensinem ao LLM regras de negócio específicas do domínio (glossário editável).

## 2. Requisitos confirmados

### 2.1 Funcionais

- **F1** — Login multi-usuário com três níveis de permissão: ADMIN, ANALYST, VIEWER.
- **F2** — Chat em linguagem natural que gera SQL via Claude, executa no Sybase IQ via agent, mostra resultados.
- **F3** — Suporte a conversa multi-turn limitado às últimas 5 trocas (sem persistência de histórico).
- **F4** — Glossário editável por admin (texto livre em markdown) injetado no system prompt do Claude.
- **F5** — Usuário pode favoritar uma pergunta/resposta dando nome a ela. Favoritos podem ser re-executados.
- **F6** — Usuário pode dar feedback positivo/negativo em respostas, com comentário opcional.
- **F7** — Admin pode gerenciar usuários (criar, desativar, atribuir role).
- **F8** — Admin pode disparar refresh manual do catálogo de schema do Sybase.
- **F9** — Admin pode testar conexão com o agent via botão.

### 2.2 Não-funcionais

- **NF1** — Deploy single-service no Railway (Next.js + Postgres addon).
- **NF2** — `AGENT_URL` editável em runtime via env var (tunnel Cloudflare muda periodicamente).
- **NF3** — Nenhuma credencial sensível chega ao browser.
- **NF4** — Streaming de respostas para UX fluida.
- **NF5** — Prompt caching do Claude para reduzir custo (target: >85% cache hit rate).
- **NF6** — Boas práticas Sybase IQ obrigatoriamente seguidas pelo LLM (columnar, sem UPPER() em colunas, TOP em vez de LIMIT, etc.).

### 2.3 Fora de escopo (Fase 1)

- Telas analíticas (dashboards com gráficos pré-prontos)
- Anotações por tabela/coluna (apenas glossário geral nesta fase)
- Persistência de histórico de chat
- Log de auditoria estruturado de queries
- Rate limiting por usuário
- Timeout customizado por query (apenas o limite do agent)
- Preview do SQL antes de executar
- APM externo / observabilidade avançada

## 3. Arquitetura

### 3.1 Diagrama de alto nível

```
┌─────────────────────────────────────────┐
│        Browser (React/Next.js UI)       │
│  • Login                                │
│  • Chat                                 │
│  • Favoritos                            │
│  • Admin (usuários + glossário + sys)   │
└────────────────┬────────────────────────┘
                 │ HTTPS
┌────────────────▼────────────────────────┐
│     Next.js Server (API Routes)         │
│  • /api/auth/*    (Auth.js)             │
│  • /api/chat      (orquestra Claude)    │
│  • /api/favorites                       │
│  • /api/feedback                        │
│  • /api/admin/*                         │
└──┬──────────────┬───────────────────┬───┘
   │ Anthropic    │ HTTPS + API Key   │ Prisma
   │ SDK          │                   │
┌──▼────────┐ ┌───▼──────────────┐ ┌──▼──────────────┐
│ Claude    │ │ Java Agent       │ │ Postgres        │
│ API       │ │ (Cloudflare URL) │ │ (Railway addon) │
│           │ │ → Sybase IQ 16   │ │                 │
└───────────┘ └──────────────────┘ └─────────────────┘
```

### 3.2 Princípios arquiteturais

- **Single deployable**: Next.js full-stack — frontend (React) e backend (API routes) no mesmo serviço.
- **Browser isolado de credenciais**: toda comunicação com Claude/Agent/DB passa pelo Next.js server.
- **Clientes externos isolados em `lib/`**: cada integração (Anthropic, Agent, DB) tem cliente próprio com interface bem definida, mockável em testes.
- **Rotas API finas**: validam entrada, delegam para `lib/`, retornam saída. Sem lógica de negócio.

## 4. Stack técnica

| Camada | Tecnologia | Versão alvo |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Linguagem | TypeScript | 5.x |
| UI | Tailwind CSS + shadcn/ui | latest |
| Auth | Auth.js (NextAuth) | v5 |
| ORM | Prisma | 6.x |
| DB aplicação | Postgres | 16 (Railway) |
| LLM SDK | @anthropic-ai/sdk | latest |
| Modelo padrão | claude-sonnet-4-6 | configurável |
| Logger | pino | 9.x |
| Markdown | react-markdown + rehype-sanitize | latest |

## 5. Estrutura de pastas

```
seplan/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (app)/                       # área autenticada
│   │   │   ├── layout.tsx               # sidebar + topbar
│   │   │   ├── chat/page.tsx
│   │   │   ├── favoritos/page.tsx
│   │   │   └── admin/
│   │   │       ├── usuarios/page.tsx
│   │   │       ├── glossario/page.tsx
│   │   │       ├── catalogo/page.tsx
│   │   │       └── sistema/page.tsx     # health-check do agent
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── chat/route.ts            # POST: stream da resposta
│   │       ├── favorites/route.ts       # GET, POST
│   │       ├── favorites/[id]/route.ts  # GET, PATCH, DELETE
│   │       ├── favorites/[id]/execute/route.ts
│   │       ├── feedback/route.ts        # POST
│   │       └── admin/
│   │           ├── users/route.ts
│   │           ├── users/[id]/route.ts
│   │           ├── glossary/route.ts
│   │           ├── schema/route.ts      # GET catálogo
│   │           ├── schema/refresh/route.ts
│   │           └── agent/health/route.ts
│   ├── lib/
│   │   ├── agent.ts                     # cliente do Java Agent
│   │   ├── anthropic.ts                 # cliente Claude + tools
│   │   ├── schema-cache.ts              # cache em memória do catálogo
│   │   ├── prompts.ts                   # blocos do system prompt
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── auth.ts                      # config do Auth.js
│   │   └── logger.ts                    # pino
│   ├── components/
│   │   ├── chat/
│   │   ├── ui/                          # shadcn primitives
│   │   └── layout/
│   └── types/
│       └── domain.ts
├── .env.example
├── next.config.ts
├── package.json
└── tsconfig.json
```

## 6. Modelo de dados (Postgres)

```prisma
// prisma/schema.prisma

generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

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
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name              String
  naturalLanguage   String
  sql               String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([userId])
}

model Feedback {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating            Rating
  comment           String?
  naturalLanguage   String
  sql               String
  rowCount          Int?
  createdAt         DateTime @default(now())

  @@index([rating, createdAt])
}

enum Rating {
  POSITIVE
  NEGATIVE
}

model Glossary {
  id          Int      @id @default(1)   // singleton row
  content     String   @default("")      // markdown
  updatedBy   String?
  updatedAt   DateTime @updatedAt
}

model SchemaTablePref {
  schemaName        String
  tableName         String
  includedInContext Boolean  @default(true)
  updatedAt         DateTime @updatedAt

  @@id([schemaName, tableName])
}
```

### 6.1 Notas sobre o modelo

- **Sem `ChatMessage`**: histórico de chat vive no estado do browser (zustand ou React state). Quando recarrega, perde.
- **`Glossary` é singleton**: linha única (id=1) com bloco de texto editável por admin.
- **`Feedback` guarda pergunta + SQL** mesmo sem chat history — admin usa para identificar erros recorrentes e melhorar o glossário.
- **Cascade no delete de User**: remove favoritos e feedbacks junto (LGPD).
- **Sem soft-delete**: `User.active = false` para desativar, preservando dados de feedback.
- **`SchemaTablePref`**: persiste a decisão de inclusão/exclusão de cada tabela do contexto do Claude. Sem essa tabela, a configuração se perderia em cada restart do serviço.

### 6.2 Seed inicial

`prisma/seed.ts` cria:
- Um usuário ADMIN a partir de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
- Uma linha em `Glossary` com `content = ""`.

## 7. Conexão com o Sybase IQ via agent

### 7.1 Cliente do agent (`lib/agent.ts`)

Wrapper sobre `fetch` que aplica `AGENT_URL` e `AGENT_API_KEY` lidos do env. Interface:

```typescript
export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  count: number;
  truncated: boolean;
}

export interface AgentClient {
  health(): Promise<{ ok: boolean; database: string }>;
  listTables(): Promise<TableRef[]>;
  getTableSchema(table: string): Promise<ColumnInfo[]>;
  runQuery(sql: string, limit?: number): Promise<QueryResult>;
}
```

### 7.2 Cache de catálogo (`lib/schema-cache.ts`)

- **Estratégia**: lazy load na primeira request, refresh manual via admin, TTL de 24h.
- **Escopo**: descobre tudo que o **usuário Sybase configurado no agent** consegue ver (não fica hardcoded em `pref_aruja_sp`).
- **Query de descoberta**: usa `sys.systable` filtrado por permissões do current user (via `sys.systabauth`).
- **Persistência**: o cache vive em memória; a decisão de inclusão/exclusão por tabela vive em `SchemaTablePref` no Postgres. No load do cache, a flag `includedInContext` é cruzada com a tabela de preferências.

```typescript
type ColumnInfo = { name: string; type: string; nullable: boolean };
type TableInfo  = { schema: string; name: string; type: 'BASE' | 'VIEW'; columns: ColumnInfo[]; includedInContext: boolean };

let cache: { tables: TableInfo[]; loadedAt: Date } | null = null;
const TTL_MS = (Number(process.env.SCHEMA_CACHE_TTL_HOURS) || 24) * 60 * 60 * 1000;

export async function getSchema(): Promise<TableInfo[]> { /* ... */ }
export async function refreshSchema(): Promise<TableInfo[]> { /* ... */ }
export async function setTableInclusion(schema: string, name: string, included: boolean): Promise<void> { /* ... */ }
```

### 7.3 Atividade pós-deploy: setup do catálogo

Após a primeira conexão estar funcionando, o admin executa três etapas:

1. **Validar conexão** em `/admin/sistema` → `GET /health` no agent.
2. **Descobrir catálogo** em `/admin/catalogo` → dispara `refreshSchema()`.
3. **Revisar e ajustar** — marcar tabelas como `includedInContext = false` para tabelas internas que o Claude não deve enxergar.

Tabelas com `includedInContext = false` ficam de fora do system prompt mas continuam acessíveis se o Claude pedir explicitamente via `sample_table` (que valida acesso pelo agent).

## 8. Orquestração do chat

### 8.1 System prompt em blocos cacheados

Cinco blocos no total — quatro cacheados independentemente e um não-cacheado:

1. **Bloco A — Instruções gerais** (cached, raramente muda): role do assistente, regras gerais, descrição das tools.
2. **Bloco B — Boas práticas Sybase IQ 16** (cached, raramente muda): regras específicas do banco columnar (ver seção 8.2).
3. **Bloco C — Catálogo do banco** (cached, refresh diário): tabelas + colunas + tipos + nullables das tabelas marcadas como `includedInContext = true`.
4. **Bloco D — Glossário do admin** (cached, muda quando admin edita): conteúdo bruto da `Glossary.content`.
5. **Histórico recente** (não cacheado): últimas 5 trocas da sessão atual.

Target de cache hit: >85% em produção (perguntas em sequência reaproveitam A+B+C+D).

### 8.2 Boas práticas Sybase IQ no prompt

```
Sybase IQ é um banco COLUNAR (column-store). Otimize queries pensando em
colunas, não linhas. Regras obrigatórias:

PERFORMANCE
- Sybase IQ é altamente sensível a uso de funções em colunas. NUNCA envolva
  colunas indexadas em UPPER(), LOWER(), CAST(), SUBSTRING() no WHERE/JOIN —
  isso impede o uso de índices HG/LF/HNG e força full scan.
  ❌ WHERE UPPER(nome) = 'JOÃO'
  ✅ WHERE nome = 'João'   (use o case correto do dado)
- NUNCA use SELECT *. Liste apenas as colunas necessárias.
- Use TOP N (não LIMIT). Paginação: TOP N START AT M.

SINTAXE
- Datas no formato 'YYYY-MM-DD'. Use DATE('2024-01-01') para literais.
- Strings com aspas simples. Aspas duplas são para identificadores.
- Use JOINs ANSI explícitos (INNER JOIN ... ON), não vírgulas no FROM.
- COUNT(*) é otimizado em IQ; prefira a COUNT(coluna).

AGREGAÇÕES E ANALYTICS
- GROUP BY pode usar posição (GROUP BY 1, 2) ou nome de coluna.
- Funções de janela (OVER) suportadas: ROW_NUMBER(), RANK(), SUM() OVER...
- Para top-N por grupo, use ROW_NUMBER() OVER (PARTITION BY ...).

CUIDADOS
- NULL: use IS NULL / IS NOT NULL, nunca = NULL.
- DIVISION BY ZERO retorna NULL em IQ (não erro). Use NULLIF se quiser controlar.
```

> Esse bloco é a **base mínima**. O glossário do admin complementa com regras específicas do domínio da prefeitura.

### 8.3 Tools expostas ao Claude

```typescript
const tools = [
  {
    name: "sample_table",
    description: "Retorna 5 linhas de exemplo de uma tabela para entender os dados reais antes de gerar a query final.",
    input_schema: {
      type: "object",
      properties: { table: { type: "string", description: "schema.tabela" } },
      required: ["table"],
    },
  },
  {
    name: "run_query",
    description: "Executa a query SELECT final no banco e retorna os resultados.",
    input_schema: {
      type: "object",
      properties: {
        sql: { type: "string" },
        limit: { type: "number", default: 100 },
      },
      required: ["sql"],
    },
  },
];
```

Ambas as tools, no backend, chamam `POST {AGENT_URL}/query` com `X-API-Key`.

### 8.4 Fluxo de uma pergunta

1. Browser envia `POST /api/chat` com `{ question, history }`.
2. Server valida sessão e role (`VIEWER` rejeitado).
3. Server carrega `schema` (do cache) e `glossary` (do DB).
4. Server monta mensagens com os 4 blocos cacheados + histórico + pergunta.
5. Server chama Claude com `tools` e `stream: true`.
6. Loop de tool use até o Claude retornar resposta final.
7. Server faz stream da resposta (texto + sql + tabela) via Server-Sent Events.
8. Browser renderiza incrementalmente e oferece 👍/👎 ⭐.

### 8.5 Streaming

- Resposta SSE com eventos: `text` (chunks de texto), `tool_use` (status "consultando banco..."), `sql` (SQL final), `result` (`columns + rows + truncated`), `done`.
- Frontend usa `fetch` com `ReadableStream` reader.

## 9. Roles e autorização

| Endpoint | ADMIN | ANALYST | VIEWER |
|---|---|---|---|
| `POST /api/chat` | ✅ | ✅ | ❌ |
| `GET /api/favorites` | ✅ (próprios) | ✅ (próprios) | ✅ (próprios) |
| `POST /api/favorites` | ✅ | ✅ | ❌ |
| `POST /api/favorites/:id/execute` | ✅ | ✅ | ✅ |
| `POST /api/feedback` | ✅ | ✅ | ✅ |
| `GET /api/admin/users` | ✅ | ❌ | ❌ |
| `POST /api/admin/users` | ✅ | ❌ | ❌ |
| `PUT /api/admin/glossary` | ✅ | ❌ | ❌ |
| `POST /api/admin/schema/refresh` | ✅ | ❌ | ❌ |
| `GET /api/admin/agent/health` | ✅ | ❌ | ❌ |

VIEWER, portanto, só consome favoritos pré-criados por outros. Não vê o SQL gerado, não cria queries livres.

## 10. Deploy no Railway

### 10.1 Serviços

```
Railway Project: seplan
├── Service: web (Next.js)
│   ├── Source: GitHub repo (auto-deploy no push)
│   ├── Build: npm ci && npx prisma generate && npx prisma migrate deploy && npm run build
│   ├── Start: npm start
│   └── Env vars: ver seção 10.2
└── Service: postgres (Railway plugin)
    └── DATABASE_URL injetado automaticamente em "web"
```

### 10.2 Variáveis de ambiente

```bash
# Agent HTTP (Java Agent → Sybase IQ)
AGENT_URL=https://<cloudflare-tunnel>.trycloudflare.com
AGENT_API_KEY=chave123abc456def789

# LLM
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Postgres (Railway injeta)
DATABASE_URL=postgresql://...

# Auth.js
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://seplan.up.railway.app

# Seed do admin inicial
SEED_ADMIN_EMAIL=admin@aruja.sp.gov.br
SEED_ADMIN_PASSWORD=<senha forte; trocar após primeiro login>

# Operacionais (com defaults)
SCHEMA_CACHE_TTL_HOURS=24
DEFAULT_QUERY_LIMIT=100
CHAT_HISTORY_MAX_TURNS=5
```

### 10.3 Procedimento quando a `AGENT_URL` muda

1. Java Agent reinicia → nova URL Cloudflare no log do agent.
2. Railway dashboard → editar var `AGENT_URL` no serviço web.
3. Railway faz restart automático (~30s).
4. Sem deploy de código.
5. Admin valida em `/admin/sistema` (botão "Testar conexão").

## 11. Segurança

| Camada | Mecanismo |
|---|---|
| Browser → Next.js | HTTPS (SSL do Railway); sessão JWT (Auth.js) |
| Next.js → Agent | HTTPS + `X-API-Key` header |
| Next.js → Claude | HTTPS + Bearer token (SDK oficial) |
| Next.js → Postgres | TLS forçado pelo Railway |
| Senhas | bcrypt cost 12 |
| Autorização | Middleware checa role por endpoint |
| SQL injection | Agent bloqueia DDL/DML server-side; só SELECT |
| XSS | React escapa por padrão; markdown via react-markdown + rehype-sanitize |
| CSRF | Auth.js double-submit cookie em rotas mutadoras |
| Headers | CSP, X-Frame-Options DENY, HSTS, Referrer-Policy no-referrer (next.config.ts) |

Mensagens de erro do banco/agent **nunca** chegam ao browser — log estruturado no servidor, mensagem genérica para o cliente.

## 12. Observabilidade

- Logger estruturado JSON com `pino` → Railway captura stdout.
- Para cada `POST /api/chat`, log: `userId, naturalLanguage, model, toolsInvoked[], inputTokens, cachedInputTokens, outputTokens, latencyMs, ok`.
- Sem APM externo nesta fase.

## 13. Estimativa de custos mensais

| Item | Custo |
|---|---|
| Railway web (Hobby/Pro) | $5-20 |
| Railway Postgres | $5 |
| Claude API (~100 perguntas/dia, com prompt caching) | $10-30 |
| Cloudflare Tunnel | $0 |
| **Total** | **$20-55/mês** |

## 14. Catálogo de tabelas mapeadas (escopo do Chat IQ)

Banco: **DWPROD16** | Usuário agent: **iaapi** | Tunnel: variável de ambiente `AGENT_URL`

Total: **13 tabelas** (3 fatos + 10 dimensões) de um universo de 1.388 objetos no banco.

### Tabelas FATO

#### FATO_INTERVENCAO_DOTACAO
Execução orçamentária: dotação, empenho, liquidação, pagamento.
| Coluna | Tipo | Descrição |
|---|---|---|
| ID_FATO | integer NOT NULL | Chave primária |
| SK_DATA_CALENDARIO | integer | → DIM_DATA_CALENDARIO |
| SK_UNIDADE_GESTORA | integer | → DIM_UNIDADE_GESTORA |
| SK_FONTE_RECURSO | integer | → DIM_FONTE_RECURSO |
| SK_NATUREZA_DESPESA | integer | → DIM_NATUREZA_DESPESA |
| SK_SUBACAO | integer | → DIM_SUBACAO |
| SK_INSTITUCIONAL | integer | → DIM_INSTITUCIONAL |
| SK_FORNECEDOR | integer | → DIM_FORNECEDOR |
| SK_EMENDA_PARLAMENTAR | integer | → DIM_EMENDA_PARLAMENTAR |
| SK_GRUPO_PROG_FINANCEIRA | integer | → DIM_GRUPO_PROG_FINANCEIRA |
| VL_SALDO_MES_REDUCAO | numeric | Valor redução no mês |
| VL_SALDO_MES_SUPLEMENTACAO | numeric | Valor suplementação no mês |
| VL_SALDO_MES_EMPENHADO | numeric | Valor empenhado no mês |
| VL_SALDO_MES_LIQUIDADO | numeric | Valor liquidado no mês |
| VL_SALDO_MES_PAGO | numeric | Valor pago no mês |
| VL_SALDO_ACRESCIMO_DESCENTRALIZACAO | numeric | Acréscimo por descentralização |
| VL_SALDO_REDUCAO_DESCENTRALIZACAO | numeric | Redução por descentralização |
| VL_SALDO_PRE_EMPENHO | numeric | Valor pré-empenhado |
| VL_LEI_MAIS_CREDITO | numeric | Dotação: lei + créditos adicionais |
| IC_ORIGEM_DADOS | char | Indicador de origem dos dados |
| IC_CONVERSAO | char | Indicador de conversão |
| DT_INCLUSAO_BI | timestamp | Data de carga no BI |

#### FATO_EXECUCAO_RECEITA
Arrecadação e deduções de receita orçamentária.
| Coluna | Tipo | Descrição |
|---|---|---|
| ID_FATO | integer NOT NULL | Chave primária |
| SK_DATA_CALENDARIO | integer | → DIM_DATA_CALENDARIO |
| SK_UNIDADE_GESTORA | integer | → DIM_UNIDADE_GESTORA |
| SK_FONTE_RECURSO | integer | → DIM_FONTE_RECURSO |
| SK_NATUREZA_RECEITA | integer | → DIM_NATUREZA_RECEITA |
| VL_ARRECADACAO_RECEITA | numeric | Valor arrecadado |
| VL_DEDUCOES_ORCAMENTARIA | numeric | Total deduções orçamentárias |
| VL_DEDUCOES_TRANSF_CONST_LEGAIS_MUNICIPIOS | numeric | Transferências constitucionais a municípios |
| VL_DEDUCOES_FUNDEB | numeric | Dedução FUNDEB |
| VL_DEDUCOES_TRANSF_CONST_LEGAIS | numeric | Outras transferências constitucionais |
| VL_DEDUCOES_RENUNCIA | numeric | Renúncia de receita |
| VL_OUTRAS_DEDUCOES_RECEITA_REALIZADA | numeric | Outras deduções |
| DT_INCLUSAO_BI | timestamp | Data de carga no BI |
| DT_ULTIMA_ALTERACAO_BI | timestamp | Última alteração no BI |

#### FATO_REPASSE_FINANCEIRO
Repasses financeiros recebidos, utilizados e devolvidos.
| Coluna | Tipo | Descrição |
|---|---|---|
| SK_DATA_CALENDARIO | integer | → DIM_DATA_CALENDARIO |
| SK_UNIDADE_GESTORA | integer | → DIM_UNIDADE_GESTORA |
| SK_GRUPO_PROG_FINANCEIRA | integer | → DIM_GRUPO_PROG_FINANCEIRA |
| SK_FONTE_RECURSO | integer | → DIM_FONTE_RECURSO |
| VL_REPASSE_RECEBIDO | decimal | Valor recebido |
| VL_REPASSE_A_UTILIZAR | decimal | Saldo a utilizar |
| VL_REPASSE_UTILIZADO | decimal | Valor utilizado |
| VL_REPASSE_A_SOLICITAR | decimal | Valor a solicitar |
| VL_REPASSE_SOLICITADO | decimal | Valor solicitado |
| VL_REPASSE_DEVOLVIDO | decimal | Valor devolvido |
| DT_INCLUSAO_BI | timestamp | Data de carga |
| DT_ALTERACAO_BI | timestamp | Última alteração |

### Dimensões

| Tabela | SK | Principais colunas descritivas |
|---|---|---|
| DIM_DATA_CALENDARIO | SK_DATA_CALENDARIO | NO_ANO, NO_MES, DS_MES, NO_DIA_MES, NO_TRIMESTRE_ANO, NO_SEMESTRE_ANO |
| DIM_UNIDADE_GESTORA | SK_UNIDADE_GESTORA | CD_UNIDADE_GESTORA, DS_UNIDADE_GESTORA, CD_ORGAO |
| DIM_FONTE_RECURSO | SK_FONTE_RECURSO | CD_FONTE_RECURSO, DS_FONTE_RECURSO, DS_GRUPO_FONTE |
| DIM_NATUREZA_DESPESA | SK_NATUREZA_DESPESA | CD_NATUREZA_DESPESA, DS_NATUREZA_DESPESA, DS_SUB_ELEMENTO_DESPESA |
| DIM_SUBACAO | SK_SUBACAO | CD_SUBACAO, DS_TITULO_SUBACAO, CD_ORGAO, DS_ESFERA_ORCAMENTARIA |
| DIM_INSTITUCIONAL | SK_INSTITUCIONAL | CD_ORGAO, DS_ORGAO, CD_UO, DS_UO, DS_PODER, DS_TIPO_ADMINISTRACAO |
| DIM_FORNECEDOR | SK_FORNECEDOR | CD_FORNECEDOR, DS_FORNECEDOR, CD_CPF_CNPJ_FORNECEDOR, DS_TIPO_FORNECEDOR |
| DIM_EMENDA_PARLAMENTAR | SK_EMENDA_PARLAMENTAR | CD_EMENDA_PARLAMENTAR, NM_EMENDA_PARLAMENTAR, FL_STATUS |
| DIM_GRUPO_PROG_FINANCEIRA | SK_GRUPO_PROG_FINANCEIRA | CD_GRUPO, DS_GRUPO, DET_GRUPO |
| DIM_NATUREZA_RECEITA | SK_NATUREZA_RECEITA | CD_NATUREZA_RECEITA, DS_NATUREZA_RECEITA, DS_CATEGORIA_ECONOMICA_RECEITA, DS_ORIGEM_RECEITA |

### Convenções de nomenclatura (para o glossário do LLM)
- `SK_*` — surrogate key (chave de junção entre fato e dimensão)
- `CD_*` — código do atributo
- `DS_*` — descrição textual do atributo
- `NO_*` — número (ex.: NO_ANO = ano, NO_MES = mês)
- `VL_*` — valor monetário (numeric/decimal)
- `DT_*` — data/timestamp
- `IC_*` — indicador/flag (geralmente CHAR 1: 'S'/'N' ou similares)
- `FL_*` — flag
- `NR_*` — número de identificação
- `NM_*` — nome

## 15. Fora de escopo nesta fase (Fase 2 e além)

- **Fase 2 — UI e análises**: design das telas, dashboards com gráficos pré-prontos, escolha de paleta/branding, mockups detalhados.
- Anotações por tabela/coluna (granularidade fina do "ensino").
- Histórico de chat persistido.
- Log de auditoria estruturado de todas as queries.
- Rate limiting por usuário.
- Timeout customizado por query.
- Preview do SQL antes de executar (toggle para analistas).
- Few-shot learning (exemplos curados pergunta → SQL).
- Exportação de resultados (CSV, Excel, PDF).
- Compartilhamento público de favoritos via link.
