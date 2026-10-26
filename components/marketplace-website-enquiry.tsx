"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./marketplace-website-enquiry.module.css";

const copy = {
  en: {
    eyebrow: "DIRECT WEBSITE REQUEST", title: "Ask this practitioner",
    intro: "Send a request here — no chatbot, Telegram or sign-in needed.",
    name: "Your name (optional)", reply: "Email or phone with country code",
    replyPlaceholder: "you@example.com or +14165550123",
    note: "A short question (optional)", notePlaceholder: "A non-sensitive question about the service",
    consent: "I agree to securely share my contact and this request with the selected practitioner for one personal reply. No marketing.",
    send: "Send request", sending: "Saving…", success: "Request saved",
    receipt: "Your reference", next: "The practitioner will check your request and contact you. This is not a confirmed booking or payment.",
    invalid: "Enter a valid email or an international phone number starting with +.",
    failed: "We could not confirm your request. Please try again; you will not be charged.",
    unavailable: "This service may have become unavailable. Refresh the page and try again.",
    privateNote: "Do not add medical information, test results or private documents here.",
  },
  ru: {
    eyebrow: "ЗАЯВКА ПРЯМО НА САЙТЕ", title: "Связаться с мастером",
    intro: "Отправьте запрос здесь — без Telegram, чат-бота и регистрации.",
    name: "Ваше имя (необязательно)", reply: "Email или телефон с кодом страны",
    replyPlaceholder: "you@example.com или +14165550123",
    note: "Вопрос (необязательно)", notePlaceholder: "Короткий вопрос об услуге, без личных подробностей",
    consent: "Я согласен(на) передать выбранному мастеру свои контакты и эту заявку для одного личного ответа. Без рассылок.",
    send: "Отправить заявку", sending: "Сохраняем…", success: "Заявка сохранена",
    receipt: "Номер заявки", next: "Мастер рассмотрит запрос и свяжется с вами. Время и оплата пока не подтверждены.",
    invalid: "Укажите email или международный номер телефона с +.",
    failed: "Не удалось подтвердить заявку. Попробуйте ещё раз; оплата не списана.",
    unavailable: "Услуга могла стать недоступна. Обновите страницу и попробуйте снова.",
    privateNote: "Не передавайте здесь сведения о здоровье, результаты тестов или личные документы.",
  },
  es: {
    eyebrow: "SOLICITUD DIRECTA EN LA WEB", title: "Contactar al profesional",
    intro: "Envía la solicitud aquí, sin Telegram, chatbot ni registro.",
    name: "Tu nombre (opcional)", reply: "Correo o teléfono con prefijo internacional",
    replyPlaceholder: "tu@ejemplo.com o +14165550123",
    note: "Una pregunta (opcional)", notePlaceholder: "Una consulta breve sin información sensible",
    consent: "Acepto compartir de forma segura mis datos de contacto y esta solicitud con el profesional elegido para una respuesta personal. Sin publicidad.",
    send: "Enviar solicitud", sending: "Guardando…", success: "Solicitud guardada",
    receipt: "Referencia", next: "El profesional revisará la solicitud y te contactará. No es una reserva ni un pago.",
    invalid: "Introduce un correo válido o un teléfono internacional con +.",
    failed: "No pudimos confirmar tu solicitud. Inténtalo de nuevo; no se ha cobrado nada.",
    unavailable: "Este servicio puede no estar disponible. Actualiza la página e inténtalo de nuevo.",
    privateNote: "No incluyas datos de salud, resultados de pruebas ni documentos privados.",
  },
} as const;

function parseContact(raw: string): { email: string; phone: string } | null {
  const value = raw.trim();
  if (/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value) && value.length <= 254)
    return { email: value.toLowerCase(), phone: "" };
  const phone = value.replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(phone) ? { email: "", phone } : null;
}

type Props = {
  locale: PublicLocale;
  serviceId: string;
  serviceTitle: string;
  practitionerName: string;
  practitionerSlug: string;
  serviceSlug: string;
};

export function MarketplaceWebsiteEnquiry({
  locale, serviceId, serviceTitle, practitionerName, practitionerSlug, serviceSlug,
}: Props) {
  const t = copy[locale];
  const [name, setName] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);

  function edited() {
    operationId.current = null;
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || reference) return;
    const contact = parseContact(reply);
    if (!contact || !consent || website.trim()) {
      setError(t.invalid);
      return;
    }
    operationId.current ||= window.crypto.randomUUID();
    setSending(true);
    setError("");
    try {
      const response = await fetch("/api/service-enquiries", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: operationId.current,
          serviceId,
          serviceTitle,
          sourcePath: "/" + locale + "/services/" + practitionerSlug + "/" + serviceSlug,
          locale,
          description: note.trim(),
          contactConsent: true,
          contact: { displayName: name.trim(), ...contact },
          website: "",
        }),
      });
      const body = await response.json().catch(() => null);
      if (response.ok && body?.saved === true && /^HH-[A-F0-9]{12}$/.test(body.referenceCode)) {
        setReference(body.referenceCode);
      } else {
        if (response.status === 404) setError(t.unavailable);
        else setError(t.failed);
        // 409 means the server rejected a changed payload for this UUID.
        if (response.status === 409 || response.status === 400)
          operationId.current = null;
      }
    } catch {
      // Keep the same UUID after an unknown network outcome to avoid duplicate leads.
      setError(t.failed);
    } finally {
      setSending(false);
    }
  }

  return (
    <section id="site-service-request" className={styles.panel} data-marketplace-site-request lang={locale}
      aria-label={t.title}>
      <p className={styles.eyebrow}>{t.eyebrow}</p>
      <h2>{t.title}</h2>
      <p className={styles.intro}>{t.intro}</p>
      <p className={styles.target}><strong>{serviceTitle}</strong> · {practitionerName}</p>
      {reference ? (
        <div role="status" className={styles.receipt} data-marketplace-enquiry-saved>
          <CheckCircle2 aria-hidden="true" size={22} />
          <div><strong>{t.success} · {t.receipt}: {reference}</strong><p>{t.next}</p></div>
        </div>
      ) : (
        <form onSubmit={(event) => { void submit(event); }} className={styles.form} data-marketplace-website-form>
          <label>{t.name}
            <input autoComplete="name" maxLength={120} disabled={sending}
              value={name} onChange={(event) => { setName(event.target.value); edited(); }} />
          </label>
          <label>{t.reply} *
            <input required autoComplete="email" type="text" maxLength={254}
              value={reply} placeholder={t.replyPlaceholder} disabled={sending}
              onChange={(event) => { setReply(event.target.value); edited(); }} />
          </label>
          <label className={styles.wide}>{t.note}
            <textarea rows={2} maxLength={1400} disabled={sending}
              placeholder={t.notePlaceholder} value={note}
              onChange={(event) => { setNote(event.target.value); edited(); }} />
          </label>
          <div className={styles.trap} aria-hidden="true">
            <label>Website <input tabIndex={-1} autoComplete="off" value={website}
              onChange={(event) => setWebsite(event.target.value)} /></label>
          </div>
          <label className={styles.consent}>
            <input type="checkbox" required checked={consent} disabled={sending}
              onChange={(event) => { setConsent(event.target.checked); edited(); }} />
            <span>{t.consent}</span>
          </label>
          <p className={styles.note}><ShieldCheck size={15} aria-hidden="true" />{t.privateNote}</p>
          <button type="submit" disabled={sending || !consent}>{sending ? t.sending : t.send}<ArrowRight size={18} aria-hidden="true" /></button>
          {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        </form>
      )}
    </section>
  );
}
