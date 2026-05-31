// src/app/(app)/admin/catalogo/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw } from 'lucide-react';
import type { TableSchema } from '@/types/domain';

export default function CatalogoPage() {
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = await fetch('/api/admin/schema').then((r) => r.json());
    setTables(data);
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    const data = await fetch('/api/admin/schema/refresh', { method: 'POST' }).then((r) => r.json());
    await load();
    setRefreshing(false);
    alert(`Catálogo atualizado: ${data.count} tabelas`);
  }

  const fatos = tables.filter((t) => t.name.startsWith('FATO_'));
  const dims = tables.filter((t) => t.name.startsWith('DIM_'));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h1 className="text-xl font-semibold">Catálogo de Tabelas</h1>
        </div>
        <Button variant="outline" onClick={refresh} disabled={refreshing} className="flex gap-2">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar catálogo
        </Button>
      </div>

      {[{ label: 'Tabelas Fato', items: fatos }, { label: 'Dimensões', items: dims }].map(({ label, items }) => (
        <div key={label} className="space-y-2">
          <h2 className="font-medium text-gray-700">{label} ({items.length})</h2>
          {items.map((t) => (
            <div key={t.name} className="bg-white border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <code className="text-sm font-mono font-medium">{t.name}</code>
                <Badge variant={t.includedInContext ? 'default' : 'secondary'}>
                  {t.includedInContext ? 'No contexto' : 'Excluído'}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {t.columns.map((c) => (
                  <span key={c.name} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
