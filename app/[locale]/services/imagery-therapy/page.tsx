import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { PersonalConsultationForm } from "@/components/personal-consultation-form";
import { isSupportedLocale, getHomeopathyLocaleParams } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "../offerings.module.css";

type Props = { params: Promise<{ locale: string }> };
const copy = {
  ru: {
    title: "Образная терапия — индивидуальные сессии",
    eyebrow: "Индивидуальная услуга · Торонто и онлайн",
    description: "Работа с внутренними образами, чувствами и повторяющимися реакциями. Исследование проблемы, устойчивости, границ и личной силы.",
    lead: "Когда проблема повторяется, а решения вроде бы понятны, но всё равно трудно двигаться, можно исследовать её глубже через образы, чувства и внутренние части. Вместе мы разбираем ваш опыт и ищем собственные способы двигаться дальше.",
    heading: "С чем можно работать",
    points: [
      "Внутренние конфликты, страх оценки и сложность проявляться.",
      "Повторяющиеся реакции, отношения и внутренние ограничения.",
      "Личная устойчивость, границы, ощущение опоры и желаемое направление.",
    ],
    process: "На индивидуальной встрече мы уточняем запрос, договариваемся о границах работы и используем образы или другие способы исследования, только если вы согласны. Метод не гарантирует конкретный внешний результат.",
    request: "Запросить сессию образной терапии",
    back: "Все мои услуги",
  },
  en: {
    title: "Guided imagery therapy — personal sessions",
    eyebrow: "Personal service · Toronto and online",
    description: "Individual imagery-based exploration of feelings, repeating responses, inner conflicts, personal boundaries and stability.",
    lead: "When a pattern keeps repeating, or you know what you want but find it hard to move, imagery-based personal work can help you explore it in a different way. We work with your feelings, images and inner parts to understand what matters to you.",
    heading: "Questions we can explore",
    points: [
      "Inner conflict, fear of judgement and difficulty showing up as yourself.",
      "Repeating reactions, relationship patterns and inner limitations.",
      "Stability, boundaries, a sense of support and possible next steps.",
    ],
    process: "We agree on your question and boundaries before beginning. Imagery and other experiential approaches are optional and used by mutual agreement. No external outcome is guaranteed.",
    request: "Request an imagery therapy session",
    back: "All my services",
  },
} as const;

export function generateStaticParams() { return getHomeopathyLocaleParams(); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(), title: t.title + " — Holistic House", description: t.description,
    alternates: { canonical: "/" + locale + "/services/imagery-therapy", languages: { en: "/en/services/imagery-therapy", ru: "/ru/services/imagery-therapy" } },
  };
}
export default async function ImageryTherapyPage({ params }: Props) {
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
        <article className={styles.article}>
          <h2>{t.heading}</h2>
          <ul>{t.points.map((point) => <li key={point}>{point}</li>)}</ul>
          <p>{t.process}</p>
          <p className={styles.disclaimer}>{locale === "ru" ? "Личная работа не заменяет медицинскую диагностику, неотложную помощь или психиатрическое лечение." : "Personal work is not a substitute for medical assessment, urgent care or psychiatric treatment."}</p>
          <Link className={styles.breadcrumb} href={"/" + locale + "/services/free-situation-review"}>{locale === "ru" ? "Начать с бесплатной диагностики ситуации →" : "Start with a free situation assessment →"}</Link>
        </article>
        <aside className={styles.article}>
          <h2>{t.request}</h2>
          <PersonalConsultationForm locale={locale} service={t.title}/>
        </aside>
      </div>
    </main>
  );
}
