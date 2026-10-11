import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./services-conversion-hero.module.css";

const copy = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · ЛИЧНАЯ РАБОТА",
    heading: "Больше ясности, опоры и вариантов движения",
    lead: "Три бесплатных способа начать: психологические тесты, личный разбор ситуации или профиль ресурсов У-Син. При желании можно продолжить личную работу.",
    benefits: ["3 бесплатных направления", "Личная работа по желанию", "Торонто и онлайн"],
    cta: "Бесплатный разбор ситуации",
    secondary: "Все три бесплатных варианта",
    small: "Бесплатный разбор — письменный, без обязательного созвона",
    imageLabel: "Лично с Андреем Литвиновым",
    caption: "Начните со своего вопроса",
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · PERSONAL SUPPORT",
    heading: "More clarity, inner resources and choices",
    lead: "Three free ways to begin: psychological self-checks, a personal situation review, or a Wu Xing resource profile. Personal sessions are optional.",
    benefits: ["3 free starting points", "Optional one-to-one work", "Toronto & online"],
    cta: "Get a free situation review",
    secondary: "See all three free options",
    small: "The free situation review is written, not a free call",
    imageLabel: "Personal work with Andrey Litvinov",
    caption: "Start with your question",
  },
} as const;

export function ServicesConversionHero({ locale }: { locale: Locale }) {
  const t = copy[locale];
  return (
    <section className={styles.hero} aria-labelledby="services-conversion-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}><span className={styles.spark} aria-hidden="true">✦</span>{t.eyebrow}</p>
        <h1 id="services-conversion-title">{t.heading}</h1>
        <p className={styles.lead}>{t.lead}</p>
        <div className={styles.actions}>
          <Link className={styles.cta} href={"/" + locale + "/services/free-situation-review"}>
            {t.cta}<ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <Link className={styles.secondary} href="#free-insights">{t.secondary}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
        <p className={styles.small}>{t.small}</p>
        <ul className={styles.benefits}>
          {t.benefits.map(benefit => <li key={benefit}><Check size={16} strokeWidth={2.2} aria-hidden="true" />{benefit}</li>)}
        </ul>
      </div>
      <div className={styles.visual}>
        <Image
          src="/images/holistic-house/andy-about.png"
          alt={locale === "ru" ? "Андрей Литвинов" : "Andrey Litvinov"}
          fill priority sizes="(max-width: 760px) 100vw, 42vw" className={styles.image}
        />
        <div className={styles.visualText}>
          <span className={styles.visualLabel}>{t.imageLabel}</span>
          <p>{t.caption}</p>
        </div>
      </div>
    </section>
  );
}
