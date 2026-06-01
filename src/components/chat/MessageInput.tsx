'use client';

import { useState, useRef } from 'react';
import { Send, Loader2, Paperclip, Database } from 'lucide-react';

interface MessageInputProps {
  onSend: (question: string) => void;
  loading: boolean;
}

export function MessageInput({ onSend, loading }: MessageInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function autogrow() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSend(q);
  }

  const canSend = value.trim().length > 0 && !loading;

  return (
    <div
      className="shrink-0 px-7 pb-5 pt-3"
      style={{
        background: `linear-gradient(180deg, rgba(244,246,250,0) 0%, var(--app-bg) 38%)`,
      }}
    >
      {/* Composer box */}
      <div
        className="max-w-[820px] mx-auto rounded-[22px] p-2 transition-all duration-200"
        style={{
          background: 'var(--app-surface)',
          border: `1px solid ${focused ? 'var(--ma-blue)' : 'var(--app-line)'}`,
          boxShadow: focused
            ? '0 0 0 4px rgba(28,117,188,.12), 0 4px 12px rgba(16,33,68,.08)'
            : '0 4px 12px rgba(16,33,68,.08)',
        }}
      >
        <div className="flex items-end gap-2">
          {/* Attach */}
          <button
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-150 shrink-0"
            style={{
              background: 'var(--app-line-soft, #EDF1F7)',
              color: 'var(--app-ink-soft)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--app-line)';
              (e.currentTarget as HTMLElement).style.color = 'var(--app-ink)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--app-line-soft, #EDF1F7)';
              (e.currentTarget as HTMLElement).style.color = 'var(--app-ink-soft)';
            }}
            title="Anexar contexto"
            type="button"
          >
            <Paperclip size={19} strokeWidth={2} />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => { setValue(e.target.value); autogrow(); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Pergunte algo sobre os dados orçamentários…"
            disabled={loading}
            className="flex-1 resize-none border-0 outline-none bg-transparent text-[15px] leading-[1.55] py-[11px] px-1.5 pl-3 min-h-[44px] max-h-40"
            style={{ color: 'var(--app-ink)', fontFamily: 'inherit' }}
          />

          {/* Send */}
          <button
            onClick={submit}
            disabled={!canSend}
            className="w-11 h-11 rounded-[13px] flex items-center justify-center shrink-0 text-white transition-all duration-150"
            style={{
              background: canSend
                ? 'linear-gradient(135deg,var(--ma-blue),var(--ma-navy))'
                : 'linear-gradient(135deg,var(--ma-blue),var(--ma-navy))',
              opacity: canSend ? 1 : 0.45,
              boxShadow: canSend ? '0 8px 18px rgba(28,117,188,.32)' : 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => {
              if (canSend) (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 22px rgba(28,117,188,.4)';
            }}
            onMouseLeave={(e) => {
              if (canSend) (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 18px rgba(28,117,188,.32)';
            }}
          >
            {loading
              ? <Loader2 size={20} strokeWidth={2.1} className="animate-spin" />
              : <Send size={20} strokeWidth={2.1} />
            }
          </button>
        </div>
      </div>

      {/* Footer hint */}
      <div
        className="max-w-[820px] mx-auto flex items-center justify-between mt-2 px-1.5 text-[12px]"
        style={{ color: 'var(--app-ink-soft)' }}
      >
        <span className="flex items-center gap-1">
          <kbd
            className="font-[inherit] text-[11px] px-1.5 py-px rounded-md"
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-line)',
              borderBottomWidth: 2,
              color: 'var(--app-ink-soft)',
            }}
          >
            Shift
          </kbd>
          {' + '}
          <kbd
            className="font-[inherit] text-[11px] px-1.5 py-px rounded-md"
            style={{
              background: 'var(--app-surface)',
              border: '1px solid var(--app-line)',
              borderBottomWidth: 2,
              color: 'var(--app-ink-soft)',
            }}
          >
            Enter
          </kbd>
          {' para nova linha'}
        </span>
        <span className="flex items-center gap-1.5">
          <Database size={13} strokeWidth={2} style={{ opacity: 0.7 }} />
          Fonte: Data Warehouse DWPROD16
        </span>
      </div>
    </div>
  );
}
