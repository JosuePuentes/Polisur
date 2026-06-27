import { AnonymousReportForm } from '@/components/public/anonymous-report-form';
import { PanicButton } from '@/components/public/panic-button';

export default function PublicDenunciasPage() {
  return (
    <div className="space-y-8">
      <section id="panico" aria-label="Botón de pánico">
        <PanicButton />
      </section>
      <section id="denuncia" aria-label="Denuncia anónima">
        <AnonymousReportForm />
      </section>
    </div>
  );
}
