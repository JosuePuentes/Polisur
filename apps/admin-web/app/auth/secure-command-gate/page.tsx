import { LoginForm } from '@/components/auth/login-form';

export default function SecureCommandGatePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      {/* Fondo táctico */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 tactical-grid opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-500/5 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 shadow-tactical-lg backdrop-blur-md sm:p-10">
          {/* Encabezado institucional */}
          <header className="mb-8 space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/30">
              <svg
                aria-hidden
                className="h-7 w-7 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-cyan-500/80">
                Acceso Restringido · Nivel Institucional
              </p>
              <h1 className="text-lg font-semibold leading-snug text-slate-100 sm:text-xl">
                SISTEMA DE INTELIGENCIA Y TÁCTICA
                <br />
                OPERATIVA POLICIAL — SITOP
              </h1>
              <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
                Polisur · Acceso Institucional
              </p>
            </div>
          </header>

          <LoginForm />

          <footer className="mt-8 border-t border-slate-800/80 pt-6 text-center">
            <p className="text-[11px] leading-relaxed text-slate-600">
              Sistema monitoreado. El acceso no autorizado será registrado y
              reportado conforme a la normativa de seguridad municipal.
            </p>
          </footer>
        </div>
      </div>
    </main>
  );
}
