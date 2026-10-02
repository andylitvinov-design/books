import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LibraryHub, libraryCopy } from '@/components/library-hub';
import { metadataBaseFor } from '@/data/site-metadata';
import { isSupportedLocale, getHomeopathyLocaleParams } from '@/data/remedies';
type Props = { params: Promise<{ locale: string }> };
export function generateStaticParams() { return getHomeopathyLocaleParams(); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: 'Not found' };
  return { metadataBase: metadataBaseFor(), title: `${libraryCopy[locale].title} — Holistic House`, description: libraryCopy[locale].lead, alternates: { canonical: `/${locale}/library`, languages: { en: '/en/library', ru: '/ru/library', es: '/es/library' } } };
}
export default async function LibraryPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  return <LibraryHub locale={locale} />;
}
