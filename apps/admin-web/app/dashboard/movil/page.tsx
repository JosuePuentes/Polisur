'use client';

import { MobileGuardPanel } from '@/components/operations/mobile-guard-panel';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { resolveHomeRoute } from '@/lib/utils/home-route';

export default function MovilPage() {
  const session = getSession();
  const router = useRouter();

  useEffect(() => {
    if (!session) {
      router.replace('/auth/secure-command-gate');
      return;
    }
    if (!hasPermission(session.permissions, SITOP_PERMISSIONS.SHIFTS_VIEW)) {
      router.replace(resolveHomeRoute(session.permissions));
    }
  }, [session, router]);

  if (!session) return null;

  return <MobileGuardPanel />;
}
