"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./tantra-free-initiation.module.css";

type Intent = "free" | "personal" | "session" | "answers" | "feedback";
const intents: Intent[] = ["free", "personal", "session", "answers", "feedback"];

// One compact client-side choice, using the existing CRM-first phone and messenger handoff.
// Answers and feedback are composed by the visitor in their own chat, not stored in URLs.
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
    heading: "Write to Andrey",
    lead: "Choose what you need, add your phone and select a messenger.",
    choose: "I would like to",
    free: "Request free initiation",
    personal: "Personal online initiation · €50 / 30 min",
    session: "Personal session + initiation · €100 / 60 min",
    answers: "Send my 7 answers",
    feedback: "Share my practice impressions",
    note: "With your consent, your phone and request are saved for a personal reply. The chat message is only sent if you tap Send yourself.",
    tagline: "PERSONAL REPLY · NO REGISTRATION",
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
    heading: "Напишите Андрею",
    lead: "Выберите запрос, укажите телефон и удобный мессенджер.",
    choose: "Меня интересует",
    free: "Запросить инициацию бесплатно",
    personal: "Личная онлайн-инициация · €50 / 30 мин",
    session: "Сессия + инициация · 100 € / 60 мин",
    answers: "Отправить 7 ответов",
    feedback: "Поделиться впечатлениями",
    note: "После вашего согласия телефон и запрос сохраняются для личного ответа. Сообщение в чате вы отправляете самостоятельно.",
    tagline: "ЛИЧНЫЙ ОТВЕТ · БЕЗ РЕГИСТРАЦИИ",
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
    heading: "Escribe a Andrey",
    lead: "Elige una solicitud, añade tu teléfono y selecciona un chat.",
    choose: "Me interesa",
    free: "Solicitar iniciación gratis",
    personal: "Iniciación personal online · €50 / 30 min",
    session: "Sesión personal + iniciación · 100 € / 60 min",
    answers: "Enviar mis 7 respuestas",
    feedback: "Compartir mis impresiones",
    note: "Con tu consentimiento guardamos el teléfono y la solicitud para responderte. El mensaje del chat solo se envía cuando tú pulsas Enviar.",
    tagline: "RESPUESTA PERSONAL · SIN REGISTRO",
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
  const [intent, setIntent] = useState<Intent>("free");

  // All five existing deep links remain valid. Entering from a personal,
  // answer or feedback CTA preselects the corresponding single form choice.
  useEffect(() => {
    const selectFromHash = () => {
      const next = intents.find(value => window.location.hash === "#apply-" + value);
      if (next) setIntent(next);
    };
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
  }, []);

  return (
    <div className={styles.whatsappCapture} data-tantra-whatsapp-capture>
      <div className={styles.whatsappIntro}>
        <p className={styles.whatsappTagline}>{t.tagline}</p>
        <h3 className={styles.whatsappTitle}>{t.heading}</h3>
        <p className={styles.whatsappLead}>{t.lead}</p>
      </div>
      <div className={styles.whatsappAnchors} aria-hidden="true">
        {intents.map(value => <span id={"apply-" + value} key={value} />)}
      </div>
      <div className={styles.whatsappField}>
        <label htmlFor={"tantra-request-" + locale}>{t.choose}</label>
        <span className={styles.whatsappSelectWrap}>
          <select
            id={"tantra-request-" + locale}
            value={intent}
            onChange={event => {
              const next = event.target.value;
              if (intents.some(value => value === next)) setIntent(next as Intent);
            }}
          >
            {intents.map(value => <option key={value} value={value}>{t[value]}</option>)}
          </select>
          <ChevronDown size={19} aria-hidden="true" />
        </span>
      </div>
      <ContactChannelChooser
        key={intent}
        compactPhone
        stayAfterSave
        locale={locale}
        resetKey={"tantra-initiation-" + locale + "-" + intent}
        whatsappUrl={tantraInitiationWhatsAppUrl(locale, intent)}
        publicTopic={t.service + " · " + t[intent]}
      />
      <p className={styles.whatsappNote}>{t.note}</p>
    </div>
  );
}
