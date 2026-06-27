import { hasPermission, SITOP_PERMISSIONS } from '@/lib/permissions';

const FALLBACK_ROUTES = [
  { permission: SITOP_PERMISSIONS.ANALYTICS_VIEW, href: '/dashboard' },
  { permission: SITOP_PERMISSIONS.DASHBOARD_VIEW, href: '/dashboard/centro-mando' },
  { permission: SITOP_PERMISSIONS.PATROL_VIEW, href: '/dashboard/patrullaje' },
  { permission: SITOP_PERMISSIONS.SHIFTS_VIEW, href: '/dashboard/guardias' },
  { permission: SITOP_PERMISSIONS.RRHH_VIEW, href: '/dashboard/rrhh' },
  { permission: SITOP_PERMISSIONS.AUDIT_VIEW, href: '/dashboard/auditoria' },
] as const;

export function resolveHomeRoute(permissions: string[] | undefined): string {
  for (const route of FALLBACK_ROUTES) {
    if (hasPermission(permissions, route.permission)) {
      return route.href;
    }
  }
  return '/dashboard/movil';
}
