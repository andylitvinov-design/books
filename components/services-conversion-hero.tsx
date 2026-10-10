import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./services-conversion-hero.module.css";

const copy = {
  ru: {
    eyebrow: "Бесплатный разбор ситуации · Торонто и онлайн",
    heading: "Не знаете, как двигаться дальше? Начнём с бесплатного разбора.",
    lead: "Принесите один вопрос о самочувствии, отношениях, цели или бизнесе. В личном разговоре попробуем прояснить, что мешает, какие варианты вы пока не видите и с чего можно начать. Выбирать метод заранее не нужно.",
    benefits: ["Сформулировать ваш запрос", "Исследовать возможные препятствия и ресурсы", "Наметить реалистичный следующий шаг"],
    cta: "Записаться на бесплатную диагностику",
    small: "Бесплатная вводная беседа · без обязательств · не медицинский диагноз",
    imageLabel: "Начнём с вашего вопроса",
    caption: "Личная беседа с Андреем Литвиновым",
  },
  en: {
    eyebrow: "Free situation review · Toronto & online",
    heading: "Feeling stuck? Let's clarify your next step — for free.",
    lead: "Bring one real question about your wellbeing, relationships, goals or business. In a free personal conversation, we'll explore what's keeping you stuck and possible next steps. You don't have to choose a method first.",
    benefits: ["Put your question into words", "Explore possible obstacles and resources", "Identify a realistic next step"],
    cta: "Request my free situation review",
    small: "Free introductory conversation · no obligation · not a medical diagnosis",
    imageLabel: "Start with your question",
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
          src="/images/holistic-house/andy-about.png"
          alt={locale === "ru" ? "Портрет Андрея Литвинова" : "Portrait of Andrey Litvinov"}
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
