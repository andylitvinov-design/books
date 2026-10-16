import type { MetadataRoute } from "next";
import { academyPublicBlocks, mediaForRecord, preferredAcademyRecords, youtubeIdFromUrl } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";
import { getSitemapEntries } from '@/data/seo';
import { getPrioritySitemapEntries } from '@/data/seo-priority-paths';
import { metadataBaseFor } from '@/data/site-metadata';
import { getSpanishRemedySlugs } from '@/data/remedies-es';
import { getAppConfig } from '@/lib/app/config';
import { createPractitionerRepository } from '@/lib/practitioners/repository';
const academyDirectoryPaths = ["", "/reiki", "/temple-studies", "/archive", "/videos", "/history/faculties", "/reiki/tantra-reiki/free-initiation", "/principles-of-energywork", "/reiki/kundalini-reiki/free-initiation"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = metadataBaseFor().toString().replace(/\/$/, '');
  const existing = getSitemapEntries(base);
  const templeDirections = new Set(["mysteries", "symbolic", "applied", "school"]);
  const academyPaths = (["en", "ru", "es"] as PublicLocale[]).flatMap((locale) => {
    const academyRecordPaths = preferredAcademyRecords(locale)
      .filter((record) => !templeDirections.has(record.direction)
        || academyPublicBlocks(record, locale).filter((block) => block.type === "p" || block.type === "li").length >= 2
        || mediaForRecord(record).some((item) => Boolean(youtubeIdFromUrl(item.mediaUrl))))
      .map((record) => "/" + record.routeKey);
    return [...new Set([...academyDirectoryPaths, ...academyRecordPaths])].map((suffix) => "/" + locale + "/academy" + suffix);
  });
  const coreServicePaths = ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"];
  const coreServiceUrls = (["en", "ru"] as const).flatMap(locale => coreServicePaths.map(slug => `/${locale}/services/${slug}`));
  const publicPaths = ['/en/courses/antistress', '/ru/courses/antistress', '/es/courses/antistress', '/en/courses/methodology', '/ru/courses/methodology', '/es/courses/methodology', '/en/relationships', '/ru/relationships', '/en/books', '/ru/books', '/en/library', '/ru/library', '/es/library', '/en/library/distance-homeopathy', '/ru/library/distance-homeopathy', '/es/library/distance-homeopathy', '/en/wu-xing', '/ru/wu-xing', '/es/wu-xing', '/es', '/es/about', '/es/services', '/es/books', '/es/homeopathy', '/es/homeopathy/remedies', ...getSpanishRemedySlugs().map(slug => `/es/homeopathy/remedies/${slug}`),  ...coreServiceUrls, ...(['en','ru','es'] as const).flatMap(locale => ['business-consulting', 'psychohomeopathy', 'imagery-therapy', 'systemic-constellations'].map(slug => `/${locale}/services/${slug}`)), ...academyPaths];
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
  const priorityEntries = getPrioritySitemapEntries(base);
  const homepageLanguages = { en: base + '/', ru: base + '/ru', es: base + '/es', 'x-default': base + '/' };
  const homes: MetadataRoute.Sitemap = (['en', 'ru', 'es'] as const).map(locale => ({
    url: homepageLanguages[locale], changeFrequency: 'weekly', priority: locale === 'es' ? 0.8 : 1,
    alternates: { languages: homepageLanguages },
  }));
  // /books is a preference-sensitive redirect and must never be indexed.
  const unique: MetadataRoute.Sitemap = [...new Map(
    [...existing, ...entries, ...priorityEntries, ...network, ...homes]
      .filter(entry => new URL(entry.url).pathname !== '/books')
      .map(entry => [entry.url, entry]),
  ).values()];
  // Build language families only from URLs that really exist in the sitemap.
  // This avoids advertising non-existent translations in hreflang links.
  const families = new Map<string, Partial<Record<PublicLocale, string>>>();
  for (const entry of unique) {
    const pathname = new URL(entry.url).pathname;
    const match = pathname.match(/^\/(en|ru|es)(?=\/|$)/);
    const locale = pathname === '/' ? 'en' : match?.[1] as PublicLocale | undefined;
    if (!locale) continue;
    const family = pathname === '/' ? '/' : pathname.slice(locale.length + 1) || '/';
    const members = families.get(family) ?? {};
    members[locale] = entry.url;
    families.set(family, members);
  }
  // A content update date, not today's build time: crawlers should not see
  // an artificial 'changed today' value on every redeploy.
  const releaseDate = new Date('2026-10-16T00:00:00.000Z');
  return unique.map(entry => {
    const pathname = new URL(entry.url).pathname;
    const match = pathname.match(/^\/(en|ru|es)(?=\/|$)/);
    const locale = pathname === '/' ? 'en' : match?.[1] as PublicLocale | undefined;
    const family = pathname === '/' ? '/' : locale ? pathname.slice(locale.length + 1) || '/' : '';
    const members = families.get(family);
    const languages = members && Object.keys(members).length > 1
      ? { ...members, ...(members.en ? { 'x-default': members.en } : {}) }
      : undefined;
    return {
      ...entry,
      lastModified: entry.lastModified ?? releaseDate,
      ...(languages ? { alternates: { languages } } : {}),
    };
  });
}
