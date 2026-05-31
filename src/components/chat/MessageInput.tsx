// src/components/chat/MessageInput.tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSend: (question: string) => void;
  loading: boolean;
}

export function MessageInput({ onSend, loading }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const q = value.trim();
    if (!q || loading) return;
    setValue('');
    onSend(q);
  }

  return (
    <div className="border-t bg-white px-4 py-3">
      <div className="flex gap-2 items-end max-w-4xl mx-auto">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre os dados orçamentários... (Enter para enviar)"
          className="min-h-[44px] max-h-32 resize-none"
          disabled={loading}
        />
        <Button onClick={submit} disabled={!value.trim() || loading} className="shrink-0 h-11">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-xs text-gray-400 text-center mt-1">Shift+Enter para nova linha</p>
    </div>
  );
}
