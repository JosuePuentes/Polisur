'use client';

import { PatrolPanel } from '@/components/operations/ops-panels';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

export default function PatrullajePage() {
  const session = getSession();
  if (!session || !hasPermission(session.permissions, SITOP_PERMISSIONS.PATROL_VIEW)) {
    return <p className="text-sm text-red-300">Sin permisos para patrullaje y minutas.</p>;
  }
  return <PatrolPanel />;
}
