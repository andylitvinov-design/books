import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { FreeSituationReviewForm } from "@/components/free-situation-review-form";
import { isSupportedLocale, getHomeopathyLocaleParams } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "../offerings.module.css";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  ru: {
    title: "Бесплатная личная консультация",
    shortName: "Бесплатная диагностика ситуации",
    description: "Краткий бесплатный первичный разбор вашей цели, бизнеса или личной проблемы: найдём точку ступора, рассмотрим возможную зону роста и подходящий следующий шаг.",
    eyebrow: "Бесплатная диагностика ситуации · без обязательств",
    lead: "Не обязательно сразу выбирать курс или метод. Расскажите о своей ситуации — на бесплатной вводной беседе обсудим, где вы чувствуете затруднение, и наметим возможные следующие шаги. Это не медицинская диагностика.",
    cards: [
      { title: "1. Запрос", text: "Расскажите, что пытаетесь изменить или к чему прийти." },
      { title: "2. Точка ступора", text: "Вместе рассмотрим, что сейчас мешает движению или ясности." },
      { title: "3. Зона роста", text: "Наметим возможные дальнейшие шаги. При желании выберем формат личной работы." },
    ],
    back: "Все индивидуальные услуги",
  },
  en: {
    title: "Free personal consultation",
    shortName: "Free situation & goal assessment",
    description: "A free introductory review of your goal, business or personal difficulty: identify where you feel stuck, possible areas for growth and a useful next step.",
    eyebrow: "Free situation & goal assessment · no obligation",
    lead: "You do not need to choose a program first. Tell me about your situation; in a free introductory conversation we can explore where you feel stuck and clarify a possible next step. This is not a medical diagnosis.",
    cards: [
      { title: "1. Your question", text: "Tell me what you want to change or achieve." },
      { title: "2. Where you're stuck", text: "We'll explore the point where progress or clarity feels blocked." },
      { title: "3. Growth possibilities", text: "We'll outline possible next steps. You can choose whether to continue with personal sessions." },
    ],
    back: "All personal services",
  },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " — Holistic House",
    description: t.description,
    alternates: { canonical: "/" + locale + "/services/free-situation-review", languages: { en: "/en/services/free-situation-review", ru: "/ru/services/free-situation-review" } },
  };
}

export default async function FreeSituationReviewPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = copy[locale];
  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <section className={styles.hero}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p>{t.lead}</p>
        <Link className={styles.breadcrumb} href={"/" + locale + "/services"}>← {t.back}</Link>
      </section>
      <div className={styles.contentGrid}>
        <FreeSituationReviewForm locale={locale} />
        <aside className={styles.article}>
          <h2>{locale === "ru" ? "После разбора" : "After the review"}</h2>
          <p>{locale === "ru" ? "Вы можете остановиться на первичном разборе или выбрать один из трёх форматов индивидуальной работы. Никакой обязательной покупки нет." : "You can stop after the initial review or explore one of three personal-work services. There is no obligation to purchase anything."}</p>
          <ul>
            <li><Link href={"/" + locale + "/services/andy-litvinov/homeopathy-consultation"}>{locale === "ru" ? "Гомеопатия — обсуждение ресурса и самочувствия" : "Homeopathy — wellbeing and personal resources"}</Link></li>
            <li><Link href={"/" + locale + "/services/imagery-therapy"}>{locale === "ru" ? "Образная терапия — внутренняя устойчивость" : "Guided imagery — inner stability"}</Link></li>
            <li><Link href={"/" + locale + "/services/andy-litvinov/personal-constellation-session"}>{locale === "ru" ? "Расстановки — цели и новые перспективы" : "Constellations — goals and new perspectives"}</Link></li>
          </ul>
          <p className={styles.disclaimer}>{locale === "ru" ? "Этот разбор не заменяет медицинскую диагностику, лечение или профессиональную финансовую и юридическую экспертизу." : "This review is not a substitute for medical diagnosis, treatment, or professional financial and legal advice."}</p>
        </aside>
      </div>
      <section className={styles.details} aria-label={t.title}>
        <div className={styles.cards}>
          {t.cards.map((card) => <article className={styles.card} key={card.title}><h3>{card.title}</h3><p>{card.text}</p></article>)}
        </div>
      </section>
    </main>
  );
}
