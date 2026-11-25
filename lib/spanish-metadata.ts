import type { Metadata } from 'next';
import { metadataBaseFor } from '@/data/site-metadata';
export function spanishMetadata(path: string, title: string, description: string): Metadata {
  const base = metadataBaseFor();
  const suffix = path === '/es' ? '' : path.slice(3);
  const absolute = (pathname: string) => new URL(pathname, base).href;
  return {
    // Use absolute locale URLs, including the distinct Russian /ru homepage.
    metadataBase: base, title, description,
    alternates: { canonical: absolute(path), languages: {
      es: absolute(path),
      en: absolute(suffix ? '/en' + suffix : '/'),
      ru: absolute(suffix ? '/ru' + suffix : '/ru'),
      'x-default': absolute(suffix ? '/en' + suffix : '/'),
    } },
    openGraph: { type: 'website', siteName: 'Holistic House', locale: 'es_ES', url: absolute(path), title, description,
      images: [{ url: absolute('/images/holistic-house/andy-about.png'), alt: 'Andrey Litvinov — Holistic House' }] },
    twitter: { card: 'summary_large_image', title, description, images: [absolute('/images/holistic-house/andy-about.png')] },
  };
}
