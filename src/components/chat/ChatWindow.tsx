'use client';

import { useState, useCallback } from 'react';
import { nanoid } from 'nanoid';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { ChatMessage, QueryResult } from '@/types/domain';
import {
  MessageSquare,
  Plus,
  CreditCard,
  BarChart2,
  TrendingUp,
  Layers,
} from 'lucide-react';

const SUGGESTIONS = [
  {
    q: 'Qual o orçamento total previsto para o exercício de 2026?',
    title: 'Orçamento total de 2026',
    desc: 'Qual o valor previsto para o exercício?',
    icon: CreditCard,
    gradient: 'linear-gradient(135deg,var(--ma-blue),var(--ma-navy))',
  },
  {
    q: 'Mostre os 5 órgãos com maior despesa executada no ano.',
    title: 'Maiores despesas por órgão',
    desc: 'Os 5 órgãos com maior execução.',
    icon: BarChart2,
    gradient: 'linear-gradient(135deg,var(--ma-green),var(--ma-green2))',
  },
  {
    q: 'Compare a receita prevista e a arrecadada no último trimestre.',
    title: 'Receita prevista × arrecadada',
    desc: 'Comparativo do último trimestre.',
    icon: TrendingUp,
    gradient: 'linear-gradient(135deg,var(--ma-orange),var(--ma-yellow))',
  },
  {
    q: 'Quais programas tiveram maior variação no orçamento em relação ao ano anterior?',
    title: 'Variação por programa',
    desc: 'Maiores variações ano a ano.',
    icon: Layers,
    gradient: 'linear-gradient(135deg,var(--ma-red),var(--ma-orange))',
  },
];

const HINTS = [
  'Qual o índice de execução orçamentária atual?',
  'Liste as despesas por função de governo.',
  'Qual o saldo orçamentário disponível por unidade?',
];

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (question: string) => {
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
              updateAssistant({ content: textAccum });
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
            m.id === assistantId
              ? { ...m, content: `Erro ao processar: ${(err as Error).message}` }
              : m
          )
        );
      } finally {
        setLoading(false);
      }
    },
    [messages]
  );

  async function handleFeedback(msg: ChatMessage, rating: 'POSITIVE' | 'NEGATIVE') {
    if (!msg.sql) return;
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        naturalLanguage:
          messages.find(
            (m) => m.role === 'user' && messages.indexOf(m) === messages.indexOf(msg) - 1
          )?.content ?? '',
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--app-bg)' }}>

      {/* ── Topbar da página ─────────────────────────────── */}
      <header
        className="flex items-center justify-between px-7 shrink-0"
        style={{
          height: 64,
          background: 'var(--app-surface)',
          borderBottom: '1px solid var(--app-line)',
          zIndex: 5,
        }}
      >
        <div className="flex items-center gap-3">
          <div style={{ color: 'var(--ma-blue)' }}>
            <MessageSquare size={28} strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-[16.5px] font-semibold leading-tight m-0" style={{ color: 'var(--app-ink)' }}>
              Chat IQ
            </h1>
            <p className="text-[12.5px] m-0 mt-0.5" style={{ color: 'var(--app-ink-soft)' }}>
              Assistente de dados orçamentários
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2 h-[34px] px-3 rounded-full text-[12.5px] font-medium"
            style={{
              background: 'var(--app-line-soft, #EDF1F7)',
              border: '1px solid var(--app-line)',
              color: 'var(--app-ink-soft)',
            }}
          >
            <span
              className="w-[7px] h-[7px] rounded-full"
              style={{
                background: 'var(--ma-green)',
                boxShadow: '0 0 0 3px rgba(31,162,74,.16)',
              }}
            />
            Base conectada · DWPROD16
          </span>

          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-2 h-[34px] px-3 rounded-[9px] text-[13px] font-medium transition-colors duration-150"
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-line)',
              color: 'var(--app-ink-soft)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#cdd6e6';
              (e.currentTarget as HTMLElement).style.color = 'var(--app-ink)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--app-line)';
              (e.currentTarget as HTMLElement).style.color = 'var(--app-ink-soft)';
            }}
          >
            <Plus size={16} strokeWidth={2} />
            Nova conversa
          </button>
        </div>
      </header>

      {/* ── Scroll area ──────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="max-w-[760px] mx-auto px-7 pt-14 pb-10 flex flex-col items-center text-center ma-rise">

            {/* Emblem */}
            <div
              className="w-[76px] h-[76px] rounded-[22px] flex items-center justify-center text-white mb-6"
              style={{
                background: 'var(--rainbow)',
                boxShadow: '0 16px 34px rgba(28,117,188,.30)',
              }}
            >
              <MessageSquare size={38} strokeWidth={2.1} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.18))' }} />
            </div>

            <h2 className="text-[27px] font-bold tracking-tight mb-2.5" style={{ color: 'var(--app-ink)' }}>
              Olá. Como posso ajudar com os{' '}
              <span style={{ color: 'var(--ma-blue)' }}>dados orçamentários</span>?
            </h2>
            <p className="text-[15px] max-w-[520px] leading-relaxed m-0" style={{ color: 'var(--app-ink-soft)' }}>
              Pergunte em linguagem natural sobre receitas, despesas, órgãos e programas.
              As respostas são geradas a partir da base <strong>DWPROD16</strong>.
            </p>

            {/* Suggestion cards */}
            <div className="grid grid-cols-2 gap-3.5 w-full mt-9">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.q}
                  onClick={() => send(s.q)}
                  className="text-left rounded-2xl p-[18px] flex gap-3.5 items-start transition-all duration-150 group"
                  style={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-line)',
                    boxShadow: '0 1px 2px rgba(16,33,68,.06)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(16,33,68,.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#d6deec';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 2px rgba(16,33,68,.06)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--app-line)';
                  }}
                >
                  <div
                    className="w-[42px] h-[42px] rounded-xl shrink-0 flex items-center justify-center text-white"
                    style={{ background: s.gradient }}
                  >
                    <s.icon size={21} strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14.5px] leading-snug" style={{ color: 'var(--app-ink)' }}>
                      {s.title}
                    </div>
                    <div className="text-[12.5px] mt-1 leading-snug" style={{ color: 'var(--app-ink-soft)' }}>
                      {s.desc}
                    </div>
                  </div>
                  <span className="text-[#c2cbdb] group-hover:text-[var(--ma-blue)] transition-colors shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                </button>
              ))}
            </div>

            {/* Hint chips */}
            <div className="flex gap-2 flex-wrap justify-center mt-7">
              {HINTS.map((h) => (
                <button
                  key={h}
                  onClick={() => send(h)}
                  className="text-[12.5px] px-3.5 py-[7px] rounded-full transition-colors duration-150"
                  style={{
                    background: 'var(--app-surface)',
                    border: '1px solid var(--app-line)',
                    color: 'var(--app-ink-soft)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--ma-blue)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--ma-blue)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--app-line)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--app-ink-soft)';
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Thread */}
        {messages.length > 0 && (
          <MessageList
            messages={messages}
            loading={loading}
            onFeedback={handleFeedback}
            onFavorite={handleFavorite}
          />
        )}
      </div>

      {/* ── Composer ─────────────────────────────────────── */}
      <MessageInput onSend={send} loading={loading} />
    </div>
  );
}
