"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { CheckCircle2, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { StaticPortrait } from "@/components/static-portrait";
import type { PublicLocale } from "@/lib/public-locales";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import styles from "./compact-lead-capture.module.css";

type Channel = "whatsapp" | "telegram";
type EnquiryAttempt = { body: string; context: string; channel: Channel; whatsappUrl: string; referenceLabel: string; confirmed: boolean };

const copy = {
  en: {
    kicker: "PERSONAL REPLY · HOLISTIC HOUSE",
    preference: "Preferred session format",
    contact: "Where can Andrey reply?",
    phoneLabel: "Your phone number", phoneInvalid: "Enter a phone number with country code, e.g. +1 416 555 0123.",
    placeholder: "Email or +1…",
    consent: "I agree to save my contact for one personal reply about this request. No marketing.",
    channelsTitle: "Continue with Andrey",
    channelsHint: "Choose a messenger. Your contact is saved first.",
    saving: "Saving…",
    notice: "Free to enquire · No confirmed booking or payment · Please don't enter health details.",
    invalid: "Enter a valid email or an international phone number starting with +.",
    consentRequired: "Please agree to a personal reply before continuing.",
    error: "We could not confirm whether your request was saved. Retry the same request; do not submit a new one yet.",
    contextChanged: "An earlier request is still unconfirmed. Request details changed. Restore the original service, format and contact details to retry it.",
    handoffError: "Your contact was saved, but the messenger did not open. Use either link below.",
    saved: "Request saved — awaiting a personal reply",
    next: "Keep your reference. No reply time or appointment is confirmed yet. Messengers are for scheduling only; agree a secure handoff for any personal materials.",
    reference: "Reference",
    message: "I would like to ask about this service. Please let me know the next step.",
  },
  ru: {
    kicker: "ЛИЧНЫЙ ОТВЕТ · HOLISTIC HOUSE",
    preference: "Предпочитаемый формат",
    contact: "Как с вами связаться?",
    phoneLabel: "Номер телефона", phoneInvalid: "Укажите телефон с кодом страны, например +1 416 555 0123.",
    placeholder: "Email или +1…",
    consent: "Согласен(-на) сохранить контакт для личного ответа по этой заявке. Без рассылок.",
    channelsTitle: "Напишите Андрею",
    channelsHint: "Выберите мессенджер. Сначала контакт сохранится в CRM.",
    saving: "Сохраняем…",
    notice: "Запрос бесплатный · Без подтверждённой записи и оплаты · Не пишите данные о здоровье.",
    invalid: "Укажите email или номер телефона с международным кодом +.",
    consentRequired: "Подтвердите согласие на личный ответ по заявке.",
    error: "Пока не удалось подтвердить сохранение заявки. Повторите ту же заявку; пока не создавайте новую.",
    contextChanged: "Предыдущая заявка ещё не подтверждена. Данные заявки изменились. Верните исходную услугу, формат и контактные данные, чтобы повторить её.",
    handoffError: "Контакт сохранён, но чат не открылся. Выберите мессенджер по ссылке ниже.",
    saved: "Заявка сохранена — ожидает личного ответа",
    next: "Сохраните номер заявки. Срок ответа и время встречи ещё не подтверждены. В мессенджере согласуйте только организационные вопросы; для личных материалов нужна защищённая передача.",
    reference: "Номер заявки",
    message: "Хочу узнать подробнее об этой услуге. Подскажите, пожалуйста, следующий шаг.",
  },
  es: {
    kicker: "RESPUESTA PERSONAL · HOLISTIC HOUSE",
    preference: "Formato de sesión preferido",
    contact: "¿Dónde puede responderte Andrey?",
    phoneLabel: "Número de teléfono", phoneInvalid: "Introduce un número con prefijo de país, p. ej. +1 416 555 0123.",
    placeholder: "Correo o +1…",
    consent: "Acepto guardar mi contacto para una respuesta personal sobre esta solicitud. Sin publicidad.",
    channelsTitle: "Escribe a Andrey",
    channelsHint: "Elige un mensajero. Primero guardamos tu contacto.",
    saving: "Guardando…",
    notice: "Consulta gratuita · Sin reserva ni pago confirmado · No incluyas datos de salud.",
    invalid: "Introduce un correo válido o un teléfono internacional que empiece por +.",
    consentRequired: "Confirma que aceptas recibir una respuesta personal.",
    error: "No pudimos confirmar si se guardó tu solicitud. Reintenta la misma solicitud; no crees otra todavía.",
    contextChanged: "Hay una solicitud anterior sin confirmar. Los datos de la solicitud cambiaron. Restablece el servicio, formato y contacto originales para reintentarla.",
    handoffError: "Tu contacto se guardó, pero no se abrió el chat. Elige uno de los enlaces.",
    saved: "Solicitud guardada — pendiente de respuesta personal",
    next: "Conserva la referencia. Aún no se ha confirmado el plazo de respuesta ni una cita. Usa mensajería solo para coordinar; acuerda una entrega segura para materiales personales.",
    reference: "Referencia",
    message: "Me gustaría recibir información sobre este servicio y el próximo paso.",
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

/** Shared public intake: a server-confirmed CRM write always precedes messenger handoff. */
export function CompactLeadCapture({
  locale, serviceTitle, title, lead, id, disclaimer, sourcePath, variant, formatOptions, formatLabel, selectedFormatValue, onFormatChange,
  phoneOnly = false, contactValue, onContactChange, active = true,
}: {
  locale: PublicLocale;
  serviceTitle: string;
  title: string;
  lead: string;
  id?: string;
  disclaimer?: string;
  /** Public source for a form embedded on /, which is not an allowed enquiry source. */
  sourcePath?: string;
  variant?: "inline" | "diagnosis";
  phoneOnly?: boolean;
  /** Hidden parent sheets suspend side effects without clearing an admitted attempt. */
  active?: boolean;
  contactValue?: string;
  onContactChange?: (value: string) => void;
  formatOptions?: readonly { readonly value: string; readonly label: string; readonly description?: string }[];
  formatLabel?: string;
  /** Optional controlled selection shared with offer cards on multi-offer landings. */
  selectedFormatValue?: string;
  onFormatChange?: (value: string) => void;
}) {
  const t = copy[locale];
  const pathname = usePathname();
  const initialFormat = formatOptions?.[0]?.value || "";
  const [localAddress, setLocalAddress] = useState("");
  const address = contactValue ?? localAddress;
  const [internalFormat, setInternalFormat] = useState(initialFormat);
  const selectedFormat = selectedFormatValue ?? internalFormat;
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<Channel | null>(null);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [lockedChannel, setLockedChannel] = useState<Channel | null>(null);
  const locked = lockedChannel !== null;
  const [savedWhatsapp, setSavedWhatsapp] = useState("");
  const [savedReferenceLabel, setSavedReferenceLabel] = useState("");
  const operation = useRef<EnquiryAttempt | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const handoff = useRef<Window | null>(null);
  const contextKey = JSON.stringify([locale, serviceTitle, sourcePath || pathname,
    formatOptions || null, selectedFormatValue ?? null, phoneOnly, contactValue ?? null, contactValue !== undefined, active]);
  // Offer cards and the dropdown can control both format and service title on
  // one landing. Preserve their entered contact and confirmed receipt while
  // switching offers, but still treat every offer as a distinct write context.
  const scopeKey = JSON.stringify([locale, sourcePath || pathname, formatOptions || null,
    selectedFormatValue === undefined ? serviceTitle : null, selectedFormatValue !== undefined,
    phoneOnly, contactValue !== undefined]);
  const resetScope = useRef<string | null>(null);
  const activeContext = useRef(contextKey);
  const contextRevision = useRef(0);
  // Predict the revision committed by the layout effect, without mutating refs
  // during render. A restored context cannot revive an earlier consent closure.
  const renderRevision = contextRevision.current + (activeContext.current !== contextKey ? 1 : 0);

  const closeHandoff = (popup: Window | null) => {
    try { popup?.close(); } catch { /* A popup failure never changes the save outcome. */ }
    if (handoff.current === popup) handoff.current = null;
  };
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; closeHandoff(handoff.current); };
  }, []);
  useLayoutEffect(() => {
    if (activeContext.current !== contextKey) contextRevision.current += 1;
    activeContext.current = contextKey;
    if (operation.current && !operation.current.confirmed) {
      if (operation.current.context !== contextKey) closeHandoff(handoff.current);
      setError(operation.current.context === contextKey ? t.error : t.contextChanged);
      return;
    }
    if (resetScope.current === scopeKey) return;
    resetScope.current = scopeKey;
    operation.current = null;
    setReference(""); setSavedWhatsapp(""); setSavedReferenceLabel("");
    setLockedChannel(null); setLocalAddress(""); setConsent(false); setError("");
    setInternalFormat(initialFormat);
  }, [contextKey, scopeKey, initialFormat, t.contextChanged, t.error]);

  function currentWhatsappUrl() {
    // Contact and private answers never enter the public messenger draft.
    return whatsappEnquiryUrl({ locale, service: serviceTitle, request: t.message,
      option: formatOptions?.length && selectedFormat ? selectedFormat : undefined,
      pagePath: sourcePath || pathname || "/" + locale + "/services" });
  }
  function channelUrl(referenceCode: string, channel: Channel,
    base = savedWhatsapp || currentWhatsappUrl(), referenceLabel = savedReferenceLabel || t.reference) {
    const draft = new URL(base);
    draft.searchParams.set("text", (draft.searchParams.get("text") || "") + "\n\n" + referenceLabel + ": " + referenceCode);
    return channel === "whatsapp" ? draft.toString() : telegramEnquiryUrlFromWhatsApp(draft.toString());
  }
  function mayEdit() {
    return !inFlight.current && (!operation.current || operation.current.confirmed);
  }

  async function chooseChannel(channel: Channel) {
    // Ref guard is synchronous, including two taps before React re-renders.
    if (!active || contextRevision.current !== renderRevision || inFlight.current || reference || operation.current?.confirmed || !mounted.current || activeContext.current !== contextKey) return;
    let attempt = operation.current;
    if (attempt) {
      if (attempt.context !== activeContext.current || attempt.context !== contextKey) {
        setError(t.contextChanged); return;
      }
      if (channel !== attempt.channel) return;
    } else {
      const contact = parseContact(address);
      if (!contact || (phoneOnly && !contact.phone)) { setError(phoneOnly ? t.phoneInvalid : t.invalid); return; }
      if (!consent) { setError(t.consentRequired); return; }
      const payload = {
        operationId: window.crypto.randomUUID(), serviceTitle,
        description: "Preferred reply channel: " + (channel === "whatsapp" ? "WhatsApp" : "Telegram") +
          (formatOptions?.length && selectedFormat ? "; Preferred session format: " + selectedFormat : ""),
        sourcePath: sourcePath || pathname || "/" + locale + "/services", locale,
        contact: { displayName: "", ...contact }, contactConsent: true, website: "",
      };
      attempt = { body: JSON.stringify(payload), context: contextKey, channel,
        whatsappUrl: currentWhatsappUrl(), referenceLabel: t.reference, confirmed: false };
      operation.current = attempt;
    }
    const submitted = attempt;
    const submittedRevision = contextRevision.current;
    inFlight.current = true;
    setLockedChannel(submitted.channel); setBusy(submitted.channel); setError("");
    let handoffWindow: Window | null = null;
    // Reserve only a blank tab during the user's gesture. A blocked popup must
    // not prevent registration; confirmed fallback links remain available.
    try { handoffWindow = window.open("about:blank", "_blank");
      if (handoffWindow) handoffWindow.opener = null;
    } catch { /* Use confirmed links after the save. */ }
    handoff.current = handoffWindow;
    let committedReference = "";
    const stillCurrent = () => mounted.current && contextRevision.current === submittedRevision
      && activeContext.current === submitted.context
      && operation.current?.body === submitted.body;
    try {
      const response = await fetch("/api/service-enquiries", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: submitted.body,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true || typeof result.referenceCode !== "string" ||
        !/^HH-[A-F0-9]{12}$/.test(result.referenceCode)) throw new Error("ENQUIRY_UNCONFIRMED");
      if (!stillCurrent()) { closeHandoff(handoffWindow); return; }
      committedReference = result.referenceCode;
      operation.current = { ...attempt, confirmed: true };
      setReference(committedReference); setSavedWhatsapp(submitted.whatsappUrl);
      setSavedReferenceLabel(submitted.referenceLabel); setLockedChannel(null);
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY,
          JSON.stringify({ referenceCode: committedReference, createdAt: Date.now() }));
      } catch { /* The confirmed receipt remains on screen without storage. */ }
    } catch {
      closeHandoff(handoffWindow);
      // A transport, parsing or409 error does not prove no write. Preserve the
      // original body/UUID and keep fields frozen, never create a second submitted.
      if (stillCurrent()) setError(t.error);
      return;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(null);
    }
    if (!stillCurrent()) { closeHandoff(handoffWindow); return; }
    try {
      const destination = channelUrl(committedReference, submitted.channel, submitted.whatsappUrl, submitted.referenceLabel);
      if (handoffWindow && !handoffWindow.closed) handoffWindow.location.replace(destination);
      else setError(t.handoffError);
      // Successful handoff is no longer a pending blank tab owned by the form.
      if (handoff.current === handoffWindow) handoff.current = null;
    } catch {
      closeHandoff(handoffWindow); setError(t.handoffError);
    }
  }

  return (
    <section id={id} className={[styles.section, variant === "inline" ? styles.inline : "", variant === "diagnosis" ? styles.diagnosis : ""].filter(Boolean).join(" ")}
      data-compact-last-slide={variant === "inline" ? undefined : ""}
      data-inline-offer-form={variant === "inline" ? "" : undefined}
      data-service-lead-capture lang={locale} aria-label={title}>
      <div className={styles.head}>
        <div className={styles.intro}>
          <p className={styles.kicker}><ShieldCheck size={14} aria-hidden="true" />{t.kicker}</p>
          <h2>{title}</h2>
          <p>{lead}</p>
        </div>
        {variant === "diagnosis" ? null : <StaticPortrait src="/images/holistic-house/andy-about.png" alt="Andrey Litvinov"
          width={160} height={180} className={styles.portrait}
          sizes="(max-width: 600px) 70px, 82px" loading="lazy" />}
      </div>
      {reference ? (
        <div className={styles.confirmation}>
          <div className={styles.receipt} role="status" data-lead-saved>
            <CheckCircle2 size={24} aria-hidden="true" />
            <div>
              <strong>{t.saved}</strong>
              <p>{t.next}</p>
              <small>{t.reference}: {reference}</small>
            </div>
          </div>
          <div className={styles.channels} role="group" aria-label={t.channelsTitle}>
            <a href={channelUrl(reference, "whatsapp")} target="_blank" rel="noopener noreferrer"
              className={[styles.channel, styles.whatsapp].join(" ")} data-compact-channel="whatsapp">
              <MessageCircle size={19} aria-hidden="true" /><span>WhatsApp</span>
            </a>
            <a href={channelUrl(reference, "telegram")} target="_blank" rel="noopener noreferrer"
              className={[styles.channel, styles.telegram].join(" ")} data-compact-channel="telegram">
              <Send size={19} aria-hidden="true" /><span>Telegram</span>
            </a>
          </div>
        </div>
      ) : (
        <form className={styles.form} data-compact-lead-form onSubmit={event => event.preventDefault()}>
          {variant !== "diagnosis" && formatOptions?.length ? (
            <label className={styles.field}>
              <span>{formatLabel || t.preference}</span>
              <select value={selectedFormat} required disabled={locked || busy !== null}
                onChange={event => { if (!mayEdit()) return; setInternalFormat(event.target.value); onFormatChange?.(event.target.value); setError(""); }}>
                {formatOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ) : null}
          <label className={styles.field}>
            <span>{phoneOnly ? t.phoneLabel : t.contact}</span>
            <input type="text" name="contact" inputMode={phoneOnly ? "tel" : "text"} autoComplete={phoneOnly ? "tel" : "off"}
              value={address} maxLength={254} required disabled={locked || busy !== null}
              placeholder={phoneOnly ? "+1 416 555 0123" : t.placeholder} aria-invalid={Boolean(error)}
              onChange={event => { if (!mayEdit()) return; if (onContactChange) onContactChange(event.target.value); else setLocalAddress(event.target.value); setError(""); }} />
          </label>
          <label className={styles.consent}>
            <input type="checkbox" required checked={consent} disabled={locked || busy !== null}
              onChange={event => { if (!mayEdit()) return; setConsent(event.target.checked); setError(""); }} />
            <span>{t.consent}</span>
          </label>
          <div className={styles.channelHeading}>
            <strong>{t.channelsTitle}</strong>
            <span>{t.channelsHint}</span>
          </div>
          <div className={styles.channels} role="group" aria-label={t.channelsTitle}>
            <button className={[styles.channel, styles.whatsapp].join(" ")} type="button"
              disabled={busy !== null || (locked && lockedChannel !== "whatsapp")} onClick={() => { void chooseChannel("whatsapp"); }}
              data-compact-channel="whatsapp">
              <MessageCircle size={19} aria-hidden="true" />
              <span>{busy === "whatsapp" ? t.saving : "WhatsApp"}</span>
            </button>
            <button className={[styles.channel, styles.telegram].join(" ")} type="button"
              disabled={busy !== null || (locked && lockedChannel !== "telegram")} onClick={() => { void chooseChannel("telegram"); }}
              data-compact-channel="telegram">
              <Send size={19} aria-hidden="true" />
              <span>{busy === "telegram" ? t.saving : "Telegram"}</span>
            </button>
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <p className={styles.notice}>{t.notice}</p>
        </form>
      )}
      {reference && error ? <p className={styles.error} role="alert">{error}</p> : null}
      {disclaimer ? <p className={styles.disclaimer}>{disclaimer}</p> : null}
    </section>
  );
}
