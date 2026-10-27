"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { EnergySupportMaster, SupportRequestKind } from "./remote-energy-support-booking";
import styles from "./remote-energy-support-booking.module.css";

type Locale = "en" | "ru" | "es";
type Props = {
  locale: Locale;
  master: EnergySupportMaster;
  kind: SupportRequestKind;
  goal: string;
  intention: string;
  method?: string;
  format?: "asynchronous" | "live";
  duration?: number;
  price?: number;
  day?: string;
  time?: string;
  timezone?: string;
};

const copy = {
  en: {
    contact: "Email or phone / WhatsApp",
    contactHint: "One contact is enough. No account is needed.",
    contactPlaceholder: "you@example.com or +1 416 555 0123",
    name: "Your name (optional)",
    namePlaceholder: "How should we address you?",
    consent: "I agree to one personal reply about this request. No advertising.",
    submit: "Confirm request",
    sending: "Saving your request…",
    invalid: "Enter a valid email or international phone number (+country code).",
    invalidTime: "Please select both a future date and a time, or leave both blank.",
    consentNeeded: "Please agree to a personal reply before sending.",
    failed: "Your request could not be confirmed. Please try again.",
    unavailable: "Requests are temporarily unavailable. Please try again later.",
    success: "Your request has been received",
    reference: "Request number",
    pending: "Holistic House will contact you about the selected practitioner and arrange availability. This is not a confirmed booking or payment.",
    privacy: "Your contact and message are sent securely to Holistic House only after you confirm.",
  },
  ru: {
    contact: "Email или телефон / WhatsApp",
    contactHint: "Достаточно одного контакта. Аккаунт не требуется.",
    contactPlaceholder: "email@example.com или +1 416 555 0123",
    name: "Как к вам обращаться (необязательно)",
    namePlaceholder: "Ваше имя",
    consent: "Согласен(на) на один личный ответ по этой заявке. Без рекламы.",
    submit: "Подтвердить заявку",
    sending: "Сохраняем заявку…",
    invalid: "Укажите корректный email или телефон с международным кодом (+...).",
    invalidTime: "Укажите будущую дату и время вместе либо оставьте оба поля пустыми.",
    consentNeeded: "Для отправки подтвердите согласие на личный ответ.",
    failed: "Не удалось подтвердить получение заявки. Повторите отправку.",
    unavailable: "Приём заявок временно недоступен. Попробуйте позже.",
    success: "Ваша заявка получена",
    reference: "Номер заявки",
    pending: "Holistic House свяжется с вами по выбранному мастеру и согласует время. Запись и оплата пока не подтверждены.",
    privacy: "Ваши контакты и сообщение отправляются в Holistic House только после подтверждения.",
  },
  es: {
    contact: "Email o teléfono / WhatsApp",
    contactHint: "Basta con un contacto. No necesitas cuenta.",
    contactPlaceholder: "email@ejemplo.com o +1 416 555 0123",
    name: "Tu nombre (opcional)",
    namePlaceholder: "¿Cómo te llamas?",
    consent: "Acepto una respuesta personal sobre esta solicitud. Sin publicidad.",
    submit: "Confirmar solicitud",
    sending: "Guardando solicitud…",
    invalid: "Introduce un email válido o teléfono con prefijo internacional (+...).",
    invalidTime: "Elige fecha y hora futuras o deja ambos campos vacíos.",
    consentNeeded: "Acepta recibir una respuesta personal para enviar.",
    failed: "No se pudo confirmar tu solicitud. Inténtalo de nuevo.",
    unavailable: "Las solicitudes no están disponibles temporalmente. Inténtalo más tarde.",
    success: "Hemos recibido tu solicitud",
    reference: "Número de solicitud",
    pending: "Holistic House te contactará sobre el profesional elegido y su disponibilidad. No es una reserva ni un pago confirmados.",
    privacy: "Tus datos se envían de forma segura a Holistic House solo al confirmar.",
  },
} as const;

