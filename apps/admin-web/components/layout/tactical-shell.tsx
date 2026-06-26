'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clearAuthSession, getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Centro de Mando',
    permission: SITOP_PERMISSIONS.DASHBOARD_VIEW,
  },
  {
    href: '/dashboard/academia',
    label: 'SITOP Academia',
    permission: SITOP_PERMISSIONS.ACADEMY_VIEW,
  },
  {
    href: '/dashboard/rrhh',
    label: 'RRHH',
    permission: SITOP_PERMISSIONS.RRHH_VIEW,
  },
  {
    href: '/public/denuncias',
    label: 'Portal Ciudadano',
    external: true,
  },
];

export function TacticalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const session = getSession();

  function handleLogout() {
    clearAuthSession();
    window.location.href = '/auth/secure-command-gate';
  }

  const visibleNav = NAV_ITEMS.filter((item) => {
    if (item.external) return true;
    if (!item.permission) return true;
    return hasPermission(session?.permissions, item.permission);
  });

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 lg:flex">
        <div className="border-b border-slate-800 px-5 py-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-500/70">SITOP</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-200">Polisur · SITOP</h2>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {visibleNav.map((item) => {
            const active =
              !item.external &&
              (pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href)));

            const className = `block rounded-lg px-3 py-2.5 text-sm transition ${
              active
                ? 'border border-cyan-500/30 bg-cyan-950/30 text-cyan-300'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`;

            if (item.external) {
              return (
                <Link key={item.href} href={item.href} target="_blank" className={className}>
                  {item.label}
                </Link>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4">
          {session && (
            <div className="mb-3 rounded-lg bg-slate-950/60 px-3 py-2">
              <p className="font-mono text-[10px] uppercase text-slate-500">Sesión activa</p>
              <p className="truncate text-xs text-cyan-400/90">{session.rangeRole.replace(/_/g, ' ')}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs uppercase tracking-wider text-slate-400 transition hover:border-red-500/40 hover:bg-red-950/20 hover:text-red-300"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/30 px-4 py-3 backdrop-blur-sm lg:px-8">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">Panel Administrativo Centralizado</p>
            <h1 className="text-base font-semibold text-slate-100">Centro de Mando Operativo</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] sm:inline-block" />
            <span className="font-mono text-xs text-slate-500">EN LÍNEA</span>
          </div>
        </header>

        <main className="relative flex-1 overflow-auto p-4 lg:p-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 tactical-grid opacity-30" />
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
