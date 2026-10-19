import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cardArtworkUrl, hasCardArtwork } from "@/lib/public-card-artwork";
import type { CatalogShowcaseItem } from "@/components/catalog-showcase";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./academy-course-card-list.module.css";

export type AcademyCourseItem = CatalogShowcaseItem & {
  courseHref?: string;
  free?: boolean;
  duration?: string;
};

const copy = {
  en: { free: "FREE", freeCourse: "FREE LEARNING", programme: "FULL PROGRAMME", details: "Details", start: "Take course", open: "Open programme" },
  ru: { free: "FREE", freeCourse: "БЕСПЛАТНОЕ ОБУЧЕНИЕ", programme: "ПОЛНАЯ ПРОГРАММА", details: "Подробнее", start: "Пройти курс", open: "Открыть программу" },
  es: { free: "FREE", freeCourse: "APRENDIZAJE GRATIS", programme: "PROGRAMA COMPLETO", details: "Detalles", start: "Empezar curso", open: "Abrir programa" },
} as const;

export function AcademyCourseCardList({
  locale,
  items,
  label,
}: {
  locale: PublicLocale;
  items: AcademyCourseItem[];
  label: string;
}) {
  const t = copy[locale];
  return (
    <div className={styles.list} role="list" aria-label={label} data-academy-course-card-list>
      {items.map((item) => (
        <article className={styles.card} role="listitem" key={item.id} data-academy-course-card={item.id}>
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
              <Link className={styles.details} href={item.href}>
                {t.details}<ChevronRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <Link className={styles.take} href={item.courseHref ?? item.href} prefetch={false}>
            {item.courseHref ? t.start : t.open}<ArrowRight size={19} aria-hidden="true" />
          </Link>
        </article>
      ))}
    </div>
  );
}
