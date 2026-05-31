// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, Star, Users, BookOpen, Database, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/domain';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/chat', label: 'Chat IQ', icon: MessageSquare, roles: ['ADMIN', 'ANALYST'] },
  { href: '/favoritos', label: 'Favoritos', icon: Star, roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
  { href: '/admin/usuarios', label: 'Usuários', icon: Users, roles: ['ADMIN'] },
  { href: '/admin/glossario', label: 'Glossário', icon: BookOpen, roles: ['ADMIN'] },
  { href: '/admin/catalogo', label: 'Catálogo', icon: Database, roles: ['ADMIN'] },
  { href: '/admin/sistema', label: 'Sistema', icon: Activity, roles: ['ADMIN'] },
];

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-4 py-5 border-b border-gray-700">
        <span className="font-bold text-white text-lg">Chat IQ</span>
        <p className="text-xs text-gray-400 mt-0.5">DWPROD16</p>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            )}
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
