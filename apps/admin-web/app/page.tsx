import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/auth/secure-command-gate');
}
