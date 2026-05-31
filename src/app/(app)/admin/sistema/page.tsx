// src/app/(app)/admin/sistema/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface HealthStatus { ok: boolean; agentUrl?: string; error?: string; }

export default function SistemaPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    const data = await fetch('/api/admin/agent/health').then((r) => r.json());
    setHealth(data);
    setChecking(false);
  }

  useEffect(() => { check(); }, []);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Status do Sistema</h1>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Java Agent (Sybase IQ)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {health && (
            <div className="flex items-center gap-2">
              {health.ok
                ? <CheckCircle className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-600" />}
              <span className={`font-medium ${health.ok ? 'text-green-700' : 'text-red-700'}`}>
                {health.ok ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
          {health?.agentUrl && (
            <p className="text-xs text-gray-500 font-mono break-all">{health.agentUrl}</p>
          )}
          {health?.error && <p className="text-xs text-red-600">{health.error}</p>}
          <p className="text-xs text-gray-400">
            Para trocar a URL do Agent: edite AGENT_URL no Railway e reinicie o serviço.
          </p>
          <Button variant="outline" size="sm" onClick={check} disabled={checking} className="flex gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            Testar conexão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
