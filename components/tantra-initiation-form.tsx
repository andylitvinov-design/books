import { ArrowUpRight, Check, MessageCircle } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./tantra-free-initiation.module.css";

type Intent = "free" | "personal" | "answers";

// This is an intentionally small, server-rendered WhatsApp handoff.
// There are no website fields, uploads, registration or automatic messages.
const copy = {
  en: {
    service: "Tantra Reiki · Level 1",
    requests: {
      free: "I would like to request the free introductory Level 1 Tantra Reiki initiation. Please explain how to arrange it.",
      personal: "I would like to arrange a personal Level 1 Tantra Reiki initiation (€50 / 30 minutes). Please confirm availability.",
      answers: "I have studied Tantra Reiki and would like to send my seven answers for the free Level 1 initiation.",
    },
    answerContext: "I will write or paste the answers to questions 1–7 directly into our WhatsApp chat.",
    heading: "Write directly to Andrey",
    lead: "No form, name, email or account required. Choose an option and continue in WhatsApp.",
    free: "Request free initiation",
    personal: "Personal initiation · €50 / 30 min",
    answers: "Already answered the 7 questions? Send them in WhatsApp",
    note: "WhatsApp opens with a prepared message. Review it and tap Send yourself — nothing is sent by the website.",
    tagline: "Direct conversation · no registration",
  },
  ru: {
    service: "Тантра Рейки · 1-я ступень",
    requests: {
      free: "Хочу запросить бесплатную вводную инициацию 1-й ступени Тантра Рейки. Подскажите, пожалуйста, как её пройти.",
      personal: "Хочу записаться на личную инициацию 1-й ступени Тантра Рейки (€50 / 30 минут). Подскажите доступное время.",
      answers: "Я изучил(а) материалы Тантра Рейки и хочу отправить 7 ответов для бесплатной инициации 1-й ступени.",
    },
    answerContext: "Я напишу или вставлю ответы на вопросы 1–7 непосредственно в WhatsApp перед отправкой.",
    heading: "Напишите Андрею напрямую",
    lead: "Никаких анкет, имени, email или регистрации. Выберите действие и перейдите в WhatsApp.",
    free: "Запросить инициацию бесплатно",
    personal: "Личная инициация · €50 / 30 мин",
    answers: "Уже ответили на 7 вопросов? Отправить в WhatsApp",
    note: "Откроется WhatsApp с готовым текстом. Проверьте его и нажмите «Отправить» — сайт ничего не отправляет автоматически.",
    tagline: "Личное общение · без регистрации",
  },
  es: {
    service: "Tantra Reiki · Nivel 1",
    requests: {
      free: "Quiero solicitar la iniciación introductoria gratuita de Tantra Reiki Nivel 1. ¿Cómo puedo realizarla?",
      personal: "Quiero reservar una iniciación personal de Tantra Reiki Nivel 1 (€50 / 30 minutos). ¿Qué horarios hay disponibles?",
      answers: "He estudiado Tantra Reiki y quiero enviar mis siete respuestas para la iniciación gratuita de Nivel 1.",
    },
    answerContext: "Escribiré o pegaré las respuestas a las preguntas 1–7 directamente en WhatsApp antes de enviar.",
    heading: "Escribe directamente a Andrey",
    lead: "Sin formulario, nombre, correo electrónico ni registro. Elige una opción para abrir WhatsApp.",
    free: "Solicitar iniciación gratis",
    personal: "Iniciación personal · €50 / 30 min",
    answers: "¿Ya respondiste a las 7 preguntas? Envíalas por WhatsApp",
    note: "WhatsApp abre un mensaje preparado. Revísalo y pulsa Enviar; el sitio no envía nada automáticamente.",
    tagline: "Contacto directo · sin registro",
  },
} as const;

export function tantraInitiationWhatsAppUrl(locale: PublicLocale, intent: Intent) {
  const t = copy[locale];
  return whatsappEnquiryUrl({
    locale,
    service: t.service,
    request: t.requests[intent],
    context: intent === "answers" ? t.answerContext : undefined,
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
        <a
          id="apply-free"
          href={tantraInitiationWhatsAppUrl(locale, "free")}
          className={styles.whatsappPrimary}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} aria-hidden="true" />
          {t.free}
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <a
          id="apply-personal"
          href={tantraInitiationWhatsAppUrl(locale, "personal")}
          className={styles.whatsappSecondary}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.personal}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <a
        id="apply-answers"
        href={tantraInitiationWhatsAppUrl(locale, "answers")}
        className={styles.whatsappAnswers}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t.answers} <ArrowUpRight size={15} aria-hidden="true" />
      </a>
      <p className={styles.whatsappNote}>{t.note}</p>
    </div>
  );
}
