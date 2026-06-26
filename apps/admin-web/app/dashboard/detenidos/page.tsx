'use client';

import { DetaineesPanel } from '@/components/operations/ops-panels';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

export default function DetenidosPage() {
  const session = getSession();
  if (!session || !hasPermission(session.permissions, SITOP_PERMISSIONS.DETAINEES_VIEW)) {
    return <p className="text-sm text-red-300">Sin permisos para detenidos.</p>;
  }
  return <DetaineesPanel />;
}
