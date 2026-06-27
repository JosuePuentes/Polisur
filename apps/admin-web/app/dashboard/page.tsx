'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';
import { resolveHomeRoute } from '@/lib/utils/home-route';
import { AnalyticsDashboard } from '@/components/dashboard/analytics-dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const session = getSession();

  useEffect(() => {
    if (!session) return;
    if (!hasPermission(session.permissions, SITOP_PERMISSIONS.ANALYTICS_VIEW)) {
      router.replace(resolveHomeRoute(session.permissions));
    }
  }, [router, session]);

  if (!session) return null;
  if (!hasPermission(session.permissions, SITOP_PERMISSIONS.ANALYTICS_VIEW)) {
    return null;
  }

  return <AnalyticsDashboard />;
}
