"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, MessageCircle, Send, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { StaticPortrait } from "@/components/static-portrait";
import { EnquiryAttributionChoice } from "@/components/enquiry-attribution-choice";
import type { PublicLocale } from "@/lib/public-locales";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import styles from "./compact-lead-capture.module.css";
import {MandatoryMessengerActions} from "@/components/mandatory-messenger-actions";
import {websiteMessengerOnlyUi} from "@/lib/crm/website-messenger-only.mjs";

type Channel = "whatsapp" | "telegram";
type RequestAction = Channel | "request";

const copy = {
  en: {
    kicker: "PERSONAL REPLY · HOLISTIC HOUSE",
    preference: "Preferred session format",
    contact: "Where can Andrey reply?",
    phoneLabel: "Your phone number", phoneInvalid: "Enter a phone number with country code, e.g. +1 416 555 0123.",
    placeholder: "Email or +1…",
    consent: "I agree to save my contact for one personal reply about this request. No marketing.",
    submit: "Send request without a messenger",
    channelsTitle: "Or continue in a messenger",
    channelsHint: "Optional — your email or phone is enough to register the request.",
    saving: "Saving…",
    notice: "Free to enquire · No confirmed booking or payment · Please don't enter health details.",
    invalid: "Enter a valid email or an international phone number starting with +.",
    consentRequired: "Please agree to a personal reply before continuing.",
    error: "We could not save your request. Try again; no message was sent.",
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
    submit: "Отправить заявку без мессенджера",
    channelsTitle: "Или продолжить в мессенджере",
    channelsHint: "Необязательно — для заявки достаточно email или телефона.",
    saving: "Сохраняем…",
    notice: "Запрос бесплатный · Без подтверждённой записи и оплаты · Не пишите данные о здоровье.",
    invalid: "Укажите email или номер телефона с международным кодом +.",
    consentRequired: "Подтвердите согласие на личный ответ по заявке.",
    error: "Не удалось сохранить заявку. Попробуйте ещё раз; сообщение не отправлено.",
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
    submit: "Enviar solicitud sin mensajería",
    channelsTitle: "O continuar por mensajería",
    channelsHint: "Opcional — basta con correo o teléfono para registrar la solicitud.",
    saving: "Guardando…",
    notice: "Consulta gratuita · Sin reserva ni pago confirmado · No incluyas datos de salud.",
    invalid: "Introduce un correo válido o un teléfono internacional que empiece por +.",
    consentRequired: "Confirma que aceptas recibir una respuesta personal.",
    error: "No pudimos guardar la solicitud. Inténtalo de nuevo; no se envió ningún mensaje.",
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
  phoneOnly = false, contactValue, onContactChange,
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
  const router = useRouter();
  const [localAddress, setLocalAddress] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  // The server renders this form before its client-side event handlers exist.
  useEffect(() => { formRef.current?.setAttribute("data-compact-hydrated", "true"); }, []);
  const address = contactValue ?? localAddress;
  const [internalFormat, setInternalFormat] = useState(formatOptions?.[0]?.value || "");
  const selectedFormat = selectedFormatValue ?? internalFormat;
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<RequestAction | null>(null);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [submittedFormat, setSubmittedFormat] = useState<string | null>(null);
  const [submittedServiceTitle, setSubmittedServiceTitle] = useState<string | null>(null);
  const operationId = useRef<string | null>(null);

  function channelUrl(referenceCode: string, channel: Channel) {
    // Keep the messenger receipt aligned with the format already committed to CRM.
    const receiptFormat = submittedFormat ?? selectedFormat;
    const receiptServiceTitle = submittedServiceTitle ?? serviceTitle;
    // Never put visitor contact, private answers, or health details in the messenger draft.
    const whatsapp = whatsappEnquiryUrl({
      locale,
      service: receiptServiceTitle,
      request: t.message + " " + t.reference + ": " + referenceCode,
      option: formatOptions?.length && receiptFormat ? receiptFormat : undefined,
      pagePath: sourcePath || pathname || "/" + locale + "/services",
    });
    return channel === "whatsapp" ? whatsapp : telegramEnquiryUrlFromWhatsApp(whatsapp);
  }

  async function chooseChannel(channel?: Channel) {
    if (busy || reference) return;
    const contact = parseContact(address);
    if (!contact || (phoneOnly && !contact.phone)) { setError(phoneOnly ? t.phoneInvalid : t.invalid); return; }
    if (!consent) { setError(t.consentRequired); return; }

    // Reserve the new tab within the user's tap: asynchronous window.open is
    // frequently blocked by mobile Safari after the CRM network request.
    let handoffWindow: Window | null = null;
    if (channel) {
      handoffWindow = window.open("about:blank", "_blank");
      if (handoffWindow) handoffWindow.opener = null;
    }
    const requestId = operationId.current || window.crypto.randomUUID();
    operationId.current = requestId;
    setBusy(channel || "request");
    setError("");
    let committedReference = "";

    try {
      const response = await fetch("/api/service-enquiries", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: requestId,
          serviceTitle,
          description: "Preferred reply channel: " + (channel ? (channel === "whatsapp" ? "WhatsApp" : "Telegram") : (contact.email ? "Email" : "Phone (manual)")) +
            (formatOptions?.length && selectedFormat ? "; Preferred session format: " + selectedFormat : ""),
          sourcePath: sourcePath || pathname || "/" + locale + "/services",
          locale,
          contact: { displayName: "", ...contact },
          contactConsent: true,
          website: "",
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true ||
        !/^HH-[A-F0-9]{12}$/.test(result.referenceCode || "")) {
        if (response.status === 409) operationId.current = null;
        throw new Error("ENQUIRY_NOT_SAVED");
      }
      committedReference = result.referenceCode;
      setSubmittedFormat(selectedFormat);
      setSubmittedServiceTitle(serviceTitle);
      setReference(committedReference);
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY,
          JSON.stringify({ referenceCode: committedReference, createdAt: Date.now() }));
        // No-channel saves redirect only after CRM commit; explicit messenger
        // handoffs retain their reserved Safari tab and inline receipt.
        if (!channel) router.push("/" + locale + "/thank-you");
      } catch { /* Receipt storage is optional; the DB commit is already authoritative. */ }
    } catch {
      try { handoffWindow?.close(); } catch { /* Never navigate after a failed DB save. */ }
      setError(t.error);
      return;
    } finally {
      setBusy(null);
    }

    // The independent CRM request is already saved; messenger handoff is optional.
    if (!channel) return;

    // A browser handoff can fail after the DB commit. Keep both fallback links
    // visible under the saved reference; never resubmit or claim the CRM save failed.
    try {
      const destination = channelUrl(committedReference, channel);
      if (handoffWindow && !handoffWindow.closed) {
        handoffWindow.location.replace(destination);
      } else {
        setError(t.handoffError);
      }
    } catch {
      try { handoffWindow?.close(); } catch { /* Saved receipt remains on screen. */ }
      setError(t.handoffError);
    }
  }

  if (websiteMessengerOnlyUi()) return <section id={id}
    className={[styles.section,variant==="inline"?styles.inline:"",variant==="diagnosis"?styles.diagnosis:""].filter(Boolean).join(" ")}
    data-service-lead-capture data-messenger-only-intake
    data-inline-offer-form={variant==="inline"?"":undefined}
    data-compact-last-slide={variant==="inline"?undefined:""} lang={locale} aria-label={title}>
    <div className={styles.intro}><h2>{title}</h2><p>{lead}</p></div>
    {variant!=="diagnosis" && formatOptions?.length ? <label className={styles.field}>
      <span>{formatLabel||t.preference}</span>
      <select data-messenger-offer-format required value={selectedFormat}
        onChange={event=>{setInternalFormat(event.target.value);onFormatChange?.(event.target.value);}}>
        {formatOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>:null}
    <MandatoryMessengerActions locale={locale} label={title} collapsed={variant!=="inline"}
      whatsappUrl={whatsappEnquiryUrl({locale,service:serviceTitle,request:"Please contact me about this service.",
        option:formatOptions?.length&&selectedFormat?selectedFormat:undefined,
        pagePath:sourcePath||pathname||"/"+locale+"/services"})}/>
    {disclaimer?<p className={styles.disclaimer}>{disclaimer}</p>:null}
  </section>;
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
        <form className={styles.form} data-compact-lead-form ref={formRef} onSubmit={event => { event.preventDefault(); void chooseChannel(); }}>
          {variant !== "diagnosis" && formatOptions?.length ? (
            <label className={styles.field}>
              <span>{formatLabel || t.preference}</span>
              <select value={selectedFormat} required disabled={busy !== null}
                onChange={event => { setInternalFormat(event.target.value); onFormatChange?.(event.target.value); operationId.current = null; setError(""); }}>
                {formatOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ) : null}
          <label className={styles.field}>
            <span>{phoneOnly ? t.phoneLabel : t.contact}</span>
            <input type="text" name="contact" inputMode={phoneOnly ? "tel" : "text"} autoComplete={phoneOnly ? "tel" : "off"}
              value={address} maxLength={254} required disabled={busy !== null}
              placeholder={phoneOnly ? "+1 416 555 0123" : t.placeholder} aria-invalid={Boolean(error)}
              onChange={event => { if (onContactChange) onContactChange(event.target.value); else setLocalAddress(event.target.value); operationId.current = null; setError(""); }} />
          </label>
          <label className={styles.consent}>
            <input type="checkbox" required checked={consent} disabled={busy !== null}
              onChange={event => { setConsent(event.target.checked); operationId.current = null; setError(""); }} />
            <span>{t.consent}</span>
          </label>
          <EnquiryAttributionChoice locale={locale} disabled={busy !== null} />
          <button type="submit" className={styles.requestSubmit} data-compact-request-only
            disabled={busy !== null || !consent || !address.trim()}>
            <Send size={18} aria-hidden="true" />{busy === "request" ? t.saving : t.submit}
          </button>
          <div className={styles.channelHeading}>
            <strong>{t.channelsTitle}</strong>
            <span>{t.channelsHint}</span>
          </div>
          <div className={styles.channels} role="group" aria-label={t.channelsTitle}>
            <button className={[styles.channel, styles.whatsapp].join(" ")} type="button"
              disabled={busy !== null} onClick={() => { void chooseChannel("whatsapp"); }}
              data-compact-channel="whatsapp">
              <MessageCircle size={19} aria-hidden="true" />
              <span>{busy === "whatsapp" ? t.saving : "WhatsApp"}</span>
            </button>
            <button className={[styles.channel, styles.telegram].join(" ")} type="button"
              disabled={busy !== null} onClick={() => { void chooseChannel("telegram"); }}
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
