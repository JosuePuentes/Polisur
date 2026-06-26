'use client';

import { RrhhPanel } from '@/components/rrhh/rrhh-panel';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

export default function RrhhPage() {
  const session = getSession();

  if (!session) return null;

  if (!hasPermission(session.permissions, SITOP_PERMISSIONS.RRHH_VIEW)) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-6 py-12 text-center text-sm text-red-200">
        No tiene permisos para acceder al módulo de RRHH.
      </div>
    );
  }

  return <RrhhPanel />;
}
