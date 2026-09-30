import type { Metadata } from 'next';
import { metadataBaseFor } from '@/data/site-metadata';
export function spanishMetadata(path: string, title: string, description: string): Metadata {
  const suffix = path === '/es' ? '' : path.slice(3);
  return {
    metadataBase: metadataBaseFor(), title, description,
    alternates: { canonical: path, languages: {
      es: path,
      en: suffix ? '/en' + suffix : '/?lang=en',
      ru: suffix ? '/ru' + suffix : '/?lang=ru',
      'x-default': suffix ? '/en' + suffix : '/',
    } },
  };
}
