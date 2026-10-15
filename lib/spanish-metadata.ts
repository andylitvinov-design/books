import type { Metadata } from 'next';
import { metadataBaseFor } from '@/data/site-metadata';
export function spanishMetadata(path: string, title: string, description: string): Metadata {
  const base = metadataBaseFor();
  const suffix = path === '/es' ? '' : path.slice(3);
  const absolute = (pathname: string) => new URL(pathname, base).href;
  return {
    // Use absolute locale URLs, including the distinct Russian /ru homepage.
    metadataBase: null, title, description,
    alternates: { canonical: absolute(path), languages: {
      es: absolute(path),
      en: absolute(suffix ? '/en' + suffix : '/'),
      ru: absolute(suffix ? '/ru' + suffix : '/ru'),
      'x-default': absolute(suffix ? '/en' + suffix : '/'),
    } },
  };
}
