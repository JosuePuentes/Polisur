'use client';

import { AuditPanel } from '@/components/audit/audit-panel';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { resolveHomeRoute } from '@/lib/utils/home-route';

export default function AuditoriaPage() {
  const session = getSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.replace('/auth/secure-command-gate');
      return;
    }
    if (!hasPermission(session.permissions, SITOP_PERMISSIONS.AUDIT_VIEW)) {
      router.replace(resolveHomeRoute(session.permissions));
    }
  }, [session, router]);

  if (!session) return null;

  return <AuditPanel />;
}
