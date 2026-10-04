import type { MetadataRoute } from "next";
import { getAcademyRecords } from "@/data/academy/catalog";
import { getSitemapEntries } from '@/data/seo';
import { metadataBaseFor } from '@/data/site-metadata';
import { getSpanishRemedySlugs } from '@/data/remedies-es';
const academyDirectoryPaths = ["", "/reiki", "/mysteries", "/symbolic", "/applied", "/path", "/archive", "/videos", "/traditions", "/runes", "/elements", "/history/faculties"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = metadataBaseFor().toString().replace(/\/$/, '');
  const existing = getSitemapEntries(base);
  const academyRecordPaths = [...new Set(getAcademyRecords().map((record) => "/" + record.routeKey))];
  const academyPaths = ["en", "ru", "es"].flatMap((locale) =>
    [...new Set([...academyDirectoryPaths, ...academyRecordPaths])].map((suffix) => "/" + locale + "/academy" + suffix),
  );
  const publicPaths = ['/en/library', '/ru/library', '/es/library', '/es', '/es/about', '/es/services', '/es/books', '/es/homeopathy', '/es/homeopathy/remedies', ...getSpanishRemedySlugs().map(slug => `/es/homeopathy/remedies/${slug}`), ...academyPaths];
  const entries: MetadataRoute.Sitemap = publicPaths.map(path => ({ url: base + path, changeFrequency: 'monthly', priority: path === '/es' ? 0.8 : 0.6 }));
  return [...new Map([...existing, ...entries].map(entry => [entry.url, entry])).values()];
}
