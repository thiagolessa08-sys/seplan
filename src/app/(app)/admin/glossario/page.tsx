// src/app/(app)/admin/glossario/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Save } from 'lucide-react';

export default function GlossarioPage() {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/glossary').then((r) => r.json()).then((d) => setContent(d.content));
  }, []);

  async function save() {
    await fetch('/api/admin/glossary', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Glossário de Regras de Negócio</h1>
      </div>
      <p className="text-sm text-gray-500">
        Escreva regras em linguagem natural. Exemplo: "Para receita própria, somar IPTU + ISS + Taxas."
        Este texto será enviado ao Claude em toda consulta.
      </p>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva as regras de negócio aqui..."
        className="min-h-64 font-mono text-sm"
      />
      <Button onClick={save} className="flex gap-2">
        <Save className="w-4 h-4" />
        {saved ? 'Salvo!' : 'Salvar'}
      </Button>
    </div>
  );
}
