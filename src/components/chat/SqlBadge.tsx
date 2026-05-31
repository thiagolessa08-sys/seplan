// src/components/chat/SqlBadge.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

interface SqlBadgeProps {
  sql: string;
}

export function SqlBadge({ sql }: SqlBadgeProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2 rounded-md border bg-gray-900 text-gray-100 text-xs">
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-gray-400 font-mono">SQL gerado</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={copy}>
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-white" onClick={() => setOpen(!open)}>
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </div>
      </div>
      {open && <pre className="px-3 pb-3 overflow-x-auto whitespace-pre-wrap">{sql}</pre>}
    </div>
  );
}
