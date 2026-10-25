import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IdeasDiscovery } from "@/components/ideas-discovery";
import { SupportTalismanGallery } from "@/components/support-talisman-gallery";
import { AcademyCourseVideoPlaylist } from "@/components/academy-course-video-playlist";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import { PublicSiteHeader } from "@/components/public-site-header";
import { HolisticSupportTopicFilter } from "@/components/holistic-support-topic-filter";
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
    healingEyebrow: "02 · PRACTICES & SUPPORT",
    healingTitle: "Holistic Healing & Support",
    healingIntro: "Choose a complementary practice or an individual conversation. No guaranteed health outcomes or changes to prescribed care.",
    energyTitle: "Energy Support Session",
    energyBody: "Request distant energy support when you need it. Choose the practitioner, format and preferred time; the master confirms availability and fees.",
    energyAction: "Request distant energy support",
    talismanTitle: "Talismans",
    talismanBody: "Explore symbolic talismans by intention and upload a photo of your own to your private collection.",
    talismanAction: "Browse & upload talismans",
    talismanEyebrow: "04 · SYMBOLS & TALISMANS",
    talismanSectionTitle: "Talismans · Your symbolic collection",
    talismanSectionLead: "Organize personal images by protection, energy, harmony, prosperity, wisdom and more. New uploads stay private.",
    meditationTitle: "Meditation · Audio & Video",
    meditationBody: "Listen to a calming soundscape or Andrey’s original English Sun meditation. The PsiMaster archive is preserved in Russian.",
    meditationAction: "Open free practices",
    meditationEyebrow: "03 · MEDITATION PRACTICES",
    meditationSectionTitle: "Meditation · Flight to the Sun",
    meditationSectionLead: "Begin with an original English-guided Sun practice. The historical free PsiMaster Energy Pump-Ups series is accessible in Russian on the RU page.",
    meditationAudioTitle: "Audio · Gentle waves & melody",
    meditationAudioBody: "A 96-second instrumental soundscape for quiet attention. It is not an original PsiMaster guided recording.",
    meditationAudioLabel: "Play gentle waves and soft music",
    meditationAudioMissing: "Original standalone MP3/M4A recordings of the Russian PsiMaster pump-ups have not been located. The English Sun video above retains its original sound; no guided audio has been extracted or invented.",
    meditationVideoIntro: "An original English-language Flight to the Sun practice. The PsiMaster Sun and Energy Pump-Ups archive is in Russian, not translated as English content.",
    meditationVideoTitle: "Flight to the Sun · Original English video",
    meditationVideoUnavailable: "The original PsiMaster practice recordings are not available in the catalogue.",
    meditationMore: "Explore more Academy meditations",
    meditationRussianArchive: "Open the original PsiMaster series in Russian",
    meditationAudioFallback: "Your browser does not support audio playback.",
    meditationToAudio: "Next · Calming audio",
    meditationBackToVideo: "Back to video",

    alchemyTitle: "Psychic Alchemy",
    alchemyBody: "Situation analysis, constellation-informed reflection and optional homeopathic discussion as a symbolic or complementary approach — not medical treatment.",
    alchemyAction: "Explore Psychic Alchemy",
    practitionerOfferTitle: "I'm a Master — Offer My Services",
    practitionerOfferBody: "Already a practitioner? Create your professional profile, describe your sessions or courses in My Practice, then submit them for review. Listings appear only after approval.",
    practitionerOfferAction: "Start offering my services",
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
    healingEyebrow: "02 · ПРАКТИКА И ПОМОЩЬ",
    healingTitle: "Holistic Healing & Support",
    healingIntro: "Выберите дополнительную практику или личную консультацию. Мы не обещаем лечебных результатов и не предлагаем отменять медицинскую помощь.",
    energyTitle: "Energy Support Session",
    energyBody: "Запросите дистанционную энергетическую поддержку, когда она нужна. Выберите мастера, формат и удобное время; доступность и цена подтверждаются отдельно.",
    energyAction: "Запросить дистанционную поддержку",
    talismanTitle: "Талисманы",
    talismanBody: "Выбирайте символические талисманы по рубрикам и загружайте свои изображения в личную коллекцию.",
    talismanAction: "Открыть талисманы",
    talismanEyebrow: "04 · СИМВОЛЫ И ТАЛИСМАНЫ",
    talismanSectionTitle: "Талисманы · Личная коллекция",
    talismanSectionLead: "Защита, энергия, гармония, благополучие, мудрость и другие рубрики. Новые загрузки доступны только вам.",
    meditationTitle: "Медитации · аудио и видео",
    meditationBody: "Откройте восстановленные русскоязычные медитации Солнца и энергетические практики PsiMaster. Ниже доступно спокойное инструментальное аудио.",
    meditationAction: "Открыть бесплатные практики",
    meditationEyebrow: "03 · МЕДИТАТИВНЫЕ ПРАКТИКИ",
    meditationSectionTitle: "Медитации · Бесплатные подкачки",
    meditationSectionLead: "Три медитации Солнца, «Жизненная Сила», «Круг Огня» и две записи марафонов — оригинальные русскоязычные видео PsiMaster. Выберите запись и нажмите «Смотреть».",
    meditationAudioTitle: "Аудио · Мягкие волны и мелодия",
    meditationAudioBody: "Инструментальное сопровождение для спокойного внимания, 96 секунд. Это не оригинальная голосовая подкачка с PsiMaster.",
    meditationAudioLabel: "Воспроизвести мягкие волны и мелодию",
    meditationAudioMissing: "Отдельные оригинальные аудиофайлы MP3/M4A авторских подкачек PsiMaster пока не найдены. Выше доступны исходные русскоязычные видеозаписи со звуком; мы не извлекали аудио из видео и не подменяли записи.",
    meditationVideoIntro: "Семь оригинальных видео PsiMaster на русском: три медитации Солнца, «Жизненная Сила», «Круг Огня», марафоны энергопрактик и чисток. Нажмите «Смотреть» на обложке; если встроенный плеер недоступен, откройте YouTube.",
    meditationVideoTitle: "Русскоязычные медитации · архив PsiMaster",
    meditationVideoUnavailable: "Оригинальные материалы PsiMaster пока недоступны в каталоге.",
    meditationMore: "Другие медитации в Академии",
    meditationRussianArchive: "Оригинальный архив PsiMaster (RU)",
    meditationAudioFallback: "Ваш браузер не поддерживает воспроизведение аудио.",
    meditationToAudio: "Далее · Спокойное аудио",
    meditationBackToVideo: "Назад к видео",

    alchemyTitle: "Psychic Alchemy",
    alchemyBody: "Разбор ситуации, символическая расстановочная работа и при желании обсуждение гомеопатии как дополнительного подхода — не лечение.",
    alchemyAction: "Подробнее об Алхимии души",
    practitionerOfferTitle: "Я мастер — предложить свои услуги",
    practitionerOfferBody: "Создайте профиль специалиста, добавьте сессии или курсы в «Моей практике» и отправьте на модерацию. Услуги публикуются только после одобрения.",
    practitionerOfferAction: "Предложить свои услуги",
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
    healingEyebrow: "02 · PRÁCTICAS Y APOYO",
    healingTitle: "Holistic Healing & Support",
    healingIntro: "Elige una práctica complementaria o una sesión personal, sin promesas de resultados médicos ni cambios en tratamientos prescritos.",
    energyTitle: "Energy Support Session",
    energyBody: "Solicita apoyo energético a distancia cuando lo necesites. Elige profesional, formato y horario preferido; disponibilidad y precio se confirman por separado.",
    energyAction: "Solicitar apoyo a distancia",
    talismanTitle: "Talismanes",
    talismanBody: "Explora símbolos por categoría y sube una foto de tu talismán a tu colección privada.",
    talismanAction: "Explorar y subir talismanes",
    talismanEyebrow: "04 · SÍMBOLOS Y TALISMANES",
    talismanSectionTitle: "Talismanes · Tu colección",
    talismanSectionLead: "Protección, energía, armonía, prosperidad, sabiduría y más. Tus fotos nuevas son privadas.",
    meditationTitle: "Meditación · Audio y vídeo",
    meditationBody: "Escucha música suave o una meditación original del Sol en inglés. El archivo histórico de PsiMaster se mantiene en ruso.",
    meditationAction: "Abrir prácticas gratuitas",
    meditationEyebrow: "03 · PRÁCTICAS DE MEDITACIÓN",
    meditationSectionTitle: "Meditación · Flight to the Sun",
    meditationSectionLead: "Empieza con un vídeo original del Sol en inglés. La serie histórica gratuita PsiMaster está disponible en su idioma original: ruso.",
    meditationAudioTitle: "Audio · Olas y melodía suave",
    meditationAudioBody: "Música instrumental de 96 segundos para una pausa tranquila. No es una grabación guiada original de PsiMaster.",
    meditationAudioLabel: "Reproducir olas y melodía suave",
    meditationAudioMissing: "No se han localizado los MP3/M4A originales del archivo ruso PsiMaster. Arriba está el vídeo original del Sol en inglés, con su propio audio; no hemos extraído ni inventado pistas.",
    meditationVideoIntro: "Práctica original Flight to the Sun con audio en inglés. El archivo de PsiMaster es ruso y no se presenta como un curso traducido al español.",
    meditationVideoTitle: "Flight to the Sun · Vídeo original en inglés",
    meditationVideoUnavailable: "Las grabaciones originales de PsiMaster no están disponibles en el catálogo.",
    meditationMore: "Más meditaciones en la Academia",
    meditationRussianArchive: "Abrir la serie original de PsiMaster en ruso",
    meditationAudioFallback: "Tu navegador no permite reproducir audio.",
    meditationToAudio: "Siguiente · Audio tranquilo",
    meditationBackToVideo: "Volver a los vídeos",

    alchemyTitle: "Psychic Alchemy",
    alchemyBody: "Análisis simbólico de situaciones, constelaciones y reflexión homeopática opcional como práctica complementaria; no es tratamiento médico.",
    alchemyAction: "Explorar Alquimia del Alma",
    practitionerOfferTitle: "Soy profesional — ofrecer mis servicios",
    practitionerOfferBody: "Crea tu perfil profesional, prepara sesiones o cursos en My Practice y envíalos a revisión. Los servicios se publican solo después de la aprobación.",
    practitionerOfferAction: "Ofrecer mis servicios",
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
        <div id="temple-psychic-insights" className={styles.primaryEntry} data-holistic-first-screen data-holistic-insights>
          <span id="symbolic-reflection" aria-hidden="true" />
          <IdeasDiscovery locale={locale} variant="holistic" />
        </div>

        <HolisticSupportTopicFilter locale={locale} />

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
            <article className={styles.option} data-holistic-offer="meditations">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/reiki-practitioner-sunrise.webp" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <h3>{t.meditationTitle}</h3>
                <p>{t.meditationBody}</p>
                <Link href="#meditation-practices" className={styles.secondaryAction} prefetch={false} data-holistic-meditation-cta>
                  {t.meditationAction}<span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
            <article className={styles.option} data-holistic-offer="talismans">
              <div className={styles.optionPhoto}>
                <Image src="/images/holistic-house/tantra-reiki-yin-yang-cover.svg" alt="" fill sizes="(max-width:700px) 100px, 155px" />
              </div>
              <div className={styles.optionContent}>
                <h3>{t.talismanTitle}</h3>
                <p>{t.talismanBody}</p>
                <Link href="#talismans" className={styles.secondaryAction} prefetch={false} data-holistic-talismans-cta>
                  {t.talismanAction}<span aria-hidden="true">→</span>
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

        <section id="meditation-practices" className={styles.section} data-holistic-meditations aria-labelledby="holistic-meditation-title">
          <article className={styles.meditationFrame} data-holistic-meditation-screen="video" aria-label={t.meditationVideoTitle}>
            <div className={styles.meditationScenic}>
              <Image src="/images/holistic-house/reiki-practitioner-sunrise.webp" alt="" fill sizes="(max-width:650px) 100vw, 42vw" />
              <div className={styles.meditationScenicCopy}>
                <p className={styles.meditationEyebrow}>{t.meditationEyebrow} · 01 / 02</p>
                <h2 id="holistic-meditation-title">{t.meditationSectionTitle}</h2>
                <p className={styles.meditationScenicLead}>{t.meditationSectionLead}</p>
              </div>
            </div>
            <div className={styles.meditationMain}>
              <p className={styles.meditationKind}>{t.meditationVideoTitle}</p>
              {freeMeditationVideos(locale).length > 0 ? (
                <AcademyCourseVideoPlaylist
                  locale={locale}
                  courseTitle={t.meditationVideoTitle}
                  lessons={freeMeditationVideos(locale)}
                  introText={t.meditationVideoIntro}
                  compact
                />
              ) : <p className={styles.meditationSourceNote}>{t.meditationVideoUnavailable}</p>}
              <nav className={styles.meditationFooterLinks} aria-label={t.meditationSectionTitle}>
                {locale !== "ru" ? (
                  <Link href="/ru/holistic-support#meditation-practices" className={styles.meditationArchiveLink} prefetch={false} data-holistic-russian-archive>
                    {t.meditationRussianArchive}<span aria-hidden="true">↗</span>
                  </Link>
                ) : null}
                <Link href="#meditation-audio" className={styles.meditationNext} prefetch={false}>
                  {t.meditationToAudio}<span aria-hidden="true">↓</span>
                </Link>
              </nav>
            </div>
          </article>

          <article id="meditation-audio" className={styles.meditationFrame} data-holistic-meditation-screen="audio" aria-label={t.meditationAudioTitle}>
            <div className={styles.meditationScenic}>
              <Image src="/images/holistic-house/hero-olive-incense.webp" alt="" fill sizes="(max-width:650px) 100vw, 42vw" />
              <div className={styles.meditationScenicCopy}>
                <p className={styles.meditationEyebrow}>{t.meditationEyebrow} · 02 / 02</p>
                <h2>{t.meditationAudioTitle}</h2>
                <p className={styles.meditationScenicLead}>{t.meditationAudioBody}</p>
              </div>
            </div>
            <div className={styles.meditationMain}>
              <div className={styles.meditationAudioRow} data-holistic-audio-player>
                <span className={styles.freeTag}>{t.free}</span>
                <h3>{t.meditationAudioTitle}</h3>
                <audio controls preload="none" aria-label={t.meditationAudioLabel}>
                  <source src="/audio/holistic-house-soft-melody-gentle-waves-96s.wav" type="audio/wav" />
                  {t.meditationAudioFallback}
                </audio>
              </div>
              <p className={styles.meditationSourceNote} role="note">{t.meditationAudioMissing}</p>
              <nav className={styles.meditationFooterLinks} aria-label={t.meditationAudioTitle}>
                <Link href="#meditation-practices" className={styles.meditationArchiveLink} prefetch={false}>
                  {t.meditationBackToVideo}<span aria-hidden="true">↑</span>
                </Link>
                <Link href={"/" + locale + "/academy"} className={styles.meditationNext} prefetch={false}>
                  {t.meditationMore}<span aria-hidden="true">→</span>
                </Link>
              </nav>
            </div>
          </article>
        </section>

        <section id="talismans" className={styles.section} data-holistic-talismans aria-labelledby="holistic-talismans-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>{t.talismanEyebrow}</p>
            <h2 id="holistic-talismans-title">{t.talismanSectionTitle}</h2>
            <p>{t.talismanSectionLead}</p>
          </div>
          <SupportTalismanGallery locale={locale} />
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
