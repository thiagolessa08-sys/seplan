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

  // Tool-use loop (Claude may call tools multiple times)
  for (let round = 0; round < 5; round++) {
    const textParts: string[] = [];

    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: options.systemBlocks as unknown as MessageParam['content'],
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
    const toolUseBlocks: ContentBlock[] = allBlocks.filter((b) => b.type === 'tool_use');

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
