import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { IdeasDiscovery } from "@/components/ideas-discovery";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support.module.css";

type Props = { params: Promise<{ locale: string }> };
type Tradition = "constellations" | "runes" | "tarot" | "chinese";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · INSIGHTS & CARE",
    title: "Holistic Support",
    lead: "Ask a question, explore symbolic traditions or choose an individual support practice. Two clear paths, one gentle place to begin.",
    insightsNav: "Temple & Psychic Insights",
    healingNav: "Holistic Healing & Support",
    insightsEyebrow: "01 · ASK & EXPLORE",
    insightsTitle: "Temple & Psychic Insights",
    insightsIntro: "Constellations, Runes, Tarot and Chinese Tradition. Ask your question and explore a reflection — not a prediction or diagnosis.",
    traditions: { constellations: "Constellations", runes: "Runes", tarot: "Tarot", chinese: "Chinese Tradition" },
    traditionsLabel: "Explore a tradition",
    aiTitle: "AI Insight",
    free: "FREE",
    aiBody: "Ask your question and receive a free symbolic I Ching reflection with related aphorisms.",
    aiCaveat: "Current free guidance uses authored, browser-based symbolic material. A generative AI model is not connected yet.",
    aiAction: "Ask your question",
    expressTitle: "Personal Express Diagnostics",
    expressBody: "A free individual written situation review: answer a short questionnaire and draw Me – Goal – Problem. No free video call or medical diagnosis.",
    expressAction: "Start free express review",
    masterTitle: "Personal Insights with a Master",
    masterBody: "Request a focused 20-minute personal session about your question or preferred tradition.",
    masterPrice: "CAD 50 / 20 min",
    masterAction: "Request your 20-minute insight",
    masterFormTitle: "Ask Andrey about a personal insight",
    masterFormLead: "Choose a tradition, add your email or phone, give consent and select WhatsApp or Telegram. Your request is not a confirmed booking or payment.",
    masterFormatLabel: "Preferred tradition",
    masterDisclaimer: "A session is priced at CAD 50 for 20 minutes, subject to personal confirmation of time and format. Sending a request is free; no payment is collected here.",
    freeEngineTitle: "Try your free insight",
    freeEngineLead: "Start with a question. This symbolic tool uses the Chinese I Ching and authored aphorisms; other traditions are available through the links and personal request above.",
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
    practitionersTitle: "Choose a practitioner",
    practitionersBody: "Only published energy and spiritual practitioners appear below. You can also explore the full directory.",
    allPractitioners: "Find all practitioners",
    libraryAction: "Explore Temple Studies",
    disclaimer: "Symbolic insights, tarot, runes and constellations are exploratory traditions, not reliable predictions, clinical diagnostics, medical advice or emergency services. Homeopathy lacks reliable evidence for treating health conditions.",
    privacy: "Free questions stay in your browser. A CRM contact is created only when you explicitly consent to a personal enquiry. Booking and payment are separate confirmations.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПОДСКАЗКИ И ПОДДЕРЖКА",
    title: "Holistic Support",
    lead: "Задайте вопрос, исследуйте символические традиции или выберите личную практику поддержки. Два понятных направления — без лишних шагов.",
    insightsNav: "Храмовые и интуитивные подсказки",
    healingNav: "Холистическая поддержка",
    insightsEyebrow: "01 · ВОПРОС И ПОДСКАЗКА",
    insightsTitle: "Temple & Psychic Insights",
    insightsIntro: "Расстановки, Руны, Таро и Китайская традиция. Задайте вопрос, чтобы получить символический взгляд — не предсказание и не диагноз.",
    traditions: { constellations: "Расстановки", runes: "Руны", tarot: "Таро", chinese: "Китайская традиция" },
    traditionsLabel: "Выберите традицию",
    aiTitle: "AI Insight",
    free: "БЕСПЛАТНО",
    aiBody: "Задайте вопрос и получите бесплатную символическую подсказку И-Цзин с подходящими афоризмами.",
    aiCaveat: "Сейчас бесплатный подбор основан на авторских текстах и алгоритме в браузере. Генеративная AI-модель ещё не подключена.",
    aiAction: "Задать вопрос",
    expressTitle: "Personal Express Diagnostics",
    expressBody: "Бесплатный личный письменный экспресс-разбор: короткая анкета и рисунок «Я — Цель — Проблема». Без видеозвонка и медицинской диагностики.",
    expressAction: "Начать бесплатный разбор",
    masterTitle: "Личная подсказка Мастера",
    masterBody: "Запросите 20-минутную персональную сессию по своему вопросу или выбранной традиции.",
    masterPrice: "50 CAD / 20 мин",
    masterAction: "Запросить личную подсказку",
    masterFormTitle: "Запросить персональную подсказку у Андрея",
    masterFormLead: "Выберите традицию, укажите контакт, подтвердите согласие и выберите WhatsApp или Telegram. Заявка не является подтверждённой записью или оплатой.",
    masterFormatLabel: "Предпочитаемая традиция",
    masterDisclaimer: "Стоимость личной сессии — 50 CAD за 20 минут. Время и формат мастер подтверждает отдельно. Отправка заявки бесплатна; оплата здесь не взимается.",
    freeEngineTitle: "Попробуйте бесплатную подсказку",
    freeEngineLead: "Начните с вопроса. Сейчас доступна символическая система И-Цзин и афоризмы; другие традиции — по ссылкам и в личной работе с мастером.",
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
    practitionersTitle: "Выберите мастера",
    practitionersBody: "Ниже — только опубликованные специалисты по энергетическим и духовным практикам. Можно открыть полный каталог.",
    allPractitioners: "Все специалисты",
    libraryAction: "Храмовые традиции",
    disclaimer: "И-Цзин, Руны, Таро и расстановки — символические практики, а не надёжные предсказания, медицинские диагнозы или экстренная помощь. Для лечения заболеваний у гомеопатии нет убедительной доказательной базы.",
    privacy: "Бесплатный вопрос остаётся в браузере. Контакт попадает в CRM только после вашего согласия и отправки заявки. Запись и оплата подтверждаются отдельно.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ORIENTACIÓN Y APOYO",
    title: "Holistic Support",
    lead: "Haz una pregunta, explora tradiciones simbólicas o solicita una práctica de apoyo personal. Dos caminos sencillos para empezar.",
    insightsNav: "Reflexiones del templo",
    healingNav: "Apoyo holístico",
    insightsEyebrow: "01 · PREGUNTAR Y EXPLORAR",
    insightsTitle: "Temple & Psychic Insights",
    insightsIntro: "Constelaciones, Runas, Tarot y Tradición China. Haz tu pregunta para explorar una reflexión simbólica, no una predicción ni un diagnóstico.",
    traditions: { constellations: "Constelaciones", runes: "Runas", tarot: "Tarot", chinese: "Tradición China" },
    traditionsLabel: "Explorar una tradición",
    aiTitle: "AI Insight",
    free: "GRATIS",
    aiBody: "Escribe una pregunta y recibe una reflexión simbólica gratuita del I Ching con aforismos.",
    aiCaveat: "Por ahora las reflexiones gratuitas proceden de textos editoriales y un algoritmo local. La IA generativa todavía no está conectada.",
    aiAction: "Hacer mi pregunta",
    expressTitle: "Personal Express Diagnostics",
    expressBody: "Análisis personal gratuito por escrito: un cuestionario breve y el dibujo Yo – Meta – Problema. Sin videollamada ni diagnóstico médico.",
    expressAction: "Empezar revisión gratis",
    masterTitle: "Orientación personal con un Maestro",
    masterBody: "Solicita una sesión personal de 20 minutos sobre tu pregunta o tradición preferida.",
    masterPrice: "50 CAD / 20 min",
    masterAction: "Solicitar orientación personal",
    masterFormTitle: "Solicitar orientación de Andrey",
    masterFormLead: "Elige tradición y contacto, acepta una respuesta personal y selecciona WhatsApp o Telegram. No confirma reserva ni pago.",
    masterFormatLabel: "Tradición preferida",
    masterDisclaimer: "La sesión personal cuesta 50 CAD por 20 minutos. El horario y formato requieren confirmación. Enviar la solicitud es gratis y no se cobra aquí.",
    freeEngineTitle: "Prueba una reflexión gratuita",
    freeEngineLead: "Empieza con tu pregunta. El recurso actual usa el I Ching y aforismos; las demás tradiciones se pueden explorar en los enlaces y con un profesional.",
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
    practitionersTitle: "Encuentra un profesional",
    practitionersBody: "Solo aparecen profesionales publicados con prácticas energéticas o espirituales. También puedes abrir el directorio completo.",
    allPractitioners: "Todos los profesionales",
    libraryAction: "Explorar estudios del templo",
    disclaimer: "El I Ching, tarot, runas y constelaciones son tradiciones de reflexión, no predicciones fiables, diagnósticos clínicos ni ayuda urgente. La homeopatía carece de pruebas fiables para tratar enfermedades.",
    privacy: "Las preguntas gratuitas permanecen en el navegador. Tu contacto llega al CRM solo después del consentimiento y envío explícito. Reservas y pagos requieren confirmación aparte.",
  },
} as const;

