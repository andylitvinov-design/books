import type { Metadata } from 'next';
import { metadataBaseFor } from '@/data/site-metadata';
export function spanishMetadata(path: string, title: string, description: string): Metadata {
  const base = metadataBaseFor();
  const suffix = path === '/es' ? '' : path.slice(3);
  // Absolute language URLs preserve the EN/RU homepage query parameters.
  const absolute = (pathname: string) => new URL(pathname, base).href;
  return {
    metadataBase: base, title, description,
    alternates: { canonical: absolute(path), languages: {
      es: absolute(path),
      en: absolute(suffix ? '/en' + suffix : '/?lang=en'),
      ru: absolute(suffix ? '/ru' + suffix : '/?lang=ru'),
      'x-default': absolute(suffix ? '/en' + suffix : '/'),
    } },
  };
}
