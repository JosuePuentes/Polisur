'use client';

import { CommandsPanel } from '@/components/operations/ops-panels';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

export default function ComandosPage() {
  const session = getSession();
  if (!session || !hasPermission(session.permissions, SITOP_PERMISSIONS.COMMANDS_VIEW)) {
    return <p className="text-sm text-red-300">Sin permisos para comandos.</p>;
  }
  return <CommandsPanel />;
}
