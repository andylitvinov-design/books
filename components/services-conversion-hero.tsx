import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./services-conversion-hero.module.css";

const copy = {
  ru: {
    eyebrow: "Бесплатная вводная консультация · Торонто и онлайн",
    heading: "Чувствуете, что застряли? Найдём, с чего начать.",
    lead: "Когда не хватает сил, ясности или движения к цели, сначала важно понять, что мешает. На бесплатной личной консультации мы обсудим вашу ситуацию и наметим возможный следующий шаг.",
    benefits: ["Прояснить вашу ситуацию", "Найти точку ступора", "Увидеть возможный путь вперёд"],
    cta: "Запросить бесплатную консультацию",
    small: "Бесплатно · лично · без обязательства продолжать",
    imageLabel: "Начнём с вашей ситуации",
    caption: "Личная беседа с Андреем Литвиновым",
  },
  en: {
    eyebrow: "Free introductory consultation · Toronto & online",
    heading: "Feeling stuck? Let's find your next step.",
    lead: "If you're low on energy, unsure what to do, or struggling to move toward a goal, we can start by understanding what's getting in the way. In a free one-to-one consultation, we'll explore your situation and clarify a possible next step.",
    benefits: ["Clarify your situation", "Explore what's holding you back", "Find a direction forward"],
    cta: "Request my free consultation",
    small: "Free · personal · no obligation to continue",
    imageLabel: "Start with your situation",
    caption: "A personal conversation with Andrey Litvinov",
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
        <ul className={styles.benefits}>
          {t.benefits.map((benefit) => <li key={benefit}><Check size={17} strokeWidth={2.3} aria-hidden="true" />{benefit}</li>)}
        </ul>
        <Link className={styles.cta} href={`/${locale}/services/free-situation-review`}>
          {t.cta}<ArrowUpRight size={21} aria-hidden="true" />
        </Link>
        <p className={styles.small}>{t.small}</p>
      </div>
      <div className={styles.visual}>
        <Image
          src="/images/holistic-house/hero-olive-incense.webp"
          alt=""
          fill
          priority
          sizes="(max-width: 760px) 100vw, 42vw"
          className={styles.image}
        />
        <div className={styles.visualText}>
          <span className={styles.visualLabel}>{t.imageLabel}</span>
          <p>{t.caption}</p>
        </div>
      </div>
    </section>
  );
}
