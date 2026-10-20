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
import { createPublicEnquirySubmissionScope } from "@/lib/practitioners/public-enquiry-submission";
import styles from "./contact-channel-chooser.module.css";

type AcquisitionEvent = (typeof ACQUISITION_EVENTS)[number] | PublicAnalyticsEvent;
type SavedEnquiry = { referenceCode: string; saved: true };

const copy = {
  en: {
    order: "Request to join",
    question: "Leave your contact to enquire or join",
    description: "Add a short note (optional)",
    placeholder: "Any practical questions? You can leave this blank.",
    name: "Your name", email: "Email", phone: "Phone / WhatsApp",
    contactHelp: "Add an email address, a phone number or both. No account needed.",
    contactError: "Enter your name and a valid email or international phone number.",
    consent: "I agree to be contacted personally about this enquiry only. No marketing subscription.",
    submit: "Register my request",
    sending: "Saving request…",
    saved: "Thank you — your request was received",
    next: "Andrey can contact you using the details provided. A date or place is confirmed separately. WhatsApp or Telegram is optional.",
    messengers: "Continue in your preferred messenger",
    error: "The request was not accepted. Check your details and try again.",
    unknown: "We could not confirm whether your request was saved. Keep this page open and retry the same request. Your details are kept unchanged to avoid duplicates.",
    retry: "Retry this same request",
    privateNote: "Please avoid medical records, diagnoses or sensitive personal details in this short enquiry.",
    note: "Only the contact details you submit here are stored securely. They are unverified and used for a personal reply, not advertising. Messenger handoff is optional.",
    situation: "Situation",
    reference: "Enquiry",
    again: "New enquiry",
  },
  ru: {
    order: "Оставить заявку",
    question: "Оставьте контакт, чтобы записаться или узнать подробности",
    description: "Добавить комментарий (необязательно)",
    placeholder: "Дополнительные вопросы? Можно оставить пустым.",
    name: "Ваше имя", email: "Электронная почта", phone: "Телефон / WhatsApp",
    contactHelp: "Укажите почту, телефон или оба контакта. Регистрация аккаунта не нужна.",
    contactError: "Укажите имя и действительный email или телефон в международном формате.",
    consent: "Согласен(на) на личный ответ по этой заявке. На рекламную рассылку не подписываюсь.",
    submit: "Оставить заявку",
    sending: "Сохраняем заявку…",
    saved: "Спасибо! Ваша заявка получена",
    next: "Андрей сможет связаться с вами по указанным контактам. Место и время подтверждаются отдельно. WhatsApp и Telegram — по желанию.",
    messengers: "Продолжить в удобном мессенджере",
    error: "Заявка не принята. Проверьте данные и попробуйте ещё раз.",
    unknown: "Не удалось подтвердить сохранение заявки. Не закрывайте страницу и повторите ту же заявку. Данные временно нельзя менять, чтобы не создать дубль.",
    retry: "Повторить ту же заявку",
    privateNote: "Не указывайте здесь диагнозы, медицинские документы и другие чувствительные сведения.",
    note: "Сохраняем только указанные здесь контакты. Они не подтверждены и используются для ответа, а не для рекламы. Переход в мессенджер необязателен.",
    situation: "Ситуация",
    reference: "Заявка",
    again: "Новый запрос",
  },
  es: {
    order: "Solicitar plaza",
    question: "Deja tus datos para consultar o inscribirte",
    description: "Añadir una nota (opcional)",
    placeholder: "¿Alguna pregunta práctica? Puedes dejarlo en blanco.",
    name: "Tu nombre", email: "Correo electrónico", phone: "Teléfono / WhatsApp",
    contactHelp: "Deja tu email, teléfono o ambos. No necesitas crear una cuenta.",
    contactError: "Introduce tu nombre y un correo o teléfono internacional válido.",
    consent: "Acepto que me contacten solamente sobre esta solicitud. No me suscribo a publicidad.",
    submit: "Registrar mi solicitud",
    sending: "Guardando solicitud…",
    saved: "¡Gracias! Hemos recibido tu solicitud",
    next: "Andrey puede responder usando tus datos. Fecha y plaza se confirman por separado. WhatsApp y Telegram son opcionales.",
    messengers: "Continuar por mensajería",
    error: "La solicitud no fue aceptada. Revisa los datos e inténtalo de nuevo.",
    unknown: "No pudimos confirmar si se guardó la solicitud. Mantén esta página abierta y reintenta la misma solicitud. Conservamos los datos sin cambios para evitar duplicados.",
    retry: "Reintentar la misma solicitud",
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
export function ContactChannelChooser(props: Props) {
  const pathname = usePathname();
  // Remount before painting a new route/service: no previous contact, consent or
  // late response may be rendered in a different enquiry form.
  return <ContactChannelChooserForm key={JSON.stringify([pathname, props.whatsappUrl, props.locale])}
    {...props} pathname={pathname} />;
}

function ContactChannelChooserForm({
  locale, whatsappUrl, className, label, event = "contact_click", analyticsEvent,
  onChannelClick, attributes, id, pathname,
}: Props & { pathname: string }) {
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
  const [uncertain, setUncertain] = useState(false);
  const submission = useRef<ReturnType<typeof createPublicEnquirySubmissionScope> | null>(null);
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
    const scope = createPublicEnquirySubmissionScope();
    submission.current = scope;
    return () => {
      scope.close();
      if (submission.current === scope) submission.current = null;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // On iPhone, the form shrinks after save and the messenger actions can fall
    // under the fixed bottom navigation. Reposition the saved actions, not just
    // the first form opening. The visitor still decides whether to open a chat.
    const target = saved
      ? panelRef.current?.querySelector('[data-contact-channel="whatsapp"]')
      : panelRef.current;
    target?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [open, saved]);

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
    if (busy || saved) return;
    const cleanedPhone = phone.replace(/[\s().-]/g, "");
    if (displayName.trim().length < 2 || (!email.trim() && !cleanedPhone) ||
      (cleanedPhone && !/^\+[1-9][0-9]{7,14}$/.test(cleanedPhone)) || !consent) {
      setError(c.contactError);
      return;
    }
    const scope = submission.current;
    if (!scope) return;
    setBusy(true);
    setError("");
    const result = await scope.submit({
      serviceTitle, description: description.trim(), sourcePath: pathname, locale,
      contact: { displayName: displayName.trim(), email: email.trim(), phone: cleanedPhone },
      contactConsent: consent, website,
    });
    if (submission.current !== scope || result.kind === "stale" || result.kind === "busy") return;
    setBusy(false);
    if (result.kind === "saved") {
      setUncertain(false);
      setSaved({ saved: true, referenceCode: result.referenceCode });
    } else if (result.kind === "rejected") {
      setUncertain(false);
      setError(c.error);
    } else {
      setUncertain(true);
      setError(c.unknown);
    }
  }

  let preparedWhatsApp = referredWhatsappUrl;
  if (saved) {
    const draftUrl = new URL(referredWhatsappUrl);
    draftUrl.searchParams.set("text",
      originalMessage + "\n\n" + c.reference + ": " + saved.referenceCode,
    );
    preparedWhatsApp = draftUrl.toString();
  }

  return (
    <div className={styles.wrapper} data-contact-channel-chooser data-open={open}>
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
          <form onSubmit={submit} className={styles.enquiryForm} aria-busy={busy}
            aria-describedby={error ? panelId + "-error" : undefined}>
            <div className={styles.contactFields}>
              <label>{c.name} *
                <input type="text" autoComplete="name" required minLength={2} maxLength={120}
                  disabled={busy || uncertain} value={displayName} onChange={event => {
                    setDisplayName(event.target.value); setError("");
                  }} />
              </label>
              <label>{c.email}
                <input type="email" autoComplete="email" maxLength={254} disabled={busy || uncertain}
                  value={email} onChange={event => {
                    setEmail(event.target.value); setError("");
                  }} />
              </label>
              <div className={styles.phoneField}>
                <label htmlFor={panelId + "-phone"}>{c.phone}</label>
                <PhoneCountryInput id={panelId + "-phone"} locale={locale}
                  disabled={busy || uncertain} value={phone} onChange={value => {
                    setPhone(value); setError("");
                  }} />
              </div>
            </div>
            <small className={styles.privateNote}>{c.contactHelp}</small>
            <details className={styles.optionalNote}>
              <summary>{c.description}</summary>
              <textarea id={panelId + "-situation"} aria-label={c.description}
                maxLength={1400} rows={2}
                placeholder={c.placeholder} value={description} disabled={busy || uncertain}
                onChange={event => {
                  setDescription(event.target.value); setError("");
                }} />
              <small className={styles.privateNote}>{c.privateNote}</small>
            </details>
            <label className={styles.consent}>
              <input type="checkbox" required checked={consent} disabled={busy || uncertain}
                onChange={event => { setConsent(event.target.checked); }} />
              <span>{c.consent}</span>
            </label>
            <label className={styles.honeypot} aria-hidden="true">
              Website <input type="text" name="website" autoComplete="off" tabIndex={-1}
                disabled={busy || uncertain} value={website} onChange={event => setWebsite(event.target.value)} />
            </label>
            <button type="submit" className={styles.submit}
              disabled={busy || displayName.trim().length < 2 ||
                (!email.trim() && !phone.trim()) || !consent}>
              <Send size={17} aria-hidden="true" />{busy ? c.sending : uncertain ? c.retry : c.submit}
            </button>
            {error && <p id={panelId + "-error"} className={styles.error} role="alert">{error}</p>}
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
              setPhone(""); setConsent(false); setWebsite(""); setError("");
              setUncertain(false); submission.current?.reset();
            }}>{c.again}</button>
          </>
        )}
        <small className={styles.note}>{c.note}</small>
      </div>
    </div>
  );
}

