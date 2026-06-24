import { AnonymousReportForm } from '@/components/public/anonymous-report-form';
import { PanicButton } from '@/components/public/panic-button';

export default function PublicDenunciasPage() {
  return (
    <div className="space-y-8">
      <PanicButton />
      <AnonymousReportForm />
    </div>
  );
}
