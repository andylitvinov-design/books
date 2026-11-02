"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import styles from "./services-conversion-hero.module.css";

type MeetingMode = "online" | "toronto";

const copy = {
  en: {
    eyebrow: "QUICK SESSION ENQUIRY",
    title: "Let's find a time",
    lead: "Leave a contact for a personal reply about this service.",
    name: "Your name (optional)",
    contact: "Email or international phone",
    placeholder: "you@example.com or +1437…",
    consent: "I agree to store my contact for a reply to this request only. No marketing subscription.",
    submit: "Send my request",
    sending: "Saving request…",
    close: "Back to services",
    note: "An enquiry is not a confirmed booking or payment. Please don't enter personal health details.",
    invalid: "Enter a valid email or an international phone starting with +.",
    error: "Your request was not confirmed. Please try again, or contact Andrey directly.",
    success: "Request received",
    successNote: "We will contact you about availability. No session is booked or charged yet.",
    reference: "Reference",
    back: "View service options",
    contactDirect: "Contact Andrey on Telegram",
    modeOnline: "Preferred format: online.",
    modeToronto: "Preferred format: Toronto, in person.",
  },
  ru: {
    eyebrow: "БЫСТРАЯ ЗАЯВКА НА СЕССИЮ",
    title: "Подберём удобное время",
    lead: "Оставьте контакт — Андрей ответит по выбранной услуге.",
    name: "Имя (необязательно)",
    contact: "Email или телефон с кодом страны",
    placeholder: "email или +1 437…",
    consent: "Согласен(-на) сохранить контакт только для ответа на эту заявку, без рекламной подписки.",
    submit: "Отправить заявку",
    sending: "Сохраняем заявку…",
    close: "Вернуться к услугам",
    note: "Заявка не подтверждает запись или оплату. Не указывайте сведения о здоровье.",
    invalid: "Укажите email или телефон в международном формате с +.",
    error: "Заявка не подтверждена. Повторите попытку или напишите Андрею.",
    success: "Заявка получена",
    successNote: "Андрей свяжется с вами для согласования времени. Пока ничего не забронировано и не оплачено.",
    reference: "Номер",
    back: "Посмотреть услуги",
    contactDirect: "Написать Андрею в Telegram",
    modeOnline: "Предпочтительный формат: онлайн.",
    modeToronto: "Предпочтительный формат: лично в Торонто.",
  },
  es: {
    eyebrow: "SOLICITUD RÁPIDA",
    title: "Busquemos un horario",
    lead: "Deja un contacto y Andrey responderá sobre este servicio.",
    name: "Nombre (opcional)",
    contact: "Correo o teléfono internacional",
    placeholder: "correo o +1 437…",
    consent: "Acepto guardar mi contacto solo para responder a esta solicitud, sin publicidad.",
    submit: "Enviar solicitud",
    sending: "Guardando…",
    close: "Volver a servicios",
    note: "No se confirma ninguna reserva ni pago. No incluyas datos de salud.",
    invalid: "Indica un correo válido o teléfono internacional con +.",
    error: "No se confirmó la solicitud. Inténtalo de nuevo o escribe a Andrey.",
    success: "Solicitud recibida",
    successNote: "Andrey confirmará la disponibilidad. Todavía no hay reserva ni cobro.",
    reference: "Referencia",
    back: "Ver servicios",
    contactDirect: "Contactar por Telegram",
    modeOnline: "Modalidad preferida: en línea.",
    modeToronto: "Modalidad preferida: Toronto presencial.",
  },
} as const;

function parseContact(raw: string): { email: string; phone: string } | null {
  const value = raw.trim();
  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
      ? { email: value, phone: "" } : null;
  }
  const phone = value.replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(phone) ? { email: "", phone } : null;
}

/** Same public enquiry + encrypted CRM transaction used by existing course/service registration. */
export function ServicesHeroQuickRequest({
  locale, service, mode, onClose,
}: { locale: PublicLocale; service: string; mode: MeetingMode; onClose: () => void }) {
  const t = copy[locale];
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const operationId = useRef<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || reference || !consent) return;
    const contact = parseContact(address);
    if (!contact) { setError(t.invalid); return; }
    setError("");
    setSending(true);
    try {
      operationId.current ||= window.crypto.randomUUID();
      const response = await fetch("/api/service-enquiries", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: operationId.current,
          serviceTitle: service,
          description: mode === "toronto" ? t.modeToronto : t.modeOnline,
          sourcePath: "/" + locale + "/services",
          locale,
          contact: { displayName: name.trim(), ...contact },
          contactConsent: true,
          website: "",
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true || !/^HH-[A-F0-9]{12}$/.test(result.referenceCode || "")) {
        if (response.status === 409) operationId.current = null;
        throw new Error("ENQUIRY_NOT_SAVED");
      }
      setReference(result.referenceCode);
      // Receipt is presentation-only. The API's committed DB record is authoritative.
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY,
          JSON.stringify({ referenceCode: result.referenceCode, createdAt: Date.now() }));
      } catch { /* A blocked sessionStorage must not undo a server-confirmed enquiry. */ }
    } catch {
      setError(t.error);
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={panelRef} tabIndex={-1} className={styles.requestPanel} data-services-quick-request role="group" aria-label={t.eyebrow}>
      <button type="button" className={styles.requestClose} onClick={onClose} aria-label={t.close}>
        <X size={20} aria-hidden="true" />
      </button>
      {reference ? (
        <div className={styles.requestReceipt} role="status">
          <CheckCircle2 size={27} aria-hidden="true" />
          <h2>{t.success}</h2>
          <p>{t.successNote}</p>
          <small>{t.reference}: <strong>{reference}</strong></small>
          <button type="button" className={styles.requestBack} onClick={onClose}>{t.back}<ArrowRight size={16} aria-hidden="true" /></button>
        </div>
      ) : (
        <form onSubmit={(event) => { void submit(event); }} data-services-request-form>
          <p className={styles.requestLabel}>{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className={styles.requestLead}>{t.lead}</p>
          <p className={styles.requestSelected}>{service} · {mode === "toronto" ? t.modeToronto : t.modeOnline}</p>
          <div className={styles.requestFields}>
            <label>{t.name}
              <input type="text" autoComplete="name" maxLength={120} value={name}
                onChange={event => { setName(event.target.value); operationId.current = null; setError(""); }} />
            </label>
            <label>{t.contact}
              <input type="text" required maxLength={254} autoComplete="off" value={address}
                placeholder={t.placeholder} onChange={event => { setAddress(event.target.value); operationId.current = null; setError(""); }} />
            </label>
          </div>
          <label className={styles.requestConsent}>
            <input type="checkbox" checked={consent} required onChange={event => { setConsent(event.target.checked); operationId.current = null; setError(""); }} />
            <span>{t.consent}</span>
          </label>
          <button type="submit" disabled={!consent || sending} className={styles.requestSubmit}>
            {sending ? t.sending : t.submit}<ArrowRight size={17} aria-hidden="true" />
          </button>
          <p className={styles.requestFineprint}>{t.note}</p>
          {error ? <p className={styles.requestError} role="alert">{error} <Link href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.contactDirect}</Link></p> : null}
        </form>
      )}
    </div>
  );
}
