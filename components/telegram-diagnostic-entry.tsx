import { MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramExpressReviewHandoff, whatsappExpressReviewHandoff } from "@/lib/crm/express-review-channel-handoff.mjs";
import styles from "./telegram-diagnostic-entry.module.css";

const copy = {
en: {
    title: "Where would you like to write?",
    intro: "Choose Telegram or WhatsApp, whichever feels easier. My assistant may help with the first questions; I'll read your request personally.",
    telegram: "Write on Telegram",
    telegramHint: "Personal chat with Andrey · English",
    whatsapp: "Write on WhatsApp",
    whatsappHint: "Personal message",
    manual: "WhatsApp opens a prepared message. You decide whether to send it.",
    note: "The link opens a chat, but doesn't send a message. Tap Send there; use the secure questionnaire for private documents.",
  },
ru: {
    title: "Где вам удобнее написать?",
    intro: "Напишите там, где вам удобнее. Помощник может уточнить первые детали, а я лично прочитаю ваш запрос.",
    telegram: "Написать в Telegram",
    telegramHint: "Личный чат с Андреем · на русском",
    whatsapp: "Написать в WhatsApp",
    whatsappHint: "Личное сообщение",
    manual: "WhatsApp откроет готовый текст. Проверьте его и нажмите «Отправить».",
    note: "Ссылка открывает чат, но ничего не отправляет. Нажмите «Отправить». Личные документы — только через защищённую анкету.",
  },
  es: {
    title: "¿Dónde prefieres escribir?",
    intro: "Escríbeme por Telegram o WhatsApp, como prefieras. Mi asistente puede hacerte las primeras preguntas; leeré tu solicitud personalmente.",
    telegram: "Escribir a Andrey por Telegram",
    telegramHint: "Chat personal · español",
    whatsapp: "Escribir a Andrey por WhatsApp",
    whatsappHint: "Mensaje personal",
    manual: "WhatsApp abre un mensaje preparado. Revísalo y pulsa Enviar.",
    note: "El enlace abre el chat, pero no envía nada. Pulsa Enviar; los documentos privados van por el formulario seguro.",
  },
} as const;

export function TelegramDiagnosticEntry({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const telegramUrl = telegramExpressReviewHandoff(locale);
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
            data-channel-locale={locale} data-telegram-route="human-business" className={styles.action}>
            <span className={styles.icon} aria-hidden="true"><Send size={21} strokeWidth={2.2} /></span>
            <span className={styles.actionText}><strong>{t.telegram}</strong><small>{t.telegramHint}</small></span>
          </a>
        ) : null}
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
