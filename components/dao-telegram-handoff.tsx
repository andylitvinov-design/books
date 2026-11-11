import { ArrowUpRight, MessageCircle } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./dao-telegram-handoff.module.css";

const copy = {
  en: {
    eyebrow: "DAO WISDOM · TELEGRAM",
    title: "Start your free personal Wu Xing express review",
    detail: "The existing Holistic House bot asks for your topic, goal and an optional drawing. You decide what to share; Andrey reviews the request personally.",
    action: "Begin in Telegram",
    safety: "Consent first. No medical records or test results in chat. You can use the form below instead.",
  },
  ru: {
    eyebrow: "ДАОССКАЯ МУДРОСТЬ · TELEGRAM",
    title: "Начните бесплатный личный блиц-разбор У-Син",
    detail: "Бот Holistic House задаст вопросы о вашей теме и цели, предложит необязательный рисунок. Вы сами решаете, что отправлять; Андрей разбирает запрос лично.",
    action: "Начать в Telegram",
    safety: "Сначала согласие. Не присылайте медицинские документы и результаты тестов. Вместо бота можно выбрать форму ниже.",
  },
  es: {
    eyebrow: "SABIDURÍA TAOÍSTA · TELEGRAM",
    title: "Empieza tu revisión personal gratuita de Wu Xing",
    detail: "El bot de Holistic House pregunta por tu tema, meta y un dibujo opcional. Tú decides qué compartir; Andrey revisa la solicitud personalmente.",
    action: "Empezar en Telegram",
    safety: "Primero, tu consentimiento. No envíes informes médicos ni resultados de pruebas. También puedes usar el formulario de abajo.",
  },
} as const;

function safeDaoUrl(raw: unknown, locale: PublicLocale): string | null {
  if (typeof raw !== "string") return null;
  const match = /^https:\/\/t\.me\/([A-Za-z0-9_]{5,32})\?start=hhdao_(en|ru|es)$/.exec(raw);
  return match && /bot$/i.test(match[1]) && match[2] === locale ? raw : null;
}

/** Fail-closed: render NO bot link until the existing server-side readiness gate approves it. */
/** Public URL is evaluated by the server on every request; no navigation-time fetch.
 * The verified transport/diagnostic gate stays server-only and this component
 * accepts only a locale-matched public t.me bot link, never credentials.
 */
export function DaoTelegramHandoff({ locale, approvedUrl }: { locale: PublicLocale; approvedUrl: string | null }) {
  const url = safeDaoUrl(approvedUrl, locale);
  if (!url) return null;
  const t = copy[locale];
  return (
    <section className={styles.card} data-dao-telegram-entry="ready" aria-labelledby="dao-telegram-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}><MessageCircle aria-hidden="true" size={17} />{t.eyebrow}</p>
        <h2 id="dao-telegram-title">{t.title}</h2>
        <p>{t.detail}</p>
        <small>{t.safety}</small>
      </div>
      <a className={styles.cta} href={url} target="_blank" rel="noopener noreferrer"
        referrerPolicy="no-referrer" data-dao-telegram-cta>
        {t.action}<ArrowUpRight aria-hidden="true" size={18} />
      </a>
    </section>
  );
}
