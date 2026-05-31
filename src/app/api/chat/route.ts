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
