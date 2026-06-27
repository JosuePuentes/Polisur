import Link from 'next/link';

export function PublicHeader() {
  return (
    <header className="border-b border-blue-100 bg-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">
              SF
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                Polisur · San Francisco
              </p>
              <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Portal Ciudadano
              </h1>
            </div>
          </div>

          <Link
            href="/auth/secure-command-gate"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
          >
            Acceso institucional SITOP
          </Link>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          Reporte delitos de forma anónima o active el botón de pánico en
          emergencias reales.
        </p>

        <nav
          aria-label="Secciones del portal"
          className="mt-4 flex flex-wrap gap-2"
        >
          <a
            href="#panico"
            className="rounded-full bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
          >
            Botón de pánico
          </a>
          <a
            href="#denuncia"
            className="rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
          >
            Denuncia anónima
          </a>
        </nav>
      </div>
    </header>
  );
}
