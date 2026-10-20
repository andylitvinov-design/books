"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import type { PublicAnalyticsEvent } from "@/lib/public-analytics";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import { readOrganicEventReferral, withOrganicEventReferral } from "@/lib/organic-event-referrals";
import { readPaidAdReferral, withPaidAdReferral } from "@/lib/paid-ad-referrals";
import styles from "./contact-channel-chooser.module.css";

type AcquisitionEvent = (typeof ACQUISITION_EVENTS)[number] | PublicAnalyticsEvent;
type SavedEnquiry = { referenceCode: string; saved: true };

const copy = {
  en: {
    order: "Order",
    question: "Describe what you would like help with",
    description: "Briefly describe your situation or question",
    placeholder: "I would like to explore...",
    name: "Your name", email: "Email", phone: "Phone / WhatsApp",
    contactHelp: "Add an email address, a phone number or both. No account needed.",
    contactError: "Enter your name and a valid email or international phone number.",
    consent: "I agree to be contacted personally about this enquiry only. No marketing subscription.",
    submit: "Register my request",
    sending: "Saving request…",
    saved: "Request received in our CRM",
    next: "Your contact details are saved. If you prefer, you can also start a WhatsApp or Telegram chat using this reference.",
    messengers: "Continue in your preferred messenger",
    error: "We could not save your request. Please try again; no enquiry has been recorded.",
    privateNote: "Please avoid medical records, diagnoses or sensitive personal details in this short enquiry.",
    note: "Only the contact details you submit here are stored securely. They are unverified and used for a personal reply, not advertising. Messenger handoff is optional.",
    situation: "Situation",
    reference: "Enquiry",
    again: "New enquiry",
  },
  ru: {
    order: "Заказать",
    question: "Расскажите, с чем вам нужна помощь",
    description: "Кратко опишите ситуацию или ваш запрос",
    placeholder: "Я хотел(а) бы разобраться в...",
    name: "Ваше имя", email: "Электронная почта", phone: "Телефон / WhatsApp",
    contactHelp: "Укажите почту, телефон или оба контакта. Регистрация аккаунта не нужна.",
    contactError: "Укажите имя и действительный email или телефон в международном формате.",
    consent: "Согласен(на) на личный ответ по этой заявке. На рекламную рассылку не подписываюсь.",
    submit: "Оставить заявку",
    sending: "Сохраняем заявку…",
    saved: "Заявка поступила в CRM",
    next: "Ваш контакт сохранён. При желании можете также написать в WhatsApp или Telegram с номером заявки.",
    messengers: "Продолжить в удобном мессенджере",
    error: "Не удалось сохранить заявку. Попробуйте ещё раз; обращение пока не зарегистрировано.",
    privateNote: "Не указывайте здесь диагнозы, медицинские документы и другие чувствительные сведения.",
    note: "Сохраняем только указанные здесь контакты. Они не подтверждены и используются для ответа, а не для рекламы. Переход в мессенджер необязателен.",
    situation: "Ситуация",
    reference: "Заявка",
    again: "Новый запрос",
  },
  es: {
    order: "Solicitar",
    question: "Cuéntanos en qué podemos ayudarte",
    description: "Describe brevemente tu situación o solicitud",
    placeholder: "Me gustaría hablar sobre...",
    name: "Tu nombre", email: "Correo electrónico", phone: "Teléfono / WhatsApp",
    contactHelp: "Deja tu email, teléfono o ambos. No necesitas crear una cuenta.",
    contactError: "Introduce tu nombre y un correo o teléfono internacional válido.",
    consent: "Acepto que me contacten solamente sobre esta solicitud. No me suscribo a publicidad.",
    submit: "Registrar mi solicitud",
    sending: "Guardando solicitud…",
    saved: "Solicitud recibida en CRM",
    next: "Guardamos tus datos de contacto. También puedes escribir por WhatsApp o Telegram con esta referencia.",
    messengers: "Continuar por mensajería",
    error: "No pudimos guardar tu solicitud. Inténtalo de nuevo; no se ha registrado.",
    privateNote: "Evita incluir diagnósticos, documentos médicos o datos personales sensibles.",
    note: "Solo guardamos los contactos que introduces aquí; no están verificados y se usan para responder, no para publicidad. El chat es opcional.",
    situation: "Situación",
    reference: "Solicitud",
    again: "Nueva solicitud",
  },
} as const;

