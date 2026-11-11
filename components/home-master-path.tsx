import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-master-path.module.css";

// The homepage only needs a closing invitation. The full personal/master
// journey, free tests, training and publishing tools live on the Pro page.
const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · PRO",
    title: "Become a Master",
    description: "Learn Reiki step by step, or bring your experience and share your own services and courses.",
    explore: "Explore the Pro path",
    publish: "List my services",
    note: "Basic listings are free and reviewed before publication. Free learning does not grant a professional qualification.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПРОФИ",
    title: "Станьте мастером",
    description: "Изучайте Рейки с нуля или делитесь своим опытом — размещайте услуги и собственные курсы.",
    explore: "Открыть раздел «Профи»",
    publish: "Разместить свои услуги",
    note: "Базовое размещение бесплатно, публикация после модерации. Бесплатное обучение не присваивает профессиональную квалификацию.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · PRO",
    title: "Hazte profesional",
    description: "Aprende Reiki paso a paso o comparte tu experiencia ofreciendo servicios y cursos propios.",
    explore: "Explorar el camino Pro",
    publish: "Publicar mis servicios",
    note: "La publicación básica es gratis y requiere revisión. La formación gratuita no acredita una cualificación profesional.",
  },
} as const;

export function HomeMasterPath({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  // Private My Practice supports EN/RU. Spanish marketing stays in Spanish.

  return (
    <section className={styles.section} aria-labelledby="hh-home-master-invitation-title" data-home-master-invitation>
      <div className={styles.photo} aria-hidden="true">
        <Image
          src="/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp"
          alt=""
          fill
          sizes="(max-width: 640px) 108px, (max-width: 960px) 210px, 234px"
          loading="lazy"
        />
      </div>
      <div className={styles.intro}>
        <p className={styles.eyebrow}><GraduationCap size={16} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="hh-home-master-invitation-title">{t.title}</h2>
        <p className={styles.description}>{t.description}</p>
      </div>
      <nav className={styles.actions} aria-label={t.title}>
        <Link className={styles.primary} href={"/" + locale + "/pro"} prefetch={false} data-home-master-action="explore-pro">
          {t.explore}<ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link className={styles.secondary} href={"/" + locale + "/practice"} prefetch={false}
          data-home-master-action="publish-service">
          {t.publish}<ArrowRight size={17} aria-hidden="true" />
        </Link>
      </nav>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
