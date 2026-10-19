"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cardArtworkUrl, hasCardArtwork } from "@/lib/public-card-artwork";
import type { CatalogShowcaseItem } from "@/components/catalog-showcase";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-course-card-list.module.css";

export type AcademyCourseItem = CatalogShowcaseItem & {
  courseHref?: string;
  free?: boolean;
  duration?: string;
  detailsHint?: string;
};

const copy = {
  en: {
    free: "FREE", freeCourse: "FREE LEARNING", programme: "FULL PROGRAMME",
    details: "Details", hideDetails: "Less details",
    hint: "Explore the course format, learning materials and programme overview before you begin.",
    landing: "View course page", start: "Take course", open: "Open programme",
  },
  ru: {
    free: "FREE", freeCourse: "БЕСПЛАТНОЕ ОБУЧЕНИЕ", programme: "ПОЛНАЯ ПРОГРАММА",
    details: "Подробнее", hideDetails: "Свернуть",
    hint: "На странице курса можно посмотреть программу, формат занятий и учебные материалы.",
    landing: "Открыть страницу курса", start: "Пройти курс", open: "Открыть программу",
  },
  es: {
    free: "FREE", freeCourse: "APRENDIZAJE GRATIS", programme: "PROGRAMA COMPLETO",
    details: "Detalles", hideDetails: "Ocultar",
    hint: "Consulta el formato, los materiales y el programa completo antes de comenzar.",
    landing: "Ver página del curso", start: "Empezar curso", open: "Abrir programa",
  },
} as const;

function AcademyCourseCard({ item, locale }: { item: AcademyCourseItem; locale: PublicLocale }) {
  const t = copy[locale];
  const [showDetails, setShowDetails] = useState(false);
  const hintId = `academy-course-hint-${item.id}`;

  return (
    <article className={styles.card} role="listitem" data-academy-course-card={item.id}>
      <div className={styles.upper}>
        <Link className={styles.photo} href={item.href} aria-label={item.title}>
          {item.image ? (
            <Image
              src={cardArtworkUrl(item.image)}
              unoptimized={hasCardArtwork(item.image)}
              alt=""
              fill
              sizes="(max-width: 560px) 110px, (max-width: 960px) 150px, 138px"
            />
          ) : null}
        </Link>
        <div className={styles.content}>
          <div className={styles.topline}>
            <span className={styles.type}>{item.subtitle ?? (item.free ? t.freeCourse : t.programme)}</span>
            {item.free ? <span className={styles.free} aria-label={t.free}>{t.free}</span> : null}
          </div>
          <h3>{item.title}</h3>
          {item.duration ? <span className={styles.duration}>{item.duration}</span> : null}
          <p>{item.description}</p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.details}
              aria-expanded={showDetails}
              aria-controls={hintId}
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? t.hideDetails : t.details}
              <ChevronDown className={showDetails ? styles.chevronOpen : styles.chevron} size={15} aria-hidden="true" />
            </button>
            <Link className={styles.take} href={item.courseHref ?? item.href} prefetch={false}>
              {item.courseHref ? t.start : t.open}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
      <div className={styles.hint} id={hintId} hidden={!showDetails}>
        <p>{item.detailsHint ?? t.hint}</p>
        <Link className={styles.landing} href={item.href}>
          {t.landing}<ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export function AcademyCourseCardList({
  locale,
  items,
  label,
}: {
  locale: PublicLocale;
  items: AcademyCourseItem[];
  label: string;
}) {
  return (
    <div className={styles.list} role="list" aria-label={label} data-academy-course-card-list>
      {items.map((item) => (
        <AcademyCourseCard key={item.id} item={item} locale={locale} />
      ))}
    </div>
  );
}
