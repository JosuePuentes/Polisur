'use client';

import { ShiftsPanel } from '@/components/operations/ops-panels';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

export default function GuardiasPage() {
  const session = getSession();
  if (!session || !hasPermission(session.permissions, SITOP_PERMISSIONS.SHIFTS_VIEW)) {
    return <p className="text-sm text-red-300">Sin permisos para guardias.</p>;
  }
  return <ShiftsPanel />;
}
