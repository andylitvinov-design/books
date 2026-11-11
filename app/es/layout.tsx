import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import './spanish-public.css';

// /es is a static Next.js subtree. The dynamic [locale] layout does not
// cover it, so Spanish pages must declare their own HH install identity.
// The existing /es/homeopathy layout overrides this with PsiAlchemy.
export const metadata: Metadata = {
  manifest: '/holistic-house-app-es.webmanifest',
};

export default function SpanishPublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
