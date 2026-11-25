import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, Compass, Heart, HeartPulse } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./public-pathway-strip.module.css";

// Public navigation only. Do not infer a visitor's personal test scores or health status.
const directions = [
  { id: "business", href: "explore/business", tone: "money", Icon: BriefcaseBusiness },
  { id: "relationships", href: "explore/love", tone: "love", Icon: Heart },
  { id: "energy_health", href: "explore/energy", tone: "energy", Icon: HeartPulse },
  { id: "personal_growth", href: "personality-profiles", tone: "meaning", Icon: Compass },
] as const;

const copy = {
  en: {
    eyebrow: "CHOOSE A DIRECTION",
    title: "Explore what matters to you",
    intro: "Start with a topic. Discover available tests, practices and personal support.",
    directions: {
      business: "Business & money",
      relationships: "Relationships",
      energy_health: "Energy & wellbeing",
      personal_growth: "Growth & meaning",
    },
  },
  ru: {
    eyebrow: "ВЫБЕРИТЕ НАПРАВЛЕНИЕ",
    title: "Исследуйте то, что важно для вас",
    intro: "Начните с темы. Найдите подходящие тесты, практики и личную поддержку.",
    directions: {
      business: "Бизнес и деньги",
      relationships: "Отношения",
      energy_health: "Энергия и здоровье",
      personal_growth: "Развитие и смыслы",
    },
  },
  es: {
    eyebrow: "ELIGE UNA DIRECCIÓN",
    title: "Explora lo que te importa",
    intro: "Empieza con un tema. Descubre tests, prácticas y apoyo personal.",
    directions: {
      business: "Negocios y dinero",
      relationships: "Relaciones",
      energy_health: "Energía y bienestar",
      personal_growth: "Crecimiento y sentido",
    },
  },
} as const;

export function PublicPathwayStrip({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <nav className={styles.section} aria-label={t.title} data-public-pathway-strip lang={locale}>
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2>{t.title}</h2>
        <p className={styles.intro}>{t.intro}</p>
      </div>
      <div className={styles.rail} data-public-pathway-topics>
        {directions.map(({ id, href, tone, Icon }) => (
          <Link key={id} href={"/" + locale + "/" + href} prefetch={false}
            data-public-pathway-topic={id} className={[styles.tile, styles[tone]].join(" ")}>
            <span className={styles.iconWrap}><Icon aria-hidden="true" size={23} /></span>
            <span className={styles.topicLabel}>{t.directions[id]}</span>
            <ArrowUpRight aria-hidden="true" size={17} className={styles.arrow} />
          </Link>
        ))}
      </div>
    </nav>
  );
}
