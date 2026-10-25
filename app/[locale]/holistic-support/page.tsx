import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IdeasDiscovery } from "@/components/ideas-discovery";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { ArrowRight } from "lucide-react";
import styles from "./holistic-support.module.css";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · TEMPLE & ENERGY SUPPORT",
    title: "Holistic Support · Temple Insights & Energy",
    lead: "Explore symbolic Temple Insights, complementary energy practices, and independent practitioners. Personal coaching now has its own lounge.",
    insightsEyebrow: "01 · TEMPLE & PSYCHIC INSIGHTS",
    insightsTitle: "Temple & Psychic Insights",
    insightsIntro: "Explore symbolic I Ching reflections and the traditions of Temple Studies. Coaching and individual therapy are in the Coaching Lounge.",
    aiTitle: "AI Insight",
    free: "FREE",
    aiBody: "Ask your question and receive a free symbolic I Ching reflection with related aphorisms.",
    aiCaveat: "Current free guidance uses authored, browser-based symbolic material. A generative AI model is not connected yet.",
    aiAction: "Ask your question",
    symbolicSummary: "See the optional symbolic reflection",
    freeEngineTitle: "Optional: a symbolic I Ching reflection",
    freeEngineLead: "This separate, browser-based symbolic reflection is not the personal coaching diagnostic or a booking. No AI practitioner or medical diagnosis.",
    healingEyebrow: "02 · PRACTICES & SUPPORT",
    healingTitle: "Holistic Healing & Support",
    healingIntro: "Choose a complementary practice or an individual conversation. No guaranteed health outcomes or changes to prescribed care.",
    energyTitle: "Energy Support Session",
    energyBody: "Request distant energy support when you need it. Choose the practitioner, format and preferred time; the master confirms availability and fees.",
    energyAction: "Request distant energy support",
    alchemyTitle: "Psychic Alchemy",
    alchemyBody: "Situation analysis, constellation-informed reflection and optional homeopathic discussion as a symbolic or complementary approach — not medical treatment.",
    alchemyAction: "Explore Psychic Alchemy",
    practitionerOfferTitle: "I'm a Master — Offer My Services",
    practitionerOfferBody: "Already a practitioner? Create your professional profile, describe your sessions or courses in My Practice, then submit them for review. Listings appear only after approval.",
    practitionerOfferAction: "Start offering my services",
    libraryAction: "Explore Temple Studies",
    disclaimer: "Symbolic insights, tarot, runes and constellations are exploratory traditions, not reliable predictions, clinical diagnostics, medical advice or emergency services. Homeopathy lacks reliable evidence for treating health conditions.",
    privacy: "Free questions stay in your browser. A CRM contact is created only when you explicitly consent to a personal enquiry. Booking and payment are separate confirmations.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ХРАМОВЫЕ И ЭНЕРГЕТИЧЕСКИЕ ПРАКТИКИ",
    title: "Холистическая поддержка · Храмовые практики",
    lead: "Здесь собраны храмовые символические методы, энергетическая поддержка и мастера. Диагностика, коучинг и глубинная работа — в Гостиной коучинга.",
    insightsEyebrow: "01 · ХРАМОВЫЕ И ПСИХИЧЕСКИЕ ПОДСКАЗКИ",
    insightsTitle: "Храмовые и символические подсказки",
    insightsIntro: "Здесь можно получить символическую подсказку И-Цзин и познакомиться с традициями. Бесплатная диагностика и личные сессии перенесены в Гостиную коучинга.",
    aiTitle: "AI Insight",
    free: "БЕСПЛАТНО",
    aiBody: "Задайте вопрос и получите бесплатную символическую подсказку И-Цзин с подходящими афоризмами.",
    aiCaveat: "Сейчас бесплатный подбор основан на авторских текстах и алгоритме в браузере. Генеративная AI-модель ещё не подключена.",
    aiAction: "Задать вопрос",
    symbolicSummary: "Посмотреть необязательную символическую подсказку",
    freeEngineTitle: "Дополнительно: символическая подсказка И-Цзин",
    freeEngineLead: "Это отдельная символическая практика в браузере, не личная диагностика, не запись и не медицинский совет.",
    healingEyebrow: "02 · ПРАКТИКА И ПОМОЩЬ",
    healingTitle: "Holistic Healing & Support",
    healingIntro: "Выберите дополнительную практику или личную консультацию. Мы не обещаем лечебных результатов и не предлагаем отменять медицинскую помощь.",
    energyTitle: "Energy Support Session",
    energyBody: "Запросите дистанционную энергетическую поддержку, когда она нужна. Выберите мастера, формат и удобное время; доступность и цена подтверждаются отдельно.",
    energyAction: "Запросить дистанционную поддержку",
    alchemyTitle: "Psychic Alchemy",
    alchemyBody: "Разбор ситуации, символическая расстановочная работа и при желании обсуждение гомеопатии как дополнительного подхода — не лечение.",
    alchemyAction: "Подробнее об Алхимии души",
    practitionerOfferTitle: "Я мастер — предложить свои услуги",
    practitionerOfferBody: "Создайте профиль специалиста, добавьте сессии или курсы в «Моей практике» и отправьте на модерацию. Услуги публикуются только после одобрения.",
    practitionerOfferAction: "Предложить свои услуги",
    libraryAction: "Храмовые традиции",
    disclaimer: "И-Цзин, Руны, Таро и расстановки — символические практики, а не надёжные предсказания, медицинские диагнозы или экстренная помощь. Для лечения заболеваний у гомеопатии нет убедительной доказательной базы.",
    privacy: "Бесплатный вопрос остаётся в браузере. Контакт попадает в CRM только после вашего согласия и отправки заявки. Запись и оплата подтверждаются отдельно.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · PRÁCTICAS SIMBÓLICAS Y ENERGÉTICAS",
    title: "Apoyo holístico · Tradiciones y energía",
    lead: "Explora reflexiones simbólicas, apoyo energético y profesionales. El diagnóstico gratuito y el coaching están ahora en el Salón de coaching.",
    insightsEyebrow: "01 · REFLEXIÓN SIMBÓLICA",
    insightsTitle: "Temple Insights y símbolos",
    insightsIntro: "Explora el I Ching simbólico y los estudios de tradiciones. El diagnóstico gratuito, el coaching y el trabajo profundo se ofrecen en el Salón de coaching.",
    aiTitle: "AI Insight",
    free: "GRATIS",
    aiBody: "Escribe una pregunta y recibe una reflexión simbólica gratuita del I Ching con aforismos.",
    aiCaveat: "Por ahora las reflexiones gratuitas proceden de textos editoriales y un algoritmo local. La IA generativa todavía no está conectada.",
    aiAction: "Hacer mi pregunta",
    symbolicSummary: "Ver la reflexión simbólica opcional",
    freeEngineTitle: "Opcional: una reflexión simbólica del I Ching",
    freeEngineLead: "Es otra práctica simbólica en el navegador, no una evaluación personal, cita ni diagnóstico médico.",
    healingEyebrow: "02 · PRÁCTICAS Y APOYO",
    healingTitle: "Holistic Healing & Support",
    healingIntro: "Elige una práctica complementaria o una sesión personal, sin promesas de resultados médicos ni cambios en tratamientos prescritos.",
    energyTitle: "Energy Support Session",
    energyBody: "Solicita apoyo energético a distancia cuando lo necesites. Elige profesional, formato y horario preferido; disponibilidad y precio se confirman por separado.",
    energyAction: "Solicitar apoyo a distancia",
    alchemyTitle: "Psychic Alchemy",
    alchemyBody: "Análisis simbólico de situaciones, constelaciones y reflexión homeopática opcional como práctica complementaria; no es tratamiento médico.",
    alchemyAction: "Explorar Alquimia del Alma",
    practitionerOfferTitle: "Soy profesional — ofrecer mis servicios",
    practitionerOfferBody: "Crea tu perfil profesional, prepara sesiones o cursos en My Practice y envíalos a revisión. Los servicios se publican solo después de la aprobación.",
    practitionerOfferAction: "Ofrecer mis servicios",
    libraryAction: "Explorar estudios del templo",
    disclaimer: "El I Ching, tarot, runas y constelaciones son tradiciones de reflexión, no predicciones fiables, diagnósticos clínicos ni ayuda urgente. La homeopatía carece de pruebas fiables para tratar enfermedades.",
    privacy: "Las preguntas gratuitas permanecen en el navegador. Tu contacto llega al CRM solo después del consentimiento y envío explícito. Reservas y pagos requieren confirmación aparte.",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " · " + t.insightsTitle + " | Holistic House",
    description: t.lead,
    alternates: {
      canonical: "/" + locale + "/holistic-support",
      languages: {
        en: "/en/holistic-support",
        ru: "/ru/holistic-support",
        es: "/es/holistic-support",
        "x-default": "/en/holistic-support",
      },
    },
  };
}

