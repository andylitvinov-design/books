import Link from "next/link";
import { Leaf } from "lucide-react";
import styles from "./holistic-house-brand.module.css";

export type HolisticHouseBrandLocale = "ru" | "en" | "es";

/** Shamanic-inspired shared wordmark: both the leaf and name return home. */
export function HolisticHouseBrand({
  locale, section, heading = false,
}: {
  locale: HolisticHouseBrandLocale;
  section?: string;
  heading?: boolean;
}) {
  const href = locale === "en" ? "/" : `/${locale}`;
  const homeLabel = {
    en: "Holistic House — home",
    ru: "Holistic House — главная",
    es: "Holistic House — inicio",
  }[locale];
  const title = heading
    ? <h1 className={styles.name}>Holistic House</h1>
    : <span className={styles.name}>Holistic House</span>;
  return <Link
    href={href}
    className={styles.brand}
    aria-label={homeLabel}
    title={homeLabel}
    prefetch={false}
    data-hh-site-brand={locale}
  >
    <Leaf className={styles.icon} size={32} strokeWidth={1.8} aria-hidden="true" />
    <span className={styles.copy}>{title}
      {section ? <small className={styles.section} title={section}>{section}</small> : null}
    </span>
  </Link>;
}
