'use client';

import { useEffect, useRef } from 'react';
import { ResultTable } from './ResultTable';
import { SqlBadge } from './SqlBadge';
import { Copy, Star, Download, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { ChatMessage } from '@/types/domain';

interface MessageListProps {
  messages: ChatMessage[];
  loading: boolean;
  onFeedback: (msg: ChatMessage, rating: 'POSITIVE' | 'NEGATIVE') => void;
  onFavorite: (msg: ChatMessage) => void;
}

export function MessageList({ messages, loading, onFeedback, onFavorite }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="max-w-[820px] mx-auto px-7 pt-8 pb-6 flex flex-col gap-6">
      {messages.map((msg, i) => {
        const isUser = msg.role === 'user';
        const isTyping = !isUser && msg.content === '' && loading && i === messages.length - 1;

        if (isUser) {
          return (
            <div key={msg.id} className="flex gap-3.5 justify-end ma-rise">
              <div
                className="max-w-[80%] px-[18px] py-[15px] rounded-2xl rounded-tr-[5px] text-[14.5px] leading-relaxed text-white"
                style={{
                  background: 'linear-gradient(135deg,var(--ma-blue),var(--ma-navy))',
                  boxShadow: '0 8px 18px rgba(28,117,188,.22)',
                }}
              >
                {msg.content.split('\n').map((line, j) => (
                  <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
              <div
                className="w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,var(--ma-green),var(--ma-blue))' }}
              >
                AD
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className="flex gap-3.5 ma-rise">
            {/* Rainbow bot avatar */}
            <div
              className="w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center text-white"
              style={{
                background: 'var(--rainbow)',
                boxShadow: '0 6px 14px rgba(28,117,188,.25)',
              }}
            >
              <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1L12 3z"/>
              </svg>
            </div>

            {/* Bubble */}
            <div
              className="flex-1 min-w-0 max-w-[calc(100%-52px)] rounded-2xl rounded-tl-[5px] px-[18px] py-[15px] text-[14.5px] leading-relaxed"
              style={{
                background: 'var(--app-surface)',
                border: '1px solid var(--app-line)',
                color: 'var(--app-ink)',
                boxShadow: '0 1px 2px rgba(16,33,68,.06)',
              }}
            >
              {isTyping ? (
                <TypingIndicator />
              ) : (
                <>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.sql && <SqlBadge sql={msg.sql} />}
                  {msg.result && <ResultTable result={msg.result} />}

                  {msg.sql && (
                    <div
                      className="flex gap-1.5 mt-3 pt-3"
                      style={{ borderTop: '1px solid var(--app-line-soft, #EDF1F7)' }}
                    >
                      <ActionBtn icon={<ThumbsUp size={15} strokeWidth={2} />} label="Útil"      onClick={() => onFeedback(msg, 'POSITIVE')} />
                      <ActionBtn icon={<ThumbsDown size={15} strokeWidth={2} />} label="Incorreto" onClick={() => onFeedback(msg, 'NEGATIVE')} />
                      <ActionBtn icon={<Star size={15} strokeWidth={2} />}      label="Favoritar"  onClick={() => onFavorite(msg)} />
                      <ActionBtn icon={<Copy size={15} strokeWidth={2} />}      label="Copiar"     onClick={() => navigator.clipboard.writeText(msg.content)} />
                      <ActionBtn icon={<Download size={15} strokeWidth={2} />}  label="Exportar"   onClick={() => {}} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12.5px] px-2.5 py-[5px] rounded-lg border border-transparent transition-colors duration-150 hover:border-[var(--app-line)] hover:bg-[var(--app-line-soft,#EDF1F7)]"
      style={{ color: 'var(--app-ink-soft)' }}
    >
      {icon}
      {label}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 py-1 px-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{
            background: '#c0cadb',
            animation: `ma-blink 1.3s infinite both`,
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}
