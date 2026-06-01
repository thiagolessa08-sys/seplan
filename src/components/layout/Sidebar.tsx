'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { MessageSquare, Star, Users, BookOpen, Database, Activity, LogOut } from 'lucide-react';
import type { Role } from '@/types/domain';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  ANALYST: 'Analista',
  VIEWER: 'Visualizador',
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV: NavItem[] = [
  { href: '/chat',           label: 'Chat IQ',   icon: MessageSquare, roles: ['ADMIN', 'ANALYST'] },
  { href: '/favoritos',      label: 'Favoritos', icon: Star,          roles: ['ADMIN', 'ANALYST', 'VIEWER'] },
  { href: '/admin/usuarios', label: 'Usuários',  icon: Users,         roles: ['ADMIN'] },
  { href: '/admin/glossario',label: 'Glossário', icon: BookOpen,      roles: ['ADMIN'] },
  { href: '/admin/catalogo', label: 'Catálogo',  icon: Database,      roles: ['ADMIN'] },
  { href: '/admin/sistema',  label: 'Sistema',   icon: Activity,      roles: ['ADMIN'] },
];

interface SidebarProps {
  role: Role;
  userName: string;
}

export function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV.filter((n) => n.roles.includes(role));
  const initials = userName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <aside
      className="w-[272px] min-w-[272px] h-screen flex flex-col relative"
      style={{
        background: 'linear-gradient(180deg,var(--side-1),var(--side-2))',
        color: 'var(--side-text)',
        borderRight: '1px solid rgba(0,0,0,.2)',
      }}
    >
      {/* Rainbow top stripe */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'var(--rainbow)' }} />

      {/* Brand */}
      <div className="pt-6 px-5 pb-4">
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-center"
          style={{ background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,.28)' }}
        >
          <span className="font-bold text-[#1B3F73] text-sm leading-tight text-center select-none">
            GOVERNO DO<br />MARANHÃO
          </span>
        </div>

        <div className="flex items-center gap-2.5 pt-4 px-1">
          <div style={{ color: '#7FB4E6' }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <div className="font-bold text-base tracking-wide">Chat IQ</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: 'var(--ma-green2)',
                  boxShadow: '0 0 0 3px rgba(86,187,70,.18)',
                }}
              />
              <span className="text-[11px] font-medium" style={{ color: 'var(--side-muted)' }}>
                DWPROD16
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3.5 overflow-y-auto pb-2">
        <div
          className="text-[10.5px] font-semibold tracking-[1.4px] uppercase px-3 mb-2 mt-1"
          style={{ color: 'var(--side-muted)' }}
        >
          Navegação
        </div>

        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex items-center gap-3 w-full px-3 py-[11px] rounded-xl text-[14.5px] mb-0.5 transition-colors duration-150 hover:bg-white/[0.06]"
              style={
                active
                  ? {
                      background: 'linear-gradient(135deg,var(--ma-blue),var(--ma-navy))',
                      color: '#fff',
                      fontWeight: 600,
                      boxShadow: '0 8px 20px rgba(15,40,90,.45), inset 0 0 0 1px rgba(255,255,255,.08)',
                    }
                  : { fontWeight: 500 }
              }
            >
              {active && (
                <span
                  className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-1 h-[22px] rounded-r-sm"
                  style={{ background: 'var(--ma-yellow)' }}
                />
              )}
              <item.icon
                size={19}
                className="shrink-0"
                style={{ opacity: active ? 1 : 0.85, strokeWidth: 2 }}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User chip */}
      <div className="px-3.5 pb-3 pt-2.5" style={{ borderTop: '1px solid var(--side-line)' }}>
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors duration-150 hover:bg-white/[0.05]">
          <div
            className="w-[38px] h-[38px] rounded-[11px] shrink-0 flex items-center justify-center text-white font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg,var(--ma-green),var(--ma-blue))',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.14)',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate leading-tight">{userName || 'Usuário'}</div>
            <div className="text-[11.5px] truncate" style={{ color: 'var(--side-muted)' }}>
              {ROLE_LABELS[role]}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sair"
            className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center transition-colors duration-150 hover:bg-white/[0.08] hover:text-white"
            style={{ color: 'var(--side-muted)' }}
          >
            <LogOut size={17} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
