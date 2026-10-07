import type { MetadataRoute } from "next";
import { getAcademyRecords } from "@/data/academy/catalog";
import { getSitemapEntries } from '@/data/seo';
import { metadataBaseFor } from '@/data/site-metadata';
import { getSpanishRemedySlugs } from '@/data/remedies-es';
import { getAppConfig } from '@/lib/app/config';
import { createPractitionerRepository } from '@/lib/practitioners/repository';
const academyDirectoryPaths = ["", "/reiki", "/mysteries", "/symbolic", "/applied", "/path", "/archive", "/videos", "/traditions", "/runes", "/elements", "/history/faculties"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = metadataBaseFor().toString().replace(/\/$/, '');
  const existing = getSitemapEntries(base);
  const academyRecordPaths = [...new Set(getAcademyRecords().map((record) => "/" + record.routeKey))];
  const academyPaths = ["en", "ru", "es"].flatMap((locale) =>
    [...new Set([...academyDirectoryPaths, ...academyRecordPaths])].map((suffix) => "/" + locale + "/academy" + suffix),
  );
  const publicPaths = ['/en/library', '/ru/library', '/es/library', '/en/library/distance-homeopathy', '/ru/library/distance-homeopathy', '/es/library/distance-homeopathy', '/en/wu-xing', '/ru/wu-xing', '/es/wu-xing', '/es', '/es/about', '/es/services', '/es/books', '/es/homeopathy', '/es/homeopathy/remedies', ...getSpanishRemedySlugs().map(slug => `/es/homeopathy/remedies/${slug}`), ...academyPaths];
  const entries: MetadataRoute.Sitemap = publicPaths.map(path => ({ url: base + path, changeFrequency: 'monthly', priority: path === '/es' ? 0.8 : 0.6 }));
  const network: MetadataRoute.Sitemap = [];
  try {
    const repository = createPractitionerRepository(getAppConfig());
    for (const locale of ['en','ru']) {
      const practitioners = await repository.listPublicPractitioners(locale);
      network.push({ url: base + '/' + locale + '/masters', changeFrequency: 'weekly', priority: 0.6 });
      for (const practitioner of practitioners) {
        network.push({ url: base + '/' + locale + '/masters/' + practitioner.slug, changeFrequency: 'monthly', priority: 0.6 });
        for (const service of practitioner.services || [])
          network.push({ url: base + '/' + locale + '/services/' + practitioner.slug + '/' + service.slug, changeFrequency: 'monthly', priority: 0.7 });
      }
    }
  } catch {
    // Keep the static sitemap healthy during a temporary app-database outage.
  }
  return [...new Map([...existing, ...entries, ...network].map(entry => [entry.url, entry])).values()];
}
