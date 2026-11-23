import { MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramExpressReviewHandoff, whatsappExpressReviewHandoff } from "@/lib/crm/express-review-channel-handoff.mjs";
import styles from "./telegram-diagnostic-entry.module.css";

const copy = {
en: {
    title: "Where would you like to write?",
    intro: "Choose Telegram or WhatsApp, whichever is easier. Ali can guide your free review, and Andrey will personally read the summary you choose to send.",
    telegram: "Write on Telegram",
    telegramHint: "Ali assistant · English",
    whatsapp: "Write on WhatsApp",
    whatsappHint: "Personal message",
    manual: "WhatsApp opens a prepared message. You decide whether to send it.",
    note: "Opening Telegram does not send your request. Tap Start to begin. Your summary reaches Andrey only after your approval. Photos and drawings are optional; private documents belong in the secure questionnaire.",
  },
ru: {
    title: "Где вам удобнее написать?",
    intro: "Напишите в Telegram или WhatsApp — как вам удобнее. Ali поможет с бесплатным разбором, а Андрей лично прочитает резюме, которое вы решите отправить.",
    telegram: "Написать в Telegram",
    telegramHint: "Помощник Ali · на русском",
    whatsapp: "Написать в WhatsApp",
    whatsappHint: "Личное сообщение",
    manual: "WhatsApp откроет готовый текст. Проверьте его и нажмите «Отправить».",
    note: "Открытие Telegram не создаёт заявку. Нажмите Start, чтобы начать. Резюме попадёт Андрею только после вашего согласия; фото и рисунок необязательны. Личные документы — через защищённую анкету.",
  },
  es: {
    title: "¿Dónde prefieres escribir?",
    intro: "Escribe por Telegram o WhatsApp, como prefieras. Ali te acompaña en la revisión gratuita y Andrey leerá el resumen que decidas compartir.",
    telegram: "Escribir a Andrey por Telegram",
    telegramHint: "Asistente Ali · español",
    whatsapp: "Escribir a Andrey por WhatsApp",
    whatsappHint: "Mensaje personal",
    manual: "WhatsApp abre un mensaje preparado. Revísalo y pulsa Enviar.",
    note: "Abrir Telegram no envía una solicitud. Pulsa Start para comenzar; el resumen llegará al profesional solo si lo apruebas. La foto y el dibujo son opcionales; usa el formulario protegido para documentos privados.",
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
            data-channel-locale={locale} data-telegram-route="ali-free-diagnostic-v3" className={styles.action}>
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
