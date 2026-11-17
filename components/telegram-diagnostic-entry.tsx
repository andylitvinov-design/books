import { MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramExpressReviewHandoff, whatsappExpressReviewHandoff } from "@/lib/crm/express-review-channel-handoff.mjs";
import styles from "./telegram-diagnostic-entry.module.css";

const copy = {
  en: {
    title: "Choose a messenger",
    intro: "Message Andrey in Telegram or WhatsApp. Telegram opens his personal chat, not a separate bot. An AI assistant can reply there when connected; otherwise Andrey can reply directly.",
    telegram: "Message Andrey in Telegram",
    telegramHint: "Personal chat · English",
    whatsapp: "Message Andrey in WhatsApp",
    whatsappHint: "Personal chat · manual reply",
    note: "Review the draft and tap Send in your messenger. Opening a link does not register a CRM enquiry or confirm an appointment. Use the secure site for sensitive records.",
    manual: "WhatsApp is a personal message, not an automated questionnaire.",
  },
  ru: {
    title: "Выберите мессенджер",
    intro: "Напишите Андрею в Telegram или WhatsApp. Telegram откроет его личный чат, не отдельного бота. Если AI-помощник подключён, он сможет ответить здесь; иначе ответит Андрей лично.",
    telegram: "Написать Андрею в Telegram",
    telegramHint: "Личный чат · русский язык",
    whatsapp: "Написать Андрею в WhatsApp",
    whatsappHint: "Личный чат · ответ вручную",
    note: "Проверьте сообщение и нажмите «Отправить» в мессенджере. Открытие ссылки ещё не создаёт заявку в CRM или запись. Личные документы передавайте через защищённую форму сайта.",
    manual: "WhatsApp — личное сообщение, а не автоматическая анкета.",
  },
  es: {
    title: "Elige una mensajería",
    intro: "Escribe a Andrey por Telegram o WhatsApp. Telegram abre su chat personal, no otro bot. Si el asistente IA está conectado, puede responder allí; en caso contrario, Andrey puede responder personalmente.",
    telegram: "Escribir a Andrey por Telegram",
    telegramHint: "Chat personal · español",
    whatsapp: "Escribir a Andrey por WhatsApp",
    whatsappHint: "Chat personal · respuesta manual",
    note: "Revisa el mensaje y pulsa Enviar. Abrir el enlace no registra una solicitud en el CRM ni confirma una cita. Utiliza la web segura para documentos sensibles.",
    manual: "WhatsApp es un mensaje personal, no un cuestionario automático.",
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
