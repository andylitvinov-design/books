"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import { whatsappExpressReviewHandoff } from "@/lib/crm/express-review-channel-handoff.mjs";
import styles from "./telegram-diagnostic-entry.module.css";

const copy = {
en: {
    title: "Where would you like to write?",
    intro: "Start with a short message. Telegram can guide you through a few follow-up questions. With WhatsApp, you'll write to Andrey directly.",
    telegram: "Write on Telegram",
    telegramHint: "Questions in English",
    aiIntro: "In Telegram, the assistant may ask a few questions to understand your request. On WhatsApp, you'll send a message directly.",
    aiHint: "Follow-up questions in English",
    whatsapp: "Write on WhatsApp",
    whatsappHint: "Personal message",
    manual: "WhatsApp opens a message ready for you to review. You'll still need to press Send.",
    telegramUnavailable: "Telegram requests aren't available at the moment. You can write on WhatsApp or use the private website questionnaire.",
    note: "Opening a link doesn't send a request. Please keep medical documents and other private information out of messenger chats.",
  },
ru: {
    title: "Где вам удобнее написать?",
    intro: "Для начала хватит короткого сообщения. В Telegram помощник может задать несколько вопросов. В WhatsApp вы напишете мне напрямую.",
    telegram: "Написать в Telegram",
    telegramHint: "Вопросы на русском",
    aiIntro: "В Telegram помощник уточнит ваш запрос несколькими вопросами. В WhatsApp сообщение отправляется напрямую.",
    aiHint: "Уточняющие вопросы на русском",
    whatsapp: "Написать в WhatsApp",
    whatsappHint: "Личное сообщение",
    manual: "WhatsApp откроет готовое сообщение. Проверьте его и нажмите «Отправить».",
    telegramUnavailable: "Сейчас обращение через Telegram недоступно. Можно написать в WhatsApp или открыть личную анкету на сайте.",
    note: "Переход по ссылке ещё не отправляет заявку. Медицинские документы и другие личные сведения не присылайте в мессенджеры.",
  },
  es: {
    title: "Elige una mensajería",
    intro: "Telegram te guía por seis preguntas breves en español. WhatsApp abre un mensaje personal a Andrey.",
    telegram: "Solicitar mi revisión gratis por Telegram",
    telegramHint: "6 preguntas guiadas · español",
    aiIntro: "En Telegram, la IA hace preguntas adaptadas a tus respuestas. WhatsApp abre un mensaje personal a Andrey.",
    aiHint: "Diálogo IA · español",
    whatsapp: "Solicitar mi revisión gratis por WhatsApp",
    whatsappHint: "Mensaje personal · respuesta manual",
    manual: "WhatsApp no es un cuestionario automático. Revisa el mensaje preparado y pulsa Enviar.",
    telegramUnavailable: "Telegram no está disponible ahora. Puedes usar WhatsApp o el formulario seguro de esta web.",
    note: "La conversación empieza al enviar el mensaje. Telegram pide consentimiento primero. Usa el formulario seguro para documentos médicos y resultados de pruebas.",
  },
} as const;

export function TelegramDiagnosticEntry({ locale }: { locale: PublicLocale }) {
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setTelegramUrl(null);
    setAiAvailable(false);
    fetch("/api/public/telegram-diagnostic", {
      cache: "no-store", credentials: "same-origin", signal: controller.signal,
    }).then(response => response.ok ? response.json() : null).then(data => {
      if (controller.signal.aborted) return;
      // Route locale is authoritative; never infer the user's language from a device.
      const link = data?.available === true ? data.urls?.[locale] : null;
      const expected = new RegExp("^https://t\\.me/[A-Za-z0-9_]{5,32}\\?start=hhreview_" + locale + "$");
      const verified = typeof link === "string" && expected.test(link);
      setTelegramUrl(verified ? link : null);
      setAiAvailable(verified && data?.aiInterviewAvailable === true);
    }).catch(() => { if (!controller.signal.aborted) setTelegramUrl(null); });
    return () => controller.abort();
  }, [locale]);

  const t = copy[locale];
  const whatsappUrl = whatsappExpressReviewHandoff(locale);

  return (
    <aside className={styles.entry} data-express-review-messenger-choice={locale} lang={locale} aria-label={t.title}>
      <div className={styles.content}>
        <h3>{t.title}</h3>
        <p>{aiAvailable ? t.aiIntro : t.intro}</p>
        <small>{t.note}</small>
      </div>
      <div className={styles.channels}>
        {telegramUrl ? (
          <a href={telegramUrl} target="_blank" rel="noopener noreferrer nofollow"
            referrerPolicy="no-referrer" data-express-review-channel="telegram"
            data-channel-locale={locale} className={styles.action}>
            <span className={styles.icon} aria-hidden="true"><Send size={21} strokeWidth={2.2} /></span>
            <span className={styles.actionText}><strong>{t.telegram}</strong><small>{aiAvailable ? t.aiHint : t.telegramHint}</small></span>
          </a>
        ) : (
          <p className={styles.unavailable} role="status">{t.telegramUnavailable}</p>
        )}
        {whatsappUrl ? (
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer nofollow"
            referrerPolicy="no-referrer" data-express-review-channel="whatsapp-manual"
            data-channel-locale={locale} className={styles.manualAction}>
            <span className={styles.icon} aria-hidden="true"><MessageCircle size={22} strokeWidth={2.2} /></span>
            <span className={styles.actionText}><strong>{t.whatsapp}</strong><small>{t.whatsappHint}</small></span>
          </a>
        ) : null}
        {whatsappUrl ? <small className={styles.manualNote}>{t.manual}</small> : null}
      </div>
    </aside>
  );
}
