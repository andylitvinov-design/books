import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./services-conversion-hero.module.css";

const copy = {
  ru: {
    eyebrow: "Бесплатная диагностика по рисунку · письменный отчёт",
    heading: "Бесплатная диагностика ситуации по вашему рисунку",
    lead: "Опишите проблему в коучинг-форме и нарисуйте на бумаге ручкой «Я — цель — проблема». Я подготовлю личный письменный отчёт. Платная сессия не обязательна.",
    benefits: ["Заполните коучинг-форму", "Нарисуйте ситуацию ручкой", "Получите письменный отчёт"],
    cta: "Начать бесплатную диагностику",
    small: "Бесплатно · без звонка · не медицинский диагноз",
    imageLabel: "Ваш вопрос, рисунок, письменный ответ",
    caption: "Персональный письменный разбор от Андрея",
  },
  en: {
    eyebrow: "Free drawing assessment · written report",
    heading: "Your free situation assessment starts with a drawing",
    lead: "Describe your concern in a coaching form and draw ME, GOAL and PROBLEM by hand on paper. I'll send you a personal written report. Live sessions are separate paid services.",
    benefits: ["Complete the coaching form", "Draw by hand on paper", "Receive your written report"],
    cta: "Start my free drawing assessment",
    small: "Free · no live call · not a medical diagnosis",
    imageLabel: "Your question, drawing and written review",
    caption: "A personal written review from Andrey",
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
        <Link className={styles.cta} href={"/" + locale + "/services/free-situation-review"}>
          {t.cta}<ArrowUpRight size={21} aria-hidden="true" />
        </Link>
        <p className={styles.small}>{t.small}</p>
        <ul className={styles.benefits}>
          {t.benefits.map((benefit) => <li key={benefit}><Check size={17} strokeWidth={2.3} aria-hidden="true" />{benefit}</li>)}
        </ul>
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