const methodPaths: Record<Tradition, (locale: PublicLocale) => string> = {
  constellations: locale => "/" + locale + "/services/systemic-constellations",
  runes: locale => "/" + locale + "/academy/temple-studies#temple-5",
  tarot: locale => "/" + locale + "/academy/temple-studies#temple-5",
  chinese: () => "#free-ai-insight",
};
const methodIds: readonly Tradition[] = ["constellations", "runes", "tarot", "chinese"];

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
  let practitioners: PublicPractitioner[] = [];
  try {
    practitioners = await createPractitionerRepository(getAppConfig()).listPublicPractitioners(locale);
  } catch {
    // A temporary practitioner DB failure must not break free insights or linked services.
  }
  const energyPractitioners = practitioners.filter(practitioner =>
    (practitioner.services || []).some(service =>
      service.areaKey === "energy_spiritual" && service.status === "published"
    )
  );
  const methodOptions = methodIds.map(id => ({value: id, label: t.traditions[id]}));

  return (
    <main className={styles.page} data-holistic-support lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.shell}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1>{t.title}</h1>
            <p>{t.lead}</p>
          </div>
          <div className={styles.heroPhoto}>
            <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill priority sizes="(max-width:640px) 28vw, 360px" />
          </div>
        </header>

        <nav className={styles.primaryNav} aria-label={t.title}>
          <a href="#temple-psychic-insights"><span aria-hidden="true">✧</span>{t.insightsNav}</a>
          <a href="#holistic-healing-support"><span aria-hidden="true">✺</span>{t.healingNav}</a>
        </nav>

        <section id="temple-psychic-insights" className={styles.section} data-holistic-insights aria-labelledby="holistic-insights-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>{t.insightsEyebrow}</p>
            <h2 id="holistic-insights-title">{t.insightsTitle}</h2>
            <p>{t.insightsIntro}</p>
          </div>
          <nav className={styles.methods} aria-label={t.traditionsLabel}>
            {methodIds.map(id => <Link key={id} href={methodPaths[id](locale)} prefetch={false} data-holistic-tradition={id}>
              {t.traditions[id]}<span aria-hidden="true">↗</span>
            </Link>)}
          </nav>
          <div className={styles.options}>
            <article className={styles.option} data-holistic-offer="ai">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/ideas-zen-landscape.svg" alt="" fill unoptimized sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <span className={styles.freeTag}>{t.free}</span>
                <h3>{t.aiTitle}</h3>
                <p>{t.aiBody}</p>
                <small className={styles.note}>{t.aiCaveat}</small>
                <a href="#free-ai-insight" className={styles.primaryAction}>{t.aiAction}<span aria-hidden="true">→</span></a>
              </div>
            </article>
            <article className={styles.option} data-holistic-offer="express">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/video-posters/constellations-en-v1.webp" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <span className={styles.freeTag}>{t.free}</span>
                <h3>{t.expressTitle}</h3>
                <p>{t.expressBody}</p>
                <Link href={"/" + locale + "/services/free-situation-review"} className={styles.secondaryAction} prefetch={false}>
                  {t.expressAction}<span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
            <article className={styles.option} data-holistic-offer="master">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <span className={styles.priceTag}>{t.masterPrice}</span>
                <h3>{t.masterTitle}</h3>
                <p>{t.masterBody}</p>
                <a href="#personal-insights-master" className={styles.secondaryAction}>
                  {t.masterAction}<span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
          </div>
          <div className={styles.freePanel} id="free-ai-insight" data-holistic-free-insight>
            <div className={styles.innerHeading}>
              <h3>{t.freeEngineTitle}</h3><p>{t.freeEngineLead}</p>
            </div>
            <IdeasDiscovery locale={locale} variant="temple" />
          </div>
          <div className={styles.masterPanel} id="personal-insights-master" data-holistic-master>
            <CompactLeadCapture
              locale={locale}
              variant="inline"
              sourcePath={"/" + locale + "/holistic-support"}
              serviceTitle={"Personal Temple Insights with Andrey · CAD 50 / 20 min"}
              title={t.masterFormTitle}
              lead={t.masterFormLead}
              formatOptions={methodOptions}
              formatLabel={t.masterFormatLabel}
              disclaimer={t.masterDisclaimer}
            />
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
          <div className={styles.practitioners} data-holistic-practitioners>
            <h3>{t.practitionersTitle}</h3>
            <p>{t.practitionersBody}</p>
            {energyPractitioners.length ? <MarketplaceMasterFinder practitioners={energyPractitioners} locale={locale} /> : null}
            <Link href={"/" + locale + "/masters"} prefetch={false} className={styles.libraryLink}>
              {t.allPractitioners}<span aria-hidden="true">→</span>
            </Link>
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
