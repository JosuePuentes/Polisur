'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSession } from '@/lib/auth';
import {
  fetchAcademyDepartment,
  fetchPromociones,
} from '@/lib/api/academy';
import { EnrollmentForm } from '@/components/academia/enrollment-form';
import { PromocionCard } from '@/components/academia/promocion-card';
import type {
  GraduatePromocionResult,
  Promocion,
} from '@/lib/types/academy.types';

function canAccessAcademy(rangeRole: string): boolean {
  return rangeRole === 'SUPER_ADMIN' || rangeRole === 'JEFE_DEPARTAMENTO';
}

export default function AcademiaPage() {
  const session = getSession();
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [graduateBanner, setGraduateBanner] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [promos, dept] = await Promise.all([
        fetchPromociones(),
        fetchAcademyDepartment(),
      ]);
      setPromociones(promos);
      setDepartmentId(dept.id);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No fue posible cargar los datos de la Academia',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function handleGraduated(result: GraduatePromocionResult) {
    setGraduateBanner(
      `Graduación exitosa: ${result.totalGraduados} egresado(s) transferidos a RRHH — bandeja de distribución.`,
    );
    void loadData();
  }

  if (!session) return null;

  if (!canAccessAcademy(session.rangeRole)) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-6 py-12 text-center">
        <p className="text-sm text-red-200">
          Acceso restringido. Solo el Director General o el mando de la Academia
          pueden operar este módulo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner corporativo */}
      <header className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-cyan-950/20 to-slate-900/90 px-6 py-5 backdrop-blur-sm">
        <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">
          SITOP Academia
        </p>
        <h1 className="mt-2 text-base font-semibold leading-snug text-slate-100 sm:text-lg">
          DIRECCIÓN DE EDUCACIÓN Y CONTROL TÁCTICO (DECT) — CONTROL DE ASPIRANTES
        </h1>
        <p className="mt-1 font-mono text-xs uppercase tracking-widest text-slate-500">
          Sistema de Inteligencia y Táctica Operativa Policial
        </p>
      </header>

      {graduateBanner && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-5 py-4 text-sm text-emerald-200"
        >
          {graduateBanner}
        </div>
      )}

      {loading && (
        <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900/30">
          <div className="text-center">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Cargando cohortes…
            </p>
          </div>
        </div>
      )}

      {loadError && !loading && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-6 py-8 text-center">
          <p className="text-sm text-red-200">{loadError}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="mt-4 rounded-lg border border-red-500/40 px-4 py-2 text-xs uppercase tracking-wider text-red-300"
          >
            Reintentar
          </button>
        </div>
      )}

      {!loading && !loadError && (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <EnrollmentForm
            promociones={promociones}
            departmentId={departmentId}
            onEnrolled={() => void loadData()}
          />

          <section className="space-y-4">
            <header>
              <h2 className="text-sm font-semibold text-slate-200">
                Gestión de Promociones Activas
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {promociones.length} cohorte(s) registrada(s)
              </p>
            </header>

            {promociones.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 px-6 py-16 text-center">
                <p className="text-sm text-slate-400">
                  No hay promociones activas en el sistema
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {promociones.map((promocion) => (
                  <PromocionCard
                    key={promocion.id}
                    promocion={promocion}
                    onGraduated={handleGraduated}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
