// src/app/(app)/favoritos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResultTable } from '@/components/chat/ResultTable';
import { Play, Trash2, Star } from 'lucide-react';
import type { Favorite, QueryResult } from '@/types/domain';

export default function FavoritosPage() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [results, setResults] = useState<Record<string, QueryResult>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/favorites').then((r) => r.json()).then(setFavorites);
  }, []);

  async function execute(fav: Favorite) {
    setLoading((p) => ({ ...p, [fav.id]: true }));
    const res = await fetch(`/api/favorites/${fav.id}/execute`, { method: 'POST' });
    const result = await res.json();
    setResults((p) => ({ ...p, [fav.id]: result }));
    setLoading((p) => ({ ...p, [fav.id]: false }));
  }

  async function remove(id: string) {
    await fetch(`/api/favorites/${id}`, { method: 'DELETE' });
    setFavorites((p) => p.filter((f) => f.id !== id));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-500" />
        <h1 className="text-xl font-semibold">Favoritos</h1>
      </div>
      {favorites.length === 0 && (
        <p className="text-gray-500 text-sm">Nenhum favorito salvo. Use o chat para salvar consultas.</p>
      )}
      {favorites.map((fav) => (
        <Card key={fav.id}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{fav.name}</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">{fav.naturalLanguage}</p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm" variant="outline"
                  onClick={() => execute(fav)}
                  disabled={loading[fav.id]}
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  {loading[fav.id] ? 'Executando...' : 'Executar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(fav.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </div>
            </div>
          </CardHeader>
          {results[fav.id] && (
            <CardContent>
              <ResultTable result={results[fav.id]} />
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
