import type { Metadata } from 'next';
import { metadataBaseFor } from '@/data/site-metadata';
export function spanishMetadata(path: string, title: string, description: string): Metadata {
  const base = metadataBaseFor();
  const suffix = path === '/es' ? '' : path.slice(3);
  const absolute = (pathname: string) => new URL(pathname, base).href;
  return {
    // All URLs below are absolute strings. Next 15.5's alternate resolver drops
    // root-path query strings when metadataBase converts them to URL objects.
    // An explicit null keeps the distinct EN/RU homepage language parameters.
    metadataBase: null, title, description,
    alternates: { canonical: absolute(path), languages: {
      es: absolute(path),
      en: absolute(suffix ? '/en' + suffix : '/?lang=en'),
      ru: absolute(suffix ? '/ru' + suffix : '/?lang=ru'),
      'x-default': absolute(suffix ? '/en' + suffix : '/'),
    } },
  };
}
