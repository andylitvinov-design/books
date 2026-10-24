import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IdeasDiscovery } from "@/components/ideas-discovery";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "./temple-insights.module.css";

type Language = "en" | "ru" | "es";
type Props = { params: Promise<{ locale: string }> };
const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · REFLECTION & GUIDANCE", title: "Temple Insights",
    lead: "Ask what matters to you. Begin with a free symbolic insight or request a personal reflection with a practitioner.",
    free: "Free symbolic insight", personal: "Free personal express review", master: "Insights with a Master",
    freeTitle: "Start with your question", freeLead: "Explore the I Ching and thoughtful aphorisms without sharing your question with a server.",
    reviewTitle: "Personal express diagnostic · free", reviewBody: "Describe one situation and share a drawing in the existing private enquiry process. A practitioner responds after reviewing your request.",
    reviewAction: "Request a free review", masterTitle: "Ask a Master", masterBody: "Request a personal symbolic insight with a Master · CAD 50 / 20 min. Your request is not yet a confirmed booking or payment.",
    masterAction: "Request a personal insight", note: "Symbolic interpretations support reflection, not diagnosis or prediction. Your question stays in the browser; contact details are sent only with your consent."
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · СМЫСЛЫ И ПОДСКАЗКИ", title: "Храмовые подсказки",
    lead: "Задайте важный вопрос. Начните с бесплатной символической подсказки или обратитесь за личным разбором.",
    free: "Бесплатная подсказка", personal: "Личная экспресс-диагностика · бесплатно", master: "Подсказка от мастера",
    freeTitle: "С чего начать?", freeLead: "Исследуйте И-Цзин и афоризмы. Текст вопроса остаётся только в браузере.",
    reviewTitle: "Личный экспресс-разбор · бесплатно", reviewBody: "Опишите одну ситуацию и приложите рисунок через существующую форму заявки. Специалист даст ответ после рассмотрения.",
    reviewAction: "Запросить бесплатный разбор", masterTitle: "Спросить мастера", masterBody: "Запросите личную символическую подсказку от Мастера · 50 CAD / 20 мин. Заявка ещё не запись и не оплата.",
    masterAction: "Запросить личную подсказку", note: "Символические подсказки — для размышления, не для диагностики или предсказания. Текст остаётся в браузере; контакты отправляются только с согласия."
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · REFLEXIÓN Y GUÍA", title: "Guía del templo",
    lead: "Plantea tu pregunta. Empieza con una reflexión simbólica gratuita o solicita una revisión personal.",
    free: "Reflexión gratuita", personal: "Revisión exprés personal · gratis", master: "Orientación con un maestro",
    freeTitle: "Comienza con tu pregunta", freeLead: "Explora el I Ching y aforismos sin enviar tu pregunta al servidor.",
    reviewTitle: "Revisión personal exprés · gratis", reviewBody: "Describe tu situación y comparte un dibujo mediante el formulario existente. El profesional responderá después de revisar la solicitud.",
    reviewAction: "Solicitar revisión gratuita", masterTitle: "Consulta a un maestro", masterBody: "Solicita orientación simbólica personal · 50 CAD / 20 min. La solicitud no confirma ni reserva ni pago.",
    masterAction: "Solicitar orientación", note: "La interpretación simbólica es para reflexionar, no para diagnosticar ni predecir. Tu pregunta permanece en este navegador; los contactos se envían solo con consentimiento."
  }
} as const;

export function generateStaticParams() { return [{ locale: "en" }, { locale: "ru" }, { locale: "es" }]; }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { robots: { index: false } };
  const t = copy[locale as Language];
  return {
    metadataBase: metadataBaseFor(), title: t.title + " | Holistic House", description: t.lead,
    alternates: { canonical: "/" + locale + "/temple-insights",
      languages: { en: "/en/temple-insights", ru: "/ru/temple-insights", es: "/es/temple-insights", "x-default": "/en/temple-insights" } }
  };
}
export default async function TempleInsightsPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const language = locale as Language;
  const t = copy[language];
  return <main className={styles.page} data-temple-insights-page lang={language}>
    <PublicSiteHeader locale={language} />
    <div className={styles.shell}>
      <section className={styles.hero} aria-labelledby="temple-insights-title">
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>{t.eyebrow}</p><h1 id="temple-insights-title">{t.title}</h1><p>{t.lead}</p>
        </div>
        <div className={styles.heroPhoto}><Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill priority sizes="(max-width:760px) 35vw, 330px" /></div>
      </section>
      <nav className={styles.quickNav} aria-label={t.title}>
        <a href="#insights"><span aria-hidden="true">☯</span>{t.free}</a>
        <a href="#personal"><span aria-hidden="true">✦</span>{t.personal}</a>
        <a href="#master"><span aria-hidden="true">♧</span>{t.master}</a>
      </nav>
      <section id="insights" className={styles.insights} aria-label={t.freeTitle}>
        <IdeasDiscovery locale={language} variant="temple" />
      </section>
      <section id="personal" className={styles.section}>
        <h2>{t.reviewTitle}</h2><p className={styles.sectionIntro}>{t.reviewBody}</p>
        <Link className={styles.primaryAction} href={"/" + language + "/services/free-situation-review"} prefetch={false}>{t.reviewAction} <span aria-hidden="true">→</span></Link>
      </section>
      <section id="master" className={styles.section}>
        <h2>{t.masterTitle}</h2><p className={styles.sectionIntro}>{t.masterBody}</p>
        <Link className={styles.primaryAction} href={"/" + language + "/holistic-support#personal-insights-master"} prefetch={false}>{t.masterAction} <span aria-hidden="true">→</span></Link>
      </section>
      <footer className={styles.privacy}><p>{t.note}</p></footer>
    </div>
  </main>;
}
