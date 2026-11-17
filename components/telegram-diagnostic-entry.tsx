import { MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramExpressReviewHandoff, whatsappExpressReviewHandoff } from "@/lib/crm/express-review-channel-handoff.mjs";
import styles from "./telegram-diagnostic-entry.module.css";

const copy = {
en: {
    title: "Where would you like to write?",
    intro: "You can write to me directly on Telegram or WhatsApp. Telegram opens my personal chat, not a separate bot. If my assistant is connected, it may ask a few questions; otherwise I can reply myself.",
    telegram: "Write on Telegram",
    telegramHint: "Personal chat with Andrey · English",
    whatsapp: "Write on WhatsApp",
    whatsappHint: "Personal message",
    manual: "WhatsApp opens a prepared message. You decide whether to send it.",
    note: "Opening a link doesn't send a request or register it in CRM. Review the message and tap Send in the messenger. Keep health documents and other sensitive details in the secure questionnaire.",
  },
ru: {
    title: "Где вам удобнее написать?",
    intro: "Напишите мне в Telegram или WhatsApp. В Telegram откроется мой личный чат, а не отдельный бот. Если помощник подключён, он может задать несколько вопросов. Если нет — я отвечу сам.",
    telegram: "Написать в Telegram",
    telegramHint: "Личный чат с Андреем · на русском",
    whatsapp: "Написать в WhatsApp",
    whatsappHint: "Личное сообщение",
    manual: "WhatsApp откроет готовый текст. Проверьте его и нажмите «Отправить».",
    note: "Переход по ссылке не отправляет сообщение и не создаёт заявку в CRM. Нажмите «Отправить» в мессенджере. Личные документы и сведения о здоровье передавайте через защищённую анкету.",
  },
  es: {
    title: "¿Dónde prefieres escribir?",
    intro: "Puedes escribirme por Telegram o WhatsApp. Telegram abre mi chat personal, no otro bot. Si el asistente está conectado, puede hacer algunas preguntas; si no, podré responderte yo.",
    telegram: "Escribir a Andrey por Telegram",
    telegramHint: "Chat personal · español",
    whatsapp: "Escribir a Andrey por WhatsApp",
    whatsappHint: "Mensaje personal",
    manual: "WhatsApp abre un mensaje preparado. Revísalo y pulsa Enviar.",
    note: "Abrir el enlace no envía el mensaje ni registra una solicitud en el CRM. Para documentos médicos y datos privados utiliza el formulario seguro.",
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
