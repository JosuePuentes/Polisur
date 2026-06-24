'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { TacticalShell } from '@/components/layout/tactical-shell';
import type { OfficerSession } from '@/lib/types/auth.types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<OfficerSession | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const active = getSession();
    if (!active) {
      router.replace('/auth/secure-command-gate');
      return;
    }
    setSession(active);
    setChecked(true);
  }, [router]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          Verificando credenciales…
        </p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <TacticalShell>{children}</TacticalShell>;
}
