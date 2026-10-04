import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PublicSiteHeader } from "@/components/public-site-header";
import {
  academyCopy,
  academyDirections,
  academyDisplayTitle,
  recordsForDirection,
  videoRecords,
  type AcademyDirectionId,
  type AcademySourceRecord,
  type AcademyView,
} from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";

type AcademyItem = { key: string; title: string; href: string; image: string; meta?: string; };

function recordImage(record: AcademySourceRecord) {
  if (record.direction === "videos") return "/images/holistic-house/video-posters/services-en-v2.webp";
  return academyDirections.find((item) => item.id === record.direction)?.image ?? "/images/holistic-house/books-library.webp";
}

function AcademyIndex({ items, label }: { items: AcademyItem[]; label: string }) {
  return (
    <section className="library-index-grid" aria-label={label}>
      {items.map((item) => (
        <Link className="library-index-card academy-index-card" href={item.href} key={item.key}>
          <span className="library-index-photo"><Image alt="" fill sizes="(max-width: 700px) 76px, 128px" src={item.image} /></span>
          <span className="academy-index-copy">
            <span className="library-index-title">{item.title}</span>
            {item.meta ? <small>{item.meta}</small> : null}
          </span>
          <ChevronRight aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}

function statusLabel(record: AcademySourceRecord, locale: PublicLocale) {
  return academyCopy[locale][record.status] ?? academyCopy[locale].historical;
}

export function AcademyBackLink({ locale }: { locale: PublicLocale }) {
  return <Link className="library-back-link" href={"/" + locale + "/academy"}>← {academyCopy[locale].back}</Link>;
}

export function AcademyHub({ locale, view = "programs" }: { locale: PublicLocale; view?: AcademyView }) {
  const text = academyCopy[locale];
  const items: AcademyItem[] = view === "videos"
    ? videoRecords(locale).map((record) => ({
        key: record.logicalId,
        title: academyDisplayTitle(record, locale),
        href: "/" + locale + "/academy/" + record.routeKey,
        image: recordImage(record),
        meta: statusLabel(record, locale),
      }))
    : academyDirections.map((direction) => ({
        key: direction.id,
        title: direction.title[locale],
        href: "/" + locale + "/academy/" + direction.path,
        image: direction.image,
      }));

  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} />
      <nav className="library-media-switch" aria-label={text.title}>
        <Link aria-current={view === "programs" ? "page" : undefined} href={"/" + locale + "/academy"}>{text.programs}</Link>
        <Link aria-current={view === "videos" ? "page" : undefined} href={"/" + locale + "/academy?view=videos"}>{text.videos}</Link>
      </nav>
      <header className="library-heading"><p className="homeopathy-kicker">Holistic House</p><h1>{text.title}</h1><p>{text.lead}</p></header>
      <AcademyIndex items={items} label={view === "videos" ? text.videoCollections : text.allPrograms} />
    </main>
  );
}

export function AcademyDirection({ locale, direction }: { locale: PublicLocale; direction: AcademyDirectionId }) {
  const info = academyDirections.find((item) => item.id === direction);
  if (!info) return null;
  const items = recordsForDirection(direction, locale).map((record) => ({
    key: record.logicalId,
    title: academyDisplayTitle(record, locale),
    href: "/" + locale + "/academy/" + record.routeKey,
    image: recordImage(record),
    meta: statusLabel(record, locale),
  }));
  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} /><AcademyBackLink locale={locale} />
      <header className="library-heading academy-direction-heading"><p className="homeopathy-kicker">{academyCopy[locale].title}</p><h1>{info.title[locale]}</h1><p>{info.description[locale]}</p></header>
      <AcademyIndex items={items} label={info.title[locale]} />
    </main>
  );
}

export function AcademyPrefixDirectory({ locale, prefix, title, description }: { locale: PublicLocale; prefix: string; title: string; description: string }) {
  const records = [...new Map(
    recordsForDirection("symbolic", locale)
      .concat(recordsForDirection("mysteries", locale))
      .concat(recordsForDirection("applied", locale))
      .filter((record) => record.routeKey.startsWith(prefix + "/"))
      .map((record) => [record.logicalId, record]),
  ).values()];
  const items = records.map((record) => ({
    key: record.logicalId,
    title: academyDisplayTitle(record, locale),
    href: "/" + locale + "/academy/" + record.routeKey,
    image: recordImage(record),
    meta: statusLabel(record, locale),
  }));
  return (
    <main className="library-shell academy-shell" lang={locale}>
      <PublicSiteHeader locale={locale} /><AcademyBackLink locale={locale} />
      <header className="library-heading academy-direction-heading"><p className="homeopathy-kicker">{academyCopy[locale].title}</p><h1>{title}</h1><p>{description}</p></header>
      <AcademyIndex items={items} label={title} />
    </main>
  );
}
