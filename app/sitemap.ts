import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/data/seo';
import { metadataBaseFor } from '@/data/site-metadata';
import { getSpanishRemedySlugs } from '@/data/remedies-es';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = metadataBaseFor().toString().replace(/\/$/, '');
  const existing = getSitemapEntries(base);
  const publicPaths = ['/es', '/es/about', '/es/services', '/es/books', '/es/homeopathy', '/es/homeopathy/remedies', ...getSpanishRemedySlugs().map(slug => `/es/homeopathy/remedies/${slug}`)];
  const entries: MetadataRoute.Sitemap = publicPaths.map(path => ({ url: base + path, changeFrequency: 'monthly', priority: path === '/es' ? 0.8 : 0.6 }));
  return [...new Map([...existing, ...entries].map(entry => [entry.url, entry])).values()];
}
