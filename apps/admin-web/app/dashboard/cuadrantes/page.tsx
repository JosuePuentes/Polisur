'use client';

import { QuadrantsPanel } from '@/components/operations/ops-panels';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

export default function CuadrantesPage() {
  const session = getSession();
  if (!session || !hasPermission(session.permissions, SITOP_PERMISSIONS.QUADRANTS_VIEW)) {
    return <p className="text-sm text-red-300">Sin permisos para cuadrantes.</p>;
  }
  return <QuadrantsPanel />;
}
