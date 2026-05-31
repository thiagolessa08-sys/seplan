// src/app/(app)/admin/usuarios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus } from 'lucide-react';
import type { Role } from '@/types/domain';

interface UserRow { id: string; email: string; name: string; role: Role; active: boolean; }

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  ANALYST: 'bg-blue-100 text-blue-700',
  VIEWER: 'bg-gray-100 text-gray-700',
};

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'ANALYST' as Role });

  useEffect(() => {
    fetch('/api/admin/users').then((r) => r.json()).then(setUsers);
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/admin/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    if (res.ok) {
      const user = await res.json();
      setUsers((p) => [user, ...p]);
      setForm({ email: '', name: '', password: '', role: 'ANALYST' });
    }
  }

  async function toggle(user: UserRow) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !user.active }),
    });
    setUsers((p) => p.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5" />
        <h1 className="text-xl font-semibold">Usuários</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex gap-2"><UserPlus className="w-4 h-4 mt-0.5" />Novo usuário</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid grid-cols-2 gap-3">
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            <Input type="password" placeholder="Senha" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
            <select className="border rounded-md px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}>
              <option value="ADMIN">Admin</option>
              <option value="ANALYST">Analista</option>
              <option value="VIEWER">Visualizador</option>
            </select>
            <Button type="submit" className="col-span-2">Criar usuário</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between p-3 bg-white border rounded-md">
            <div>
              <p className="font-medium text-sm">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role}</span>
              <Button size="sm" variant={u.active ? 'outline' : 'secondary'} onClick={() => toggle(u)}>
                {u.active ? 'Desativar' : 'Ativar'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
