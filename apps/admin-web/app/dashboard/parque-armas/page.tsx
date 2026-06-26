'use client';

import { ArmoryPanel } from '@/components/operations/ops-panels';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

export default function ParqueArmasPage() {
  const session = getSession();
  if (!session || !hasPermission(session.permissions, SITOP_PERMISSIONS.ARMORY_VIEW)) {
    return <p className="text-sm text-red-300">Sin permisos para parque de armas.</p>;
  }
  return <ArmoryPanel />;
}
