export function PublicHeader() {
  return (
    <header className="border-b border-blue-100 bg-white">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-sm font-bold text-white">
            SF
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Polisur · San Francisco
            </p>
            <h1 className="text-lg font-semibold text-slate-900 sm:text-xl">
              Portal Ciudadano de Denuncias
            </h1>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          Canal seguro para reportes anónimos y alertas de emergencia geolocalizadas.
        </p>
      </div>
    </header>
  );
}
