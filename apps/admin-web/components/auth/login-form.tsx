'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { resolveHomeRoute } from '@/lib/utils/home-route';
import { authenticateOfficer } from '@/lib/auth';

const SECURITY_ALERT =
  'Credenciales inválidas o acceso denegado';

export function LoginForm() {
  const router = useRouter();
  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const session = await authenticateOfficer(cedula.trim(), password);
      router.push(resolveHomeRoute(session.permissions));
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error && err.message !== 'LOGIN_FAILED'
          ? err.message
          : SECURITY_ALERT;
      setError(
        `${message}. Verifique cédula y contraseña. Si su cuenta es nueva, debe ser activada en RRHH.`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          <div className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-red-400">
              ⚠
            </span>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="cedula"
          className="block text-xs font-medium uppercase tracking-wider text-slate-400"
        >
          Cédula de Identidad
        </label>
        <input
          id="cedula"
          name="cedula"
          type="text"
          autoComplete="username"
          required
          value={cedula}
          onChange={(e) => setCedula(e.target.value)}
          placeholder="V-12345678"
          className="w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-xs font-medium uppercase tracking-wider text-slate-400"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••••"
          className="w-full rounded-lg border border-slate-700/80 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="group relative w-full overflow-hidden rounded-lg border border-cyan-600/40 bg-gradient-to-r from-slate-800 to-polisur-accent px-4 py-3.5 text-sm font-semibold uppercase tracking-widest text-cyan-50 shadow-tactical transition hover:border-cyan-400/60 hover:from-cyan-950/80 hover:to-polisur-accent hover:shadow-tactical-lg disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative z-10">
          {isSubmitting ? 'Verificando credenciales…' : 'Acceder al Sistema'}
        </span>
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent transition group-hover:translate-x-full duration-700"
        />
      </button>

      <div className="space-y-3 border-t border-slate-800/80 pt-5">
        <p className="text-center text-xs text-slate-500">
          ¿Es usted ciudadano y no personal de Polisur?
        </p>
        <a
          href="/public/denuncias"
          className="flex w-full items-center justify-center rounded-lg border border-blue-500/30 bg-blue-950/30 px-4 py-3 text-sm font-medium text-blue-200 transition hover:border-blue-400/50 hover:bg-blue-950/50"
        >
          Ir al Portal Ciudadano — denuncias y pánico
        </a>
      </div>
    </form>
  );
}
