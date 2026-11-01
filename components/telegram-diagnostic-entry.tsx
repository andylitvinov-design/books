"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import { whatsappExpressReviewHandoff } from "@/lib/crm/express-review-channel-handoff.mjs";
import styles from "./telegram-diagnostic-entry.module.css";

const copy = {
  en: {
    title: "Choose a messenger",
    intro: "Telegram guides you through six short questions in English. WhatsApp opens a personal message to Andrey.",
    telegram: "Request my free review via Telegram",
    telegramHint: "6 guided questions · English",
    whatsapp: "Request my free review via WhatsApp",
    whatsappHint: "Personal message · manual reply",
    manual: "WhatsApp is not an automated questionnaire. Check the prepared message and tap Send.",
    telegramUnavailable: "Telegram is not available right now. You can use WhatsApp or the secure website form.",
    note: "Only sending a message starts a conversation. Telegram asks for consent first. Keep medical records and test results in the secure website form.",
  },
  ru: {
    title: "Выберите мессенджер",
    intro: "В Telegram вас ждут шесть коротких вопросов на русском. WhatsApp открывает личное сообщение Андрею.",
    telegram: "Запросить бесплатный разбор через Telegram",
    telegramHint: "6 вопросов · русский язык",
    whatsapp: "Запросить бесплатный разбор через WhatsApp",
    whatsappHint: "Личное сообщение · ответ вручную",
    manual: "WhatsApp — не автоматическая анкета. Проверьте готовый текст и нажмите «Отправить».",
    telegramUnavailable: "Telegram сейчас недоступен. Можно написать в WhatsApp или заполнить защищённую форму сайта.",
    note: "Обращение начинается только после отправки сообщения. Telegram сначала запрашивает согласие. Медицинские документы и результаты тестов передавайте через защищённую форму.",
  },
  es: {
    title: "Elige una mensajería",
    intro: "Telegram te guía por seis preguntas breves en español. WhatsApp abre un mensaje personal a Andrey.",
    telegram: "Solicitar mi revisión gratis por Telegram",
    telegramHint: "6 preguntas guiadas · español",
    whatsapp: "Solicitar mi revisión gratis por WhatsApp",
    whatsappHint: "Mensaje personal · respuesta manual",
    manual: "WhatsApp no es un cuestionario automático. Revisa el mensaje preparado y pulsa Enviar.",
    telegramUnavailable: "Telegram no está disponible ahora. Puedes usar WhatsApp o el formulario seguro de esta web.",
    note: "La conversación empieza al enviar el mensaje. Telegram pide consentimiento primero. Usa el formulario seguro para documentos médicos y resultados de pruebas.",
  },
} as const;

export function TelegramDiagnosticEntry({ locale }: { locale: PublicLocale }) {
  const [telegramUrl, setTelegramUrl] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setTelegramUrl(null);
    fetch("/api/public/telegram-diagnostic", {
      cache: "no-store", credentials: "same-origin", signal: controller.signal,
    }).then(response => response.ok ? response.json() : null).then(data => {
      if (controller.signal.aborted) return;
      // Route locale is authoritative; never infer the user's language from a device.
      const link = data?.available === true ? data.urls?.[locale] : null;
      const expected = new RegExp("^https://t\\.me/[A-Za-z0-9_]{5,32}\\?start=hhreview_" + locale + "$");
      setTelegramUrl(typeof link === "string" && expected.test(link) ? link : null);
    }).catch(() => { if (!controller.signal.aborted) setTelegramUrl(null); });
    return () => controller.abort();
  }, [locale]);

  const t = copy[locale];
  const whatsappUrl = whatsappExpressReviewHandoff(locale);

  return (
    <aside className={styles.entry} data-express-review-messenger-choice={locale} lang={locale} aria-label={t.title}>
      <div className={styles.content}>
        <h3>{t.title}</h3>
        <p>{t.intro}</p>
        <small>{t.note}</small>
      </div>
      <div className={styles.channels}>
        {telegramUrl ? (
          <a href={telegramUrl} target="_blank" rel="noopener noreferrer nofollow"
            referrerPolicy="no-referrer" data-express-review-channel="telegram"
            data-channel-locale={locale} className={styles.action}>
            <span className={styles.icon} aria-hidden="true"><Send size={21} strokeWidth={2.2} /></span>
            <span className={styles.actionText}><strong>{t.telegram}</strong><small>{t.telegramHint}</small></span>
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
