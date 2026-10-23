import { Check, MessageCircle } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./tantra-free-initiation.module.css";

type Intent = "free" | "personal" | "session" | "answers" | "feedback";

// This is an intentionally small, server-rendered WhatsApp handoff.
// There are no website fields, uploads, registration or automatic messages.
const copy = {
  en: {
    service: "Tantra Reiki · Level 1",
    requests: {
      free: "I would like to request the free introductory Level 1 Tantra Reiki initiation. Please explain how to arrange it.",
      personal: "I would like to book a personal distance (online) Level 1 Tantra Reiki initiation (€50 / 30 minutes). Please confirm availability and the online format.",
      session: "I would like to book the Tantra Reiki Personal Session + Level 1 Initiation (€100 / 60 minutes). I would like to explore my situation, check for possible solutions and receive the initiation. Please confirm availability.",
      answers: "I have studied Tantra Reiki and would like to send my seven answers for the free Level 1 initiation.",
      feedback: "I watched the Tantra Reiki practice video and would like to share whether I was able to tune in to the flow and what I experienced.",
    },
    answerContext: "I will write or paste the answers to questions 1–7 directly into our selected chat.",
    feedbackContext: "My impressions after the practice (I will add them in the selected chat):",
    heading: "Write directly to Andrey",
    lead: "No form, name, email or account required. Choose an option, then decide between WhatsApp and Telegram.",
    free: "Request free initiation",
    personal: "Personal online initiation · €50 / 30 min",
    session: "Personal session + initiation · €100 / 60 min",
    answers: "Already answered the 7 questions? Send your answers",
    feedback: "Share your impressions after the practice",
    note: "Choose WhatsApp or Telegram. Review the prepared message and tap Send yourself — nothing is sent by the website.",
    tagline: "Direct conversation · no registration",
  },
  ru: {
    service: "Тантра Рейки · 1-я ступень",
    requests: {
      free: "Хочу запросить бесплатную вводную инициацию 1-й ступени Тантра Рейки. Подскажите, пожалуйста, как её пройти.",
      personal: "Хочу записаться на личную дистанционную (онлайн) инициацию 1-й ступени Тантра Рейки (€50 / 30 минут). Подскажите доступное время и формат встречи.",
      session: "Хочу записаться на личную сессию с разбором ситуации и инициацией 1-й ступени Тантра Рейки (100 € / 60 минут). Подскажите доступное время и формат.",
      answers: "Я изучил(а) материалы Тантра Рейки и хочу отправить 7 ответов для бесплатной инициации 1-й ступени.",
      feedback: "Я посмотрел(а) видео с практикой Тантра Рейки и хочу написать отзыв: удалось ли мне настроиться на поток и что я ощутил(а).",
    },
    answerContext: "Я напишу или вставлю ответы на вопросы 1–7 в выбранном мессенджере перед отправкой.",
    feedbackContext: "Мой отзыв после практики (допишу в выбранном мессенджере):",
    heading: "Напишите Андрею напрямую",
    lead: "Никаких анкет, имени, email или регистрации. Выберите действие, затем удобный мессенджер.",
    free: "Запросить инициацию бесплатно",
    personal: "Личная онлайн-инициация · €50 / 30 мин",
    session: "Сессия + инициация · 100 € / 60 мин",
    answers: "Уже ответили на 7 вопросов? Отправить ответы",
    feedback: "Поделиться впечатлениями после практики",
    note: "Выберите WhatsApp или Telegram, проверьте подготовленный текст и нажмите «Отправить» — сайт ничего не отправляет автоматически.",
    tagline: "Личное общение · без регистрации",
  },
  es: {
    service: "Tantra Reiki · Nivel 1",
    requests: {
      free: "Quiero solicitar la iniciación introductoria gratuita de Tantra Reiki Nivel 1. ¿Cómo puedo realizarla?",
      personal: "Quiero reservar una iniciación personal a distancia (online) de Tantra Reiki Nivel 1 (€50 / 30 minutos). ¿Qué horarios hay disponibles?",
      session: "Quiero reservar una sesión personal con revisión de mi situación e iniciación Tantra Reiki Nivel 1 (100 € / 60 minutos). ¿Qué horarios hay disponibles?",
      answers: "He estudiado Tantra Reiki y quiero enviar mis siete respuestas para la iniciación gratuita de Nivel 1.",
      feedback: "He visto el vídeo de práctica de Tantra Reiki y quiero contar si pude conectar con el flujo y qué sentí durante la práctica.",
    },
    answerContext: "Escribiré o pegaré las respuestas a las preguntas 1–7 en el chat elegido antes de enviar.",
    feedbackContext: "Mis impresiones de la práctica (las escribiré en el chat elegido):",
    heading: "Escribe directamente a Andrey",
    lead: "Sin formulario, nombre, correo electrónico ni registro. Elige una opción y luego WhatsApp o Telegram.",
    free: "Solicitar iniciación gratis",
    personal: "Iniciación personal online · €50 / 30 min",
    session: "Sesión personal + iniciación · 100 € / 60 min",
    answers: "¿Ya respondiste a las 7 preguntas? Envíalas",
    feedback: "Compartir mis impresiones tras la práctica",
    note: "Elige WhatsApp o Telegram, revisa el mensaje y pulsa Enviar; el sitio no envía nada automáticamente.",
    tagline: "Contacto directo · sin registro",
  },
} as const;

export function tantraInitiationWhatsAppUrl(locale: PublicLocale, intent: Intent) {
  const t = copy[locale];
  return whatsappEnquiryUrl({
    locale,
    service: t.service,
    request: t.requests[intent],
    context: intent === "answers" ? t.answerContext : intent === "feedback" ? t.feedbackContext : undefined,
    pagePath: "/" + locale + "/academy/reiki/tantra-reiki/free-initiation",
  });
}

export function TantraInitiationForm({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <div className={styles.whatsappCapture} data-tantra-whatsapp-capture>
      <div className={styles.whatsappIntro}>
        <span className={styles.whatsappSymbol}><MessageCircle size={24} aria-hidden="true" /></span>
        <div>
          <p className={styles.whatsappTagline}><Check size={14} aria-hidden="true" /> {t.tagline}</p>
          <h3 className={styles.whatsappTitle}>{t.heading}</h3>
          <p className={styles.whatsappLead}>{t.lead}</p>
        </div>
      </div>
      <div className={styles.whatsappActions}>
        <ContactChannelChooser stayAfterSave locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "free")} label={t.free} className={styles.whatsappPrimary} id="apply-free" />
        <ContactChannelChooser stayAfterSave locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "personal")} label={t.personal} className={styles.whatsappSecondary} id="apply-personal" />
        <div className={styles.whatsappCombinedSlot}>
          <ContactChannelChooser stayAfterSave locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "session")} label={t.session} className={styles.whatsappCombined} id="apply-session" />
        </div>
      </div>
      <div className={styles.whatsappAnswersSlot}>
        <ContactChannelChooser stayAfterSave locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "answers")} label={t.answers} id="apply-answers" />
      </div>
      <div className={styles.whatsappFeedbackSlot}>
        <ContactChannelChooser stayAfterSave locale={locale} whatsappUrl={tantraInitiationWhatsAppUrl(locale, "feedback")} label={t.feedback} id="apply-feedback" />
      </div>
      <p className={styles.whatsappNote}>{t.note}</p>
    </div>
  );
}
