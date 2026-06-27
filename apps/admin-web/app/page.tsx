import { redirect } from 'next/navigation';

/** Entrada pública: ciudadanos van directo al portal de denuncias y pánico. */
export default function HomePage() {
  redirect('/public/denuncias');
}