// The public request is a consented lead, not a reservation or an authorized
// payment. The published master/price is context for the owner to verify.
export function RemoteSupportEnquiryContact({
  locale, master, kind, goal, intention, method, format, duration, price, day = "", time = "", timezone = "",
}: Props) {
  const t = copy[locale];
  const [contact, setContact] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedReference, setSavedReference] = useState<string | null>(null);
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  const submitting = useRef(false);

  // A changed offer or preference represents a different enquiry.
  useEffect(() => {
    operationId.current = null;
    setSavedReference(null);
    setError("");
  }, [master.serviceId, kind, goal, intention, method, format, duration, price, day, time, timezone]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current || savedReference) return;
    const raw = contact.trim();
    const asPhone = raw.replace(/[\s().-]/g, "");
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
    const isPhone = /^\+[1-9][0-9]{7,14}$/.test(asPhone);
    if (!isEmail && !isPhone) { setError(t.invalid); return; }
    if (!consent) { setError(t.consentNeeded); return; }
    if ((day && !time) || (!day && time)) { setError(t.invalidTime); return; }
    if (day && time) {
      const timestamp = new Date(day + "T" + time + ":00").getTime();
      if (!Number.isFinite(timestamp) || timestamp <= Date.now() + 5 * 60_000 ||
          timestamp > Date.now() + 90 * 86_400_000) { setError(t.invalidTime); return; }
    }
    if (!goal || (kind === "energy" && (!method || !format ||
        !Number.isFinite(price) || !price || !duration))) {
      setError(t.failed);
      return;
    }

    const details = [
      "Public Holistic House request — not booked or paid",
      "Requested practitioner: " + master.name,
      "Published offering: " + master.serviceId,
      "Area: " + goal,
      ...(kind === "talisman" ? ["Type: personal talisman; price and delivery to be agreed"] : [
        "Type: remote energy support",
        "Practice: " + method,
        "Format: " + (format === "live" ? "Live online" : "Distance without call"),
        "Duration: " + duration + " min",
        "Published price (verify before payment): " + price + " " + master.currency,
        "Preferred time: " + (day && time ? day + " " + time + " (" + timezone + ")" : "Not specified"),
      ]),
      ...(intention.trim() ? ["Visitor note: " + intention.trim()] : []),
    ].join("\n").slice(0, 1400);
    const id = operationId.current || crypto.randomUUID();
    operationId.current = id;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/service-enquiries", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: id,
          serviceTitle: ((kind === "talisman" ? "Personal talisman enquiry" : "Remote energy support") +
            " · " + master.name).slice(0, 160),
          description: details,
          sourcePath: window.location.pathname,
          locale,
          contact: { displayName: displayName.trim(), email: isEmail ? raw : "", phone: isPhone && !isEmail ? asPhone : "" },
          contactConsent: true,
          website,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.saved !== true ||
          !/^HH-[A-F0-9]{12}$/.test(result.referenceCode || "")) {
        if (response.status === 409) operationId.current = null;
        setError(response.status === 503 ? t.unavailable : t.failed);
        return;
      }
      // Only the committed server response can show a receipt. No navigation
      // to the private cabinet and no claim of booking/payment confirmation.
      setSavedReference(result.referenceCode);
    } catch {
      // Keep the same operation ID on a network error for a safe idempotent retry.
      setError(t.failed);
    } finally {
      setBusy(false);
      submitting.current = false;
    }
  }

  if (savedReference) return (
    <div className={styles.enquiryReceipt} role="status" data-remote-order-confirmation>
      <strong>✓ {t.success}</strong>
      <p>{t.reference}: <b>{savedReference}</b></p>
      <p>{t.pending}</p>
    </div>
  );

  return (
    <form className={styles.enquiryContact} onSubmit={submit} data-remote-order-contact>
      <div className={styles.contactFields}>
        <div className={styles.field}>
          <label htmlFor={"remote-contact-" + master.serviceId}>{t.contact}</label>
          <input id={"remote-contact-" + master.serviceId} type="text"
            autoComplete="on" placeholder={t.contactPlaceholder}
            maxLength={254} required value={contact} disabled={busy}
            onChange={event => { setContact(event.target.value); operationId.current = null; setError(""); }}/>
          <small>{t.contactHint}</small>
        </div>
        <details className={styles.nameDetails}>
          <summary>{t.name}</summary>
          <div className={styles.field}>
            <label htmlFor={"remote-name-" + master.serviceId}>{t.name}</label>
            <input id={"remote-name-" + master.serviceId} type="text"
              autoComplete="name" maxLength={120} placeholder={t.namePlaceholder}
              value={displayName} disabled={busy}
              onChange={event => { setDisplayName(event.target.value); operationId.current = null; setError(""); }}/>
          </div>
        </details>
      </div>
      <label className={styles.contactConsent}>
        <input type="checkbox" required checked={consent} disabled={busy}
          onChange={event => { setConsent(event.target.checked); operationId.current = null; setError(""); }}/>
        <span>{t.consent}</span>
      </label>
      <label className={styles.honeypot} aria-hidden="true">
        Website
        <input type="text" tabIndex={-1} autoComplete="off" value={website}
          onChange={event => setWebsite(event.target.value)}/>
      </label>
      <button className={styles.submit} type="submit" disabled={busy || !consent}>
        {busy ? t.sending : t.submit} <span aria-hidden="true">→</span>
      </button>
      <small className={styles.contactPrivacy}>{t.privacy}</small>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}
