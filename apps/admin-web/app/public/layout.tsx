import type { Metadata } from 'next';
import { PublicHeader } from '@/components/public/public-header';

export const metadata: Metadata = {
  title: 'Portal Ciudadano · Polisur San Francisco',
  description:
    'Denuncias anónimas y botón de pánico geolocalizado para ciudadanos del Municipio San Francisco.',
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 text-slate-900">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        Policía Municipal San Francisco · SITOP · Emergencias reales
        únicamente
      </footer>
    </div>
  );
}
