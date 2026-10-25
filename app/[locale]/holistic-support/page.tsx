import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { FreeDiagnosticStart } from "@/components/free-diagnostic-start";
import { IdeasDiscovery } from "@/components/ideas-discovery";
import { MarketplaceMasterFinder } from "@/components/master-network-explorer";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import { ArrowRight, HeartHandshake, Sparkles } from "lucide-react";
import styles from "./holistic-support.module.css";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · FREE DIAGNOSTIC & PERSONAL SESSIONS",
    title: "Free Diagnosis & Personal Coaching",
    lead: "Start with a free written coaching diagnostic or request a personal session with Andrey: €50 / 30 minutes or €100 / 60 minutes.",
    heroHeadline: "Understand your situation. Choose the next step.",
    heroLead: "Free written coaching review after your questionnaire, or personal support in a 30- or 60-minute session.",
    choose: "Choose your direction",
    insightsNav: "Book free express diagnostic",
    healingNav: "Request personal session · from €50",
    insightsEyebrow: "01 · PERSONAL COACHING",
    insightsTitle: "Choose how to work with Andrey",
    insightsIntro: "Free diagnostic: leave your contact, clarify your topic and answer Andrey's coaching questionnaire. Or enquire about a live paid session.",
    aiTitle: "AI Insight",
    free: "FREE",
    aiBody: "Ask your question and receive a free symbolic I Ching reflection with related aphorisms.",
    aiCaveat: "Current free guidance uses authored, browser-based symbolic material. A generative AI model is not connected yet.",
    aiAction: "Ask your question",
    expressTitle: "Free Express Coaching Diagnostic",
    expressBody: "First enter your contact and a short question. Then complete Andrey's coaching questionnaire and send it for a personal written review. No free video call or medical diagnosis.",
    expressAction: "Book my free diagnostic",
    masterTitle: "Personal Coaching Session",
    masterBody: "Choose an individual live session: 30 minutes for one focused question, or 60 minutes for deeper work. Request a time; Andrey confirms availability personally.",
    masterPrice: "€50 / 30 min · €100 / 60 min",
    masterAction: "Request my personal session",
    masterFormTitle: "Request a personal session with Andrey",
    masterFormLead: "Choose 30 or 60 minutes, enter email or phone, consent to one reply, and request a time through WhatsApp or Telegram.",
    masterDisclaimer: "€50 for 30 minutes or €100 for 60 minutes. This sends an enquiry, not a confirmed appointment or payment.",
    paidFormatLabel: "Session length",
    paidFormats: [
      { value: "30 min · €50", label: "30 minutes · €50" },
      { value: "60 min · €100", label: "60 minutes · €100" },
    ],
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
    practitionersTitle: "Choose a practitioner",
    practitionersBody: "Only published energy and spiritual practitioners appear below. You can also explore the full directory.",
    allPractitioners: "Find all practitioners",
    libraryAction: "Explore Temple Studies",
    disclaimer: "Symbolic insights, tarot, runes and constellations are exploratory traditions, not reliable predictions, clinical diagnostics, medical advice or emergency services. Homeopathy lacks reliable evidence for treating health conditions.",
    privacy: "Free questions stay in your browser. A CRM contact is created only when you explicitly consent to a personal enquiry. Booking and payment are separate confirmations.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · БЕСПЛАТНЫЙ РАЗБОР И ЛИЧНЫЕ СЕССИИ",
    title: "Бесплатная диагностика и коучинг",
    lead: "Бесплатная письменная экспресс-диагностика или личная сессия с Андреем: €50 / 30 минут и €100 / 60 минут.",
    heroHeadline: "Разберитесь в ситуации и выберите следующий шаг.",
    heroLead: "Письменный разбор по коучинговой анкете — бесплатно. Личная сессия — 30 или 60 минут.",
    choose: "Выберите направление",
    insightsNav: "Записаться на бесплатную диагностику",
    healingNav: "Заказать личную сессию · от €50",
    insightsEyebrow: "01 · ЛИЧНЫЙ КОУЧИНГ",
    insightsTitle: "Как вы хотите работать с Андреем?",
    insightsIntro: "Бесплатно: оставьте контакт, уточните запрос, ответьте на вопросы коучинговой анкеты и отправьте её на личный письменный разбор. Или запросите платную сессию.",
    aiTitle: "AI Insight",
    free: "БЕСПЛАТНО",
    aiBody: "Задайте вопрос и получите бесплатную символическую подсказку И-Цзин с подходящими афоризмами.",
    aiCaveat: "Сейчас бесплатный подбор основан на авторских текстах и алгоритме в браузере. Генеративная AI-модель ещё не подключена.",
    aiAction: "Задать вопрос",
    expressTitle: "Бесплатная экспресс-диагностика",
    expressBody: "Сначала контакты и короткий вопрос, затем авторская коучинговая анкета Андрея. После отправки вы сможете получить письменную обратную связь. Это не бесплатный видеозвонок и не медицинский диагноз.",
    expressAction: "Записаться на бесплатный разбор",
    masterTitle: "Личная коучинговая сессия",
    masterBody: "30 минут — для одного вопроса; 60 минут — для глубокой работы. Отправьте заявку, Андрей лично подтвердит время.",
    masterPrice: "€50 / 30 мин · €100 / 60 мин",
    masterAction: "Записаться на личную сессию",
    masterFormTitle: "Записаться на личную сессию с Андреем",
    masterFormLead: "Выберите 30 или 60 минут, укажите email или телефон и согласитесь на ответ. Запросить время можно через WhatsApp или Telegram.",
    masterDisclaimer: "€50 за 30 минут или €100 за 60 минут. Заявка ещё не подтверждённая запись и не оплата.",
    paidFormatLabel: "Длительность сессии",
    paidFormats: [
      { value: "30 min · €50", label: "30 минут · €50" },
      { value: "60 min · €100", label: "60 минут · €100" },
    ],
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
    practitionersTitle: "Выберите мастера",
    practitionersBody: "Ниже — только опубликованные специалисты по энергетическим и духовным практикам. Можно открыть полный каталог.",
    allPractitioners: "Все специалисты",
    libraryAction: "Храмовые традиции",
    disclaimer: "И-Цзин, Руны, Таро и расстановки — символические практики, а не надёжные предсказания, медицинские диагнозы или экстренная помощь. Для лечения заболеваний у гомеопатии нет убедительной доказательной базы.",
    privacy: "Бесплатный вопрос остаётся в браузере. Контакт попадает в CRM только после вашего согласия и отправки заявки. Запись и оплата подтверждаются отдельно.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · EVALUACIÓN GRATUITA Y SESIONES",
    title: "Evaluación gratuita y coaching",
    lead: "Evaluación escrita gratuita o sesión personal con Andrey: €50 / 30 minutos o €100 / 60 minutos.",
    heroHeadline: "Aclara tu situación y decide el siguiente paso.",
    heroLead: "Revisión escrita con un cuestionario de coaching gratis, o una sesión personal de 30 o 60 minutos.",
    choose: "Elige tu camino",
    insightsNav: "Solicitar evaluación gratuita",
    healingNav: "Solicitar sesión personal · desde €50",
    insightsEyebrow: "01 · COACHING PERSONAL",
    insightsTitle: "Elige cómo trabajar con Andrey",
    insightsIntro: "Gratis: deja tu contacto, explica el tema, responde el cuestionario y envíalo para una revisión escrita. O solicita una sesión de pago.",
    aiTitle: "AI Insight",
    free: "GRATIS",
    aiBody: "Escribe una pregunta y recibe una reflexión simbólica gratuita del I Ching con aforismos.",
    aiCaveat: "Por ahora las reflexiones gratuitas proceden de textos editoriales y un algoritmo local. La IA generativa todavía no está conectada.",
    aiAction: "Hacer mi pregunta",
    expressTitle: "Evaluación exprés gratuita",
    expressBody: "Primero tus datos y una pregunta breve; luego responde el cuestionario de Andrey y envíalo para una revisión personal escrita. No incluye videollamada gratuita ni diagnóstico médico.",
    expressAction: "Solicitar mi evaluación gratis",
    masterTitle: "Sesión personal de coaching",
    masterBody: "30 minutos para una cuestión concreta o 60 minutos para un trabajo profundo. Solicita un horario que Andrey confirmará personalmente.",
    masterPrice: "€50 / 30 min · €100 / 60 min",
    masterAction: "Solicitar sesión personal",
    masterFormTitle: "Solicitar una sesión con Andrey",
    masterFormLead: "Elige 30 o 60 minutos, deja email o teléfono, acepta una respuesta y solicita un horario por WhatsApp o Telegram.",
    masterDisclaimer: "€50 por 30 minutos o €100 por 60 minutos. La solicitud no confirma cita ni pago.",
    paidFormatLabel: "Duración de la sesión",
    paidFormats: [
      { value: "30 min · €50", label: "30 minutos · €50" },
      { value: "60 min · €100", label: "60 minutos · €100" },
    ],
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
    practitionersTitle: "Encuentra un profesional",
    practitionersBody: "Solo aparecen profesionales publicados con prácticas energéticas o espirituales. También puedes abrir el directorio completo.",
    allPractitioners: "Todos los profesionales",
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

  return (
    <main className={styles.page} data-holistic-support lang={locale}>
      <PublicSiteHeader locale={locale} />
      <div className={styles.shell}>
        <section className={styles.hero} data-holistic-first-screen aria-labelledby="holistic-support-title">
          <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill priority className={styles.heroImage}
            sizes="(max-width: 650px) 100vw, 1190px" />
          <div className={styles.heroOverlay} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{t.eyebrow}</p>
            <h1 id="holistic-support-title">{t.title}</h1>
            <p className={styles.heroHeadline}>{t.heroHeadline}</p>
            <p className={styles.heroLead}>{t.heroLead}</p>
            <nav className={styles.pathControls} aria-label={t.choose}>
              <a href="#free-diagnostic-start" data-holistic-path="insights">
                <Sparkles size={21} aria-hidden="true" />
                <span>{t.insightsNav}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a href="#personal-insights-master" data-holistic-path="healing">
                <HeartHandshake size={21} aria-hidden="true" />
                <span>{t.healingNav}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </nav>
          </div>
        </section>

        <section id="temple-psychic-insights" className={styles.section} data-holistic-insights aria-labelledby="holistic-insights-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>{t.insightsEyebrow}</p>
            <h2 id="holistic-insights-title">{t.insightsTitle}</h2>
            <p>{t.insightsIntro}</p>
          </div>
          <div className={styles.options}>
            <article className={styles.option} data-holistic-offer="express">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/video-posters/constellations-en-v1.webp" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <span className={styles.freeTag}>{t.free}</span>
                <h3>{t.expressTitle}</h3>
                <p>{t.expressBody}</p>
                <a href="#free-diagnostic-start" className={styles.primaryAction}>
                  {t.expressAction}<span aria-hidden="true">→</span>
                </a>
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
                <a href="#personal-insights-master" className={styles.primaryAction}>
                  {t.masterAction}<span aria-hidden="true">→</span>
                </a>
              </div>
            </article>
            <article className={styles.option} data-holistic-offer="ai">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/ideas-zen-landscape.svg" alt="" fill unoptimized sizes="(max-width:700px) 100px, 155px" />
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
          <FreeDiagnosticStart locale={locale} />
          <div className={styles.freePanel} id="symbolic-reflection" data-holistic-free-insight>
            <div className={styles.innerHeading}>
              <h3>{t.freeEngineTitle}</h3><p>{t.freeEngineLead}</p>
            </div>
            <details className={styles.symbolicDetails}>
              <summary>{t.symbolicSummary}</summary>
              <IdeasDiscovery locale={locale} variant="temple" />
            </details>
          </div>
          <div className={styles.masterPanel} id="personal-insights-master" data-holistic-master>
            <CompactLeadCapture
              locale={locale}
              variant="inline"
              sourcePath={"/" + locale + "/holistic-support"}
              serviceTitle={"Personal Coaching Session with Andrey"}
              title={t.masterFormTitle}
              lead={t.masterFormLead}
              disclaimer={t.masterDisclaimer}
              formatOptions={t.paidFormats}
              formatLabel={t.paidFormatLabel}
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
