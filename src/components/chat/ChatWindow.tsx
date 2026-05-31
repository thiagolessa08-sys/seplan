// src/components/chat/ChatWindow.tsx
'use client';

import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { ChatMessage, QueryResult } from '@/types/domain';

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (question: string) => {
    const userMsg: ChatMessage = {
      id: nanoid(), role: 'user', content: question, createdAt: new Date(),
    };
    const assistantId = nanoid();
    const assistantMsg: ChatMessage = {
      id: assistantId, role: 'assistant', content: '', createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setLoading(true);

    const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history }),
      });

      if (!res.body) throw new Error('No stream body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const updateAssistant = (patch: Partial<ChatMessage>) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, ...patch } : m))
        );
      };

      let textAccum = '';
      let lastSql = '';
      let lastResult: QueryResult | undefined;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const raw of events) {
          const eventLine = raw.match(/^event: (.+)/m)?.[1];
          const dataLine = raw.match(/^data: (.+)/m)?.[1];
          if (!eventLine || !dataLine) continue;
          const data = JSON.parse(dataLine);

          if (eventLine === 'text') {
            textAccum += data.text;
            updateAssistant({ content: textAccum });
          } else if (eventLine === 'tool_start') {
            updateAssistant({ content: textAccum + '\n\n⏳ Consultando banco de dados...' });
          } else if (eventLine === 'sql') {
            lastSql = data.sql;
            updateAssistant({ sql: lastSql });
          } else if (eventLine === 'result') {
            lastResult = data as QueryResult;
            updateAssistant({ result: lastResult, content: textAccum });
          } else if (eventLine === 'done') {
            updateAssistant({ content: textAccum, sql: lastSql || undefined, result: lastResult });
          } else if (eventLine === 'error') {
            updateAssistant({ content: `Erro: ${data.message}` });
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: `Erro ao processar: ${(err as Error).message}` } : m
        )
      );
    } finally {
      setLoading(false);
    }
  }, [messages]);

  async function handleFeedback(msg: ChatMessage, rating: 'POSITIVE' | 'NEGATIVE') {
    if (!msg.sql) return;
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        naturalLanguage: messages.find((m) => m.role === 'user' && messages.indexOf(m) === messages.indexOf(msg) - 1)?.content ?? '',
        sql: msg.sql,
        rowCount: msg.result?.count,
      }),
    });
  }

  async function handleFavorite(msg: ChatMessage) {
    if (!msg.sql) return;
    const name = prompt('Nome para este favorito:');
    if (!name) return;
    const userMsg = messages[messages.indexOf(msg) - 1];
    await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        naturalLanguage: userMsg?.content ?? '',
        sql: msg.sql,
      }),
    });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <MessageList messages={messages} onFeedback={handleFeedback} onFavorite={handleFavorite} />
      <MessageInput onSend={send} loading={loading} />
    </div>
  );
}
