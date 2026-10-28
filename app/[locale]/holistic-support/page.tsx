import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HolisticSupportChoices } from "@/components/holistic-support-choices";
import { TaoistTalismanCatalog } from "@/components/taoist-talisman-catalog";
import { HolisticMeditationGallery } from "@/components/holistic-meditation-gallery";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { PublicSiteHeader } from "@/components/public-site-header";
import { HolisticSupportTopicFilter } from "@/components/holistic-support-topic-filter";
import { TaoistKoanBoard } from "@/components/taoist-koan-board";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import styles from "./holistic-support.module.css";

type Props = { params: Promise<{ locale: string }> };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const copy = {
  en: {
    eyebrow: "HOLISTIC HOUSE · INSIGHT & ENERGY SUPPORT",
    title: "Holistic Support",
    lead: "Describe a goal or situation. Receive a free symbolic insight or request a personal energy support session.",
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
    talismanEyebrow: "04 · SYMBOLS & TALISMANS",
    talismanSectionTitle: "Daoist Talismans · Discover & Request",
    talismanSectionLead: "Browse Fu-style symbolic talismans, explore their intentions and request a personal piece. The master confirms price and availability.",
    meditationEyebrow: "03 · MEDITATION PRACTICES",
    meditationSectionTitle: "Meditations · Videos",
    meditationSectionLead: "Explore an original English Sun practice by theme. More recordings are available in the Russian archive.",
    meditationMandalaAction: "Create your personal mandala · add a photo and meditate",
    meditationVideoIntro: "An original English-language Flight to the Sun practice. The PsiMaster Sun and Energy Pump-Ups archive is in Russian, not translated as English content.",
    meditationVideoTitle: "Flight to the Sun · Original English video",
    meditationVideoUnavailable: "The original PsiMaster practice recordings are not available in the catalogue.",
    meditationMore: "Explore more Academy meditations",
    meditationRussianArchive: "Open the original PsiMaster series in Russian",

    libraryAction: "Explore Temple Studies",
    disclaimer: "Symbolic insights, tarot, runes and constellations are exploratory traditions, not reliable predictions, clinical diagnostics, medical advice or emergency services. Homeopathy lacks reliable evidence for treating health conditions.",
    coachingAsideTitle: "Looking for personal coaching?",
    coachingAsideBody: "The free written situation review and individual €50 / 30-minute or €100 / 60-minute sessions are in the Coaching Lounge.",
    coachingAsideAction: "Explore free diagnostics and coaching",
    privacy: "Free questions stay in your browser. A CRM contact is created only when you explicitly consent to a personal enquiry. Booking and payment are separate confirmations.",
  },
  ru: {
    eyebrow: "HOLISTIC HOUSE · ПОДСКАЗКИ И ЭНЕРГЕТИЧЕСКАЯ ПОДДЕРЖКА",
    title: "Холистическая поддержка",
    lead: "Опишите цель или ситуацию. Получите бесплатную символическую подсказку или запросите энергетическую поддержку.",
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
    talismanEyebrow: "04 · СИМВОЛЫ И ТАЛИСМАНЫ",
    talismanSectionTitle: "Даосские талисманы · Каталог",
    talismanSectionLead: "Посмотрите даосские талисманы Фу и выберите подходящий символ. Изготовление и цену мастер подтвердит отдельно.",
    meditationEyebrow: "03 · МЕДИТАТИВНЫЕ ПРАКТИКИ",
    meditationSectionTitle: "Медитации · Видео",
    meditationSectionLead: "Выберите тему и смотрите оригинальные медитации Солнца, «Жизненную силу» и энергетические практики PsiMaster.",
    meditationMandalaAction: "Создать свою мандалу · фото или цель + медитация",
    meditationVideoIntro: "Семь оригинальных видео PsiMaster на русском: три медитации Солнца, «Жизненная Сила», «Круг Огня», марафоны энергопрактик и чисток. Нажмите «Смотреть» на обложке; если встроенный плеер недоступен, откройте YouTube.",
    meditationVideoTitle: "Русскоязычные медитации · архив PsiMaster",
    meditationVideoUnavailable: "Оригинальные материалы PsiMaster пока недоступны в каталоге.",
    meditationMore: "Другие медитации в Академии",
    meditationRussianArchive: "Оригинальный архив PsiMaster (RU)",

    libraryAction: "Храмовые традиции",
    disclaimer: "И-Цзин, Руны, Таро и расстановки — символические практики, а не надёжные предсказания, медицинские диагнозы или экстренная помощь. Для лечения заболеваний у гомеопатии нет убедительной доказательной базы.",
    coachingAsideTitle: "Нужен личный коучинг?",
    coachingAsideBody: "Бесплатная письменная диагностика ситуации и личные сессии €50 / 30 минут или €100 / 60 минут находятся в гостиной коучинга.",
    coachingAsideAction: "Бесплатная диагностика и коучинг",
    privacy: "Бесплатный вопрос остаётся в браузере. Контакт попадает в CRM только после вашего согласия и отправки заявки. Запись и оплата подтверждаются отдельно.",
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · ORIENTACIÓN Y APOYO ENERGÉTICO",
    title: "Apoyo holístico",
    lead: "Describe tu objetivo o situación. Recibe una reflexión simbólica gratuita o solicita apoyo energético personal.",
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
    talismanEyebrow: "04 · SÍMBOLOS Y TALISMANES",
    talismanSectionTitle: "Talismanes taoístas · Catálogo",
    talismanSectionLead: "Explora talismanes de estilo Fu y solicita una pieza personal. El profesional confirma el precio y la disponibilidad.",
    meditationEyebrow: "03 · PRÁCTICAS DE MEDITACIÓN",
    meditationSectionTitle: "Meditaciones · Vídeos",
    meditationSectionLead: "Elige un tema y descubre la práctica original del Sol en inglés. El archivo completo está disponible en ruso.",
    meditationMandalaAction: "Crear mi mandala · una foto, mi objetivo y meditación",
    meditationVideoIntro: "Práctica original Flight to the Sun con audio en inglés. El archivo de PsiMaster es ruso y no se presenta como un curso traducido al español.",
    meditationVideoTitle: "Flight to the Sun · Vídeo original en inglés",
    meditationVideoUnavailable: "Las grabaciones originales de PsiMaster no están disponibles en el catálogo.",
    meditationMore: "Más meditaciones en la Academia",
    meditationRussianArchive: "Abrir la serie original de PsiMaster en ruso",

    libraryAction: "Explorar estudios del templo",
    disclaimer: "El I Ching, tarot, runas y constelaciones son tradiciones de reflexión, no predicciones fiables, diagnósticos clínicos ni ayuda urgente. La homeopatía carece de pruebas fiables para tratar enfermedades.",
    coachingAsideTitle: "¿Buscas coaching personal?",
    coachingAsideBody: "La evaluación escrita gratuita y las sesiones personales de €50 / 30 minutos o €100 / 60 minutos están en el espacio de coaching.",
    coachingAsideAction: "Explorar diagnóstico gratuito y coaching",
    privacy: "Las preguntas gratuitas permanecen en el navegador. Tu contacto llega al CRM solo después del consentimiento y envío explícito. Reservas y pagos requieren confirmación aparte.",
  },
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found", robots: { index: false } };
  const t = copy[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title + " | Holistic House",
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
        <div id="temple-psychic-insights" className={styles.primaryEntry}>
          <span id="symbolic-reflection" aria-hidden="true" />
          <HolisticSupportChoices locale={locale} />
        </div>

        <span id="holistic-healing-support" aria-hidden="true" />
        <HolisticSupportTopicFilter locale={locale} />
        <TaoistKoanBoard locale={locale} />

        <section id="meditation-practices" className={styles.section} data-holistic-meditations aria-labelledby="holistic-meditation-title">
          <header className={styles.meditationHero}>
            <Image src="/images/holistic-house/reiki-practitioner-sunrise.webp" alt="" fill sizes="(max-width:650px) 100vw, 1190px" />
            <div className={styles.meditationHeroCopy}>
              <p className={styles.meditationEyebrow}>{t.meditationEyebrow}</p>
              <h2 id="holistic-meditation-title">{t.meditationSectionTitle}</h2>
              <p>{t.meditationSectionLead}</p>
            </div>
          </header>
          <Link href={"/" + locale + "/holistic-support/mandala"} className={styles.mandalaAction} prefetch={false} data-holistic-mandala-entry>
            <span aria-hidden="true">✺</span><span>{t.meditationMandalaAction}</span><span aria-hidden="true">→</span>
          </Link>
          <div className={styles.meditationContents}>
            {freeMeditationVideos(locale).length > 0 ? (
              <HolisticMeditationGallery locale={locale} videos={freeMeditationVideos(locale)} />
            ) : <p className={styles.meditationSourceNote}>{t.meditationVideoUnavailable}</p>}
            <nav className={styles.meditationFooterLinks} aria-label={t.meditationSectionTitle}>
              {locale !== "ru" ? (
                <Link href="/ru/holistic-support#meditation-practices" className={styles.meditationArchiveLink} prefetch={false} data-holistic-russian-archive>
                  {t.meditationRussianArchive}<span aria-hidden="true">↗</span>
                </Link>
              ) : null}
              <Link href={"/" + locale + "/academy"} className={styles.meditationArchiveLink} prefetch={false}>
                {t.meditationMore}<span aria-hidden="true">→</span>
              </Link>
            </nav>
          </div>
        </section>

        <section id="talismans" className={styles.section} data-holistic-talismans aria-labelledby="holistic-talismans-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>{t.talismanEyebrow}</p>
            <h2 id="holistic-talismans-title">{t.talismanSectionTitle}</h2>
            <p>{t.talismanSectionLead}</p>
          </div>
          <TaoistTalismanCatalog locale={locale} />
        </section>

        <aside className={styles.coachingAside} data-holistic-coaching-followup aria-labelledby="holistic-coaching-followup-title">
          <div>
            <h2 id="holistic-coaching-followup-title">{t.coachingAsideTitle}</h2>
            <p>{t.coachingAsideBody}</p>
          </div>
          <Link href={"/" + locale + "/coaching"} prefetch={false} className={styles.coachingAsideAction}>
            {t.coachingAsideAction}<span aria-hidden="true">→</span>
          </Link>
        </aside>

        <footer className={styles.privacy} data-holistic-disclaimer>
          <p>{t.disclaimer}</p>
          <p>{t.privacy}</p>
          <Link href={"/" + locale + "/academy/temple-studies"} prefetch={false}>{t.libraryAction} →</Link>
        </footer>
      </div>
    </main>
  );
}
