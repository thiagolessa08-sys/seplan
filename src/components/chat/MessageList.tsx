// src/components/chat/MessageList.tsx
'use client';

import { useEffect, useRef } from 'react';
import { ResultTable } from './ResultTable';
import { SqlBadge } from './SqlBadge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Star } from 'lucide-react';
import type { ChatMessage } from '@/types/domain';

interface MessageListProps {
  messages: ChatMessage[];
  onFeedback: (msg: ChatMessage, rating: 'POSITIVE' | 'NEGATIVE') => void;
  onFavorite: (msg: ChatMessage) => void;
}

export function MessageList({ messages, onFeedback, onFavorite }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex h-full items-center justify-center text-gray-400 text-sm">
          Faça uma pergunta sobre os dados orçamentários.
        </div>
      )}
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-3xl w-full ${msg.role === 'user' ? 'pl-8' : 'pr-8'}`}>
            <div
              className={`rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white ml-auto max-w-xl'
                  : 'bg-white border shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.sql && <SqlBadge sql={msg.sql} />}
              {msg.result && <ResultTable result={msg.result} />}
            </div>
            {msg.role === 'assistant' && msg.sql && (
              <div className="flex items-center gap-1 mt-1 ml-1">
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-green-600"
                  onClick={() => onFeedback(msg, 'POSITIVE')}
                  title="Resposta útil"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-red-600"
                  onClick={() => onFeedback(msg, 'NEGATIVE')}
                  title="Resposta incorreta"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-yellow-500"
                  onClick={() => onFavorite(msg)}
                  title="Salvar como favorito"
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
