import type { MetadataRoute } from "next";
import { academyPublicBlocks, mediaForRecord, preferredAcademyRecords, youtubeIdFromUrl } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";
import { getPrioritySitemapEntries } from '@/data/seo-priority-paths';
import { PUBLIC_EVENTS } from '@/data/public-events';
import { TOPIC_JOURNEYS } from '@/lib/assessments/topic-journeys';
import { metadataBaseFor } from '@/data/site-metadata';
import { getAppConfig } from '@/lib/app/config';
import { createPractitionerRepository } from '@/lib/practitioners/repository';
import { createArticleRepository } from '@/lib/practitioners/article-repository';
const academyDirectoryPaths = ["", "/free-ai-courses", "/reiki", "/temple-studies", "/archive", "/videos", "/history/faculties", "/reiki/tantra-reiki/free-initiation", "/reiki/free-practitioner-course", "/principles-of-energywork", "/reiki/kundalini-reiki/free-initiation"];

// A missing data asset in a Vercel Function must not bring down the whole public
// sitemap. Normal deployments include all files via next.config.ts tracing.
async function loadSeoEntries(base: string): Promise<MetadataRoute.Sitemap> {
  try {
    const { getSitemapEntries } = await import("@/data/seo");
    return getSitemapEntries(base);
  } catch (error) {
    console.error("[sitemap] SEO remedy catalog unavailable; returning other public URLs", error);
    return [];
  }
}

async function loadSpanishRemedyPaths(): Promise<string[]> {
  try {
    const { getSpanishRemedySlugs } = await import("@/data/remedies-es");
    return getSpanishRemedySlugs().map(slug => `/es/homeopathy/remedies/${slug}`);
  } catch (error) {
    console.error("[sitemap] Spanish remedy catalog unavailable; returning other public URLs", error);
    return [];
  }
}

// Recompute upcoming event URLs as confirmed dates pass.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = metadataBaseFor().toString().replace(/\/$/, '');
  const existing = await loadSeoEntries(base);
  const spanishRemedyPaths = await loadSpanishRemedyPaths();
  const templeDirections = new Set(["mysteries", "symbolic", "applied", "school"]);
  const academyPaths = (["en", "ru", "es"] as PublicLocale[]).flatMap((locale) => {
    const academyRecordPaths = preferredAcademyRecords(locale)
      .filter((record) => !templeDirections.has(record.direction)
        || academyPublicBlocks(record, locale).filter((block) => block.type === "p" || block.type === "li").length >= 2
        || mediaForRecord(record).some((item) => Boolean(youtubeIdFromUrl(item.mediaUrl))))
      .map((record) => "/" + record.routeKey);
    return [...new Set([...academyDirectoryPaths, ...academyRecordPaths])]
      .filter(suffix => suffix !== "/reiki/master-shamanic-healing") // permanently redirected to Yggdrasil Basic
      .map((suffix) => "/" + locale + "/academy" + suffix);
  });
  const coreServicePaths = ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"];
  const coreServiceUrls = (["en", "ru", "es"] as const).flatMap(locale => coreServicePaths.map(slug => `/${locale}/services/${slug}`));
  const topicJourneys = (['en','ru','es'] as const).flatMap(locale => TOPIC_JOURNEYS.map(journey => `/${locale}/explore/${journey.id}`));
  const verifiedEventPages = (['en', 'ru', 'es'] as const).flatMap(locale =>
    PUBLIC_EVENTS.filter(event => event.status === 'published'
      && Number.isFinite(Date.parse(event.startsAt))
      && Date.parse(event.startsAt) >= Date.now()
      && (event.registrationHref.startsWith('https://') || event.registrationHref.startsWith('/')))
      .map(event => '/' + locale + '/events/' + encodeURIComponent(event.id)));
  const publicPaths = [...(['en','ru','es'] as const).map(locale => '/' + locale + '/events'), ...verifiedEventPages, ...topicJourneys, '/en/toronto', '/ru/toronto', '/es/toronto', '/en/courses/antistress', '/ru/courses/antistress', '/es/courses/antistress', '/en/courses/methodology', '/ru/courses/methodology', '/es/courses/methodology', '/en/explore/relationships', '/ru/explore/relationships', '/en/books', '/ru/books', '/en/library', '/ru/library', '/es/library', '/en/library/distance-homeopathy', '/ru/library/distance-homeopathy', '/es/library/distance-homeopathy', '/en/wu-xing', '/ru/wu-xing', '/es/wu-xing', '/es', '/es/about', '/es/services', '/es/books', '/es/homeopathy', '/es/homeopathy/remedies', ...spanishRemedyPaths,  ...coreServiceUrls, ...(['en','ru','es'] as const).flatMap(locale => [`/${locale}/services/business-consulting`, ...['psychohomeopathy', 'imagery-therapy', 'systemic-constellations'].map(slug => `/${locale}/services/${slug}`)]), ...academyPaths];
  const entries: MetadataRoute.Sitemap = publicPaths.map(path => ({
    url: base + path, changeFrequency: path.includes('/explore/') ? 'weekly' : 'monthly',
    priority: path === '/es' ? 0.8 : 0.6,
    ...(path.includes('/explore/') ? { lastModified: new Date('2026-10-18T00:00:00.000Z') } : {}),
  }));
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
    // Only real published articles are indexed; never include drafts or other languages.
    for (const locale of ['en','ru','es']) {
      const articles=await createArticleRepository(getAppConfig()).publicList(locale);
      network.push({url:base+'/'+locale+'/articles',changeFrequency:'weekly',priority:0.5});
      for(const article of articles) network.push({url:base+'/'+locale+'/articles/'+article.slug,changeFrequency:'monthly',priority:0.6});
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
  // No redirecting URLs in sitemap: exclude known legacy service aliases too.
  const knownServiceRedirects = new Set([
    '/en/services/psychohomeopathy',
    '/ru/services/psychohomeopathy',
    '/es/services/psychohomeopathy',
    '/en/services/andy-litvinov/homeopathy-consultation',
    '/ru/services/andy-litvinov/homeopathy-consultation',
  ]);
  const unique: MetadataRoute.Sitemap = [...new Map(
    [...existing, ...entries, ...priorityEntries, ...network, ...homes]
      .filter(entry => {
        const pathname = new URL(entry.url).pathname;
        return pathname !== '/books' && !pathname.startsWith('/books/') && !knownServiceRedirects.has(pathname);
      })
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