export default async function HolisticSupportPage({ params }: Props) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const t = copy[locale];
  return (
    <main className={styles.page} data-holistic-support lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.shell}>
        <header className={styles.compactIntro} data-holistic-first-screen>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1 id="holistic-support-title">{t.title}</h1>
          <p>{t.lead}</p>
          <Link href={"/" + locale + "/coaching"} prefetch={false} data-holistic-to-coaching>
            {locale === "ru" ? "Диагностика · Коучинг · Глубинная терапия"
              : locale === "es" ? "Diagnóstico · Coaching · Trabajo profundo"
              : "Free Diagnosis · Coaching · Depth Work"}
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </header>

        <section id="temple-psychic-insights" className={styles.section} data-holistic-insights aria-labelledby="holistic-insights-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>{t.insightsEyebrow}</p>
            <h2 id="holistic-insights-title">{t.insightsTitle}</h2>
            <p>{t.insightsIntro}</p>
          </div>
          <div className={styles.options}>
            <article className={styles.option} data-holistic-offer="ai">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/ideas-zen-landscape.svg" alt="" fill unoptimized
                  sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <span className={styles.freeTag}>{t.free}</span>
                <h3>{t.aiTitle}</h3>
                <p>{t.aiBody}</p>
                <small className={styles.note}>{t.aiCaveat}</small>
                <a href="#symbolic-reflection" className={styles.secondaryAction}>{t.aiAction}<span aria-hidden="true">→</span></a>
              </div>
            </article>
          </div>
          <div className={styles.freePanel} id="symbolic-reflection" data-holistic-free-insight>
            <div className={styles.innerHeading}>
              <h3>{t.freeEngineTitle}</h3><p>{t.freeEngineLead}</p>
            </div>
            <details className={styles.symbolicDetails}>
              <summary>{t.symbolicSummary}</summary>
              <IdeasDiscovery locale={locale} variant="temple" />
            </details>
          </div>
        </section>

        <section id="holistic-healing-support" className={styles.section} data-holistic-healing aria-labelledby="holistic-healing-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>{t.healingEyebrow}</p>
            <h2 id="holistic-healing-title">{t.healingTitle}</h2>
            <p>{t.healingIntro}</p>
          </div>
          <div className={styles.options}>
            <article className={styles.option} data-holistic-offer="energy">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/reiki-approved-sunrise-v3.webp" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <h3>{t.energyTitle}</h3>
                <p>{t.energyBody}</p>
                <Link href={"/" + locale + "/services/remote-energy-support"} className={styles.primaryAction} prefetch={false}>
                  {t.energyAction}<span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
            <article className={styles.option} data-holistic-offer="alchemy">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/video-posters/constellations-en-v1.webp" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <h3>{t.alchemyTitle}</h3>
                <p>{t.alchemyBody}</p>
                <Link href={"/" + locale + "/services/alchemy-of-soul"} className={styles.secondaryAction} prefetch={false}>
                  {t.alchemyAction}<span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
            <article className={styles.option} data-holistic-offer="practitioner">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <h3>{t.practitionerOfferTitle}</h3>
                <p>{t.practitionerOfferBody}</p>
                <Link href={"/" + locale + "/pro#profi-practice"} className={styles.primaryAction} prefetch={false} data-holistic-practitioner-cta>
                  {t.practitionerOfferAction}<span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </div>
        </section>

        <footer className={styles.privacy} data-holistic-disclaimer>
          <p>{t.disclaimer}</p>
          <p>{t.privacy}</p>
          <Link href={"/" + locale + "/academy/temple-studies"} prefetch={false}>{t.libraryAction} →</Link>
        </footer>
      </div>
    </main>
  );
}