type Props = {
  locale: PublicLocale;
  whatsappUrl: string;
  className?: string;
  label?: string;
  event?: AcquisitionEvent;
  analyticsEvent?: PublicAnalyticsEvent;
  onChannelClick?: (channel: "whatsapp" | "telegram") => void;
  attributes?: Record<string, string>;
  id?: string;
};

/** Anonymous first-party lead save, followed by an explicit client-initiated messenger handoff. */
export function ContactChannelChooser({
  locale, whatsappUrl, className, label, event = "contact_click", analyticsEvent,
  onChannelClick, attributes, id,
}: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [saved, setSaved] = useState<SavedEnquiry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  const pathname = usePathname();
  const [publicEventSearch, setPublicEventSearch] = useState("");
  const [publicAdSearch, setPublicAdSearch] = useState("");
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const c = copy[locale];

  useEffect(() => {
    const referral = readOrganicEventReferral(window.location.search, window.location.pathname);
    setPublicEventSearch(referral ? "?" + new URLSearchParams({
      utm_source: referral.source,
      utm_medium: "organic_event",
      utm_campaign: referral.campaign,
      ...(referral.content ? { utm_content: referral.content } : {}),
    }).toString() : "");
    const adReferral = readPaidAdReferral(window.location.search, window.location.pathname);
    setPublicAdSearch(adReferral ? "?" + new URLSearchParams({
      utm_source: adReferral.source,
      utm_medium: adReferral.medium ?? "",
      utm_campaign: adReferral.campaign,
      ...(adReferral.content ? { utm_content: adReferral.content } : {}),
    }).toString() : "");
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
    setDescription("");
    setDisplayName("");
    setEmail("");
    setPhone("");
    setConsent(false);
    setWebsite("");
    setSaved(null);
    setError("");
    operationId.current = null;
  }, [whatsappUrl]);

  useEffect(() => {
    if (!open) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [open]);

  const referredWhatsappUrl = withPaidAdReferral(
    withOrganicEventReferral(whatsappUrl, publicEventSearch, pathname, locale),
    publicAdSearch, pathname, locale,
  );
  const originalMessage = new URL(referredWhatsappUrl).searchParams.get("text") || "";
  const serviceTitle = originalMessage.split("\n")
    .find(line => /^(?:Service|Услуга|Servicio):\s*/i.test(line))
    ?.replace(/^[^:]+:\s*/, "").trim() || "Holistic House service";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || saved || description.trim().length < 10) return;
    const cleanedPhone = phone.replace(/[\s().-]/g, "");
    if (displayName.trim().length < 2 || (!email.trim() && !cleanedPhone) ||
      (cleanedPhone && !/^\+[1-9][0-9]{7,14}$/.test(cleanedPhone)) || !consent) {
      setError(c.contactError);
      return;
    }
    const nextId = operationId.current || crypto.randomUUID();
    operationId.current = nextId;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/service-enquiries", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: nextId, serviceTitle, description: description.trim(),
          sourcePath: pathname, locale,
          contact: { displayName: displayName.trim(), email: email.trim(), phone: cleanedPhone },
          contactConsent: consent, website,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.saved !== true || !/^HH-[A-F0-9]{12}$/.test(data.referenceCode || "")) {
        throw new Error(data.error || "NOT_SAVED");
      }
      setSaved({ saved: true, referenceCode: data.referenceCode });
    } catch {
      setError(c.error);
    } finally {
      setBusy(false);
    }
  }

  let preparedWhatsApp = referredWhatsappUrl;
  if (saved) {
    const draftUrl = new URL(referredWhatsappUrl);
    draftUrl.searchParams.set("text",
      originalMessage + "\n\n" + c.situation + ": " + description.trim()
      + "\n" + c.reference + ": " + saved.referenceCode,
    );
    preparedWhatsApp = draftUrl.toString();
  }

  return (
    <div className={styles.wrapper} data-contact-channel-chooser>
      <button id={id} type="button" className={[styles.trigger, className].filter(Boolean).join(" ")}
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}
        data-contact-order>
        <ShoppingBag size={20} aria-hidden="true" />
        <span>{label || c.order}</span>
        <ChevronDown className={styles.chevron} size={21} aria-hidden="true" />
      </button>
      <div ref={panelRef} className={styles.panel} id={panelId} hidden={!open}>
        <p className={styles.question}>{saved ? c.messengers : c.question}</p>
        {!saved ? (
          <form onSubmit={submit} className={styles.enquiryForm}>
            <div className={styles.contactFields}>
              <label>{c.name} *
                <input type="text" autoComplete="name" required minLength={2} maxLength={120}
                  disabled={busy} value={displayName} onChange={event => {
                    setDisplayName(event.target.value); setError(""); operationId.current = null;
                  }} />
              </label>
              <label>{c.email}
                <input type="email" autoComplete="email" maxLength={254} disabled={busy}
                  value={email} onChange={event => {
                    setEmail(event.target.value); setError(""); operationId.current = null;
                  }} />
              </label>
              <div className={styles.phoneField}>
                <label htmlFor={panelId + "-phone"}>{c.phone}</label>
                <PhoneCountryInput id={panelId + "-phone"} locale={locale}
                  disabled={busy} value={phone} onChange={value => {
                    setPhone(value); setError(""); operationId.current = null;
                  }} />
              </div>
            </div>
            <small className={styles.privateNote}>{c.contactHelp}</small>
            <label htmlFor={panelId + "-situation"}>{c.description}</label>
            <textarea id={panelId + "-situation"} required minLength={10} maxLength={1400} rows={3}
              placeholder={c.placeholder} value={description} disabled={busy}
              onChange={event => {
                setDescription(event.target.value); setError(""); operationId.current = null;
              }} />
            <small className={styles.privateNote}>{c.privateNote}</small>
            <label className={styles.consent}>
              <input type="checkbox" required checked={consent} disabled={busy}
                onChange={event => { setConsent(event.target.checked); operationId.current = null; }} />
              <span>{c.consent}</span>
            </label>
            <label className={styles.honeypot} aria-hidden="true">
              Website <input type="text" name="website" autoComplete="off" tabIndex={-1}
                value={website} onChange={event => setWebsite(event.target.value)} />
            </label>
            <button type="submit" className={styles.submit}
              disabled={busy || description.trim().length < 10 || displayName.trim().length < 2 ||
                (!email.trim() && !phone.trim()) || !consent}>
              <Send size={17} aria-hidden="true" />{busy ? c.sending : c.submit}
            </button>
            {error && <p className={styles.error} role="alert">{error}</p>}
          </form>
        ) : (
          <>
            <p className={styles.saved} role="status">{c.saved} · {saved.referenceCode}</p>
            <p className={styles.next}>{c.next}</p>
            <div className={styles.choices} role="group" aria-label={c.messengers}>
              <AcquisitionEventLink prefetch={false} className={styles.whatsapp}
                href={preparedWhatsApp} event={event} analyticsEvent={analyticsEvent}
                onClick={() => onChannelClick?.("whatsapp")}
                target="_blank" rel="noopener noreferrer"
                attributes={{ ...attributes, "data-contact-channel": "whatsapp" }}>
                <MessageCircle size={20} aria-hidden="true" /> WhatsApp
              </AcquisitionEventLink>
              <AcquisitionEventLink prefetch={false} className={styles.telegram}
                href={telegramEnquiryUrlFromWhatsApp(preparedWhatsApp)}
                event={event} analyticsEvent={analyticsEvent}
                onClick={() => onChannelClick?.("telegram")}
                target="_blank" rel="noopener noreferrer"
                attributes={{ ...attributes, "data-contact-channel": "telegram" }}>
                <Send size={20} aria-hidden="true" /> Telegram
              </AcquisitionEventLink>
            </div>
            <button type="button" className={styles.again} onClick={() => {
              setSaved(null); setDescription(""); setDisplayName(""); setEmail("");
              setPhone(""); setConsent(false); setWebsite(""); setError(""); operationId.current = null;
            }}>{c.again}</button>
          </>
        )}
        <small className={styles.note}>{c.note}</small>
      </div>
    </div>
  );
}
