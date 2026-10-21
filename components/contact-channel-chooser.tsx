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
    contactHelp: "Choose one way to receive a personal reply. No account needed.",
    contactError: "Enter a valid email or international phone number.",
    google: "Continue with Google", googleBusy: "Connecting Google…",
    googleReady: "Google details added. Please confirm your request.",
    googleError: "Google sign-in is unavailable. You can leave a contact without an account.",
    divider: "or without an account", replyVia: "How should Andrey reply?",
    nameOptional: "Add your name (optional)", privacy: "How we use your details",
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
    contactHelp: "Выберите один удобный способ для личного ответа. Аккаунт не нужен.",
    contactError: "Введите правильный email или телефон с международным кодом.",
    google: "Продолжить с Google", googleBusy: "Подключаем Google…",
    googleReady: "Контакт Google добавлен. Подтвердите отправку заявки.",
    googleError: "Вход через Google недоступен. Можно оставить контакт без аккаунта.",
    divider: "или без аккаунта", replyVia: "Как вам ответить?",
    nameOptional: "Добавить имя (необязательно)", privacy: "Как используются ваши данные",
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
    contactHelp: "Elige un medio para recibir una respuesta personal. No necesitas cuenta.",
    contactError: "Introduce un correo válido o teléfono con prefijo internacional.",
    google: "Continuar con Google", googleBusy: "Conectando Google…",
    googleReady: "Datos de Google añadidos. Confirma tu solicitud.",
    googleError: "Google no está disponible. Puedes dejar tu contacto sin cuenta.",
    divider: "o sin crear una cuenta", replyVia: "¿Cómo prefieres recibir la respuesta?",
    nameOptional: "Añadir tu nombre (opcional)", privacy: "Cómo usamos tus datos",
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
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
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

  // A same-tab OAuth return uses only non-sensitive, public service identity in
  // sessionStorage; never save entered contacts, private notes or tokens there.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("hh_enquiry") !== "google") return;
    let pending: { path?: string; service?: string; panel?: string } | null = null;
    try {
      pending = JSON.parse(window.sessionStorage.getItem("hh-google-enquiry-return") || "null");
    } catch { /* A blocked or malformed temporary marker never creates a lead. */ }
    if (pending?.path !== pathname || pending.service !== serviceTitle || pending.panel !== panelId) return;
    window.sessionStorage.removeItem("hh-google-enquiry-return");
    url.searchParams.delete("hh_enquiry");
    const authError = url.searchParams.has("auth");
    url.searchParams.delete("auth");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    setOpen(true);
    if (authError) { setError(c.googleError); return; }
    let active = true;
    fetch("/api/app/auth/contact-profile", { method: "GET", credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("NOT_SIGNED_IN")))
      .then(profile => {
        if (!active || submission.current?.pending) return;
        const nextEmail = typeof profile.email === "string" ? profile.email.trim() : "";
        const nextName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error("NO_EMAIL");
        setEmail(nextEmail);
        if (nextName.length >= 2 && nextName.length <= 120) setDisplayName(nextName);
        setMethod("email");
        setGoogleReady(true);
        setError("");
      }).catch(() => { if (active && !submission.current?.pending) setError(c.googleError); });
    return () => { active = false; };
  }, [pathname, serviceTitle, panelId, c.googleError]);

  async function startGoogle() {
    const scope = submission.current;
    if (!scope || scope.pending || googleBusy || busy || uncertain || saved) return;
    setGoogleBusy(true);
    setError("");
    try {
      const response = await fetch("/api/app/auth/start", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, continueTo: "enquiry", returnPath: pathname }),
      });
      const data = await response.json().catch(() => ({}));
      if (submission.current !== scope) return;
      if (scope.pending) { setGoogleBusy(false); return; }
      if (!response.ok || typeof data.redirectUrl !== "string" ||
          new URL(data.redirectUrl).protocol !== "https:") throw new Error("GOOGLE_UNAVAILABLE");
      window.sessionStorage.setItem("hh-google-enquiry-return",
        JSON.stringify({ path: pathname, service: serviceTitle, panel: panelId }));
      window.location.assign(data.redirectUrl);
    } catch {
      if (submission.current !== scope) return;
      if (scope.pending) { setGoogleBusy(false); return; }
      window.sessionStorage.removeItem("hh-google-enquiry-return");
      setGoogleBusy(false);
      setError(c.googleError);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || googleBusy || saved) return;
    const cleanedPhone = phone.replace(/[\s().-]/g, "");
    if ((displayName.trim() && displayName.trim().length < 2) ||
      displayName.trim().length > 120 || /[\u0000-\u001f\u007f]/.test(displayName.trim()) ||
      (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ||
      (method === "phone" && ! /^\+[1-9][0-9]{7,14}$/.test(cleanedPhone)) || !consent) {
      setError(c.contactError);
      return;
    }
    const scope = submission.current;
    if (!scope) return;
    setBusy(true);
    setError("");
    const result = await scope.submit({
      serviceTitle, description: description.trim(), sourcePath: pathname, locale,
      contact: { displayName: displayName.trim(), email: method === "email" ? email.trim() : "", phone: method === "phone" ? cleanedPhone : "" },
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
          <form onSubmit={submit} className={styles.enquiryForm} aria-busy={busy || googleBusy}
            aria-describedby={error ? panelId + "-error" : undefined}>
            <button type="button" className={styles.googleButton} onClick={startGoogle}
              disabled={busy || googleBusy || uncertain} aria-label={c.google}>
              <span className={styles.googleMark} aria-hidden="true">G</span>
              {googleBusy ? c.googleBusy : c.google}
            </button>
            {googleReady && <p className={styles.googleReady} role="status">{c.googleReady}</p>}
            <p className={styles.separator}><span>{c.divider}</span></p>
            <div className={styles.methodChoices} role="group" aria-label={c.replyVia}>
              <button type="button" aria-pressed={method === "email"} disabled={busy || googleBusy || uncertain}
                onClick={() => { setMethod("email"); setError(""); }}>
                {c.email}
              </button>
              <button type="button" aria-pressed={method === "phone"} disabled={busy || googleBusy || uncertain}
                onClick={() => { setMethod("phone"); setError(""); }}>
                {c.phone}
              </button>
            </div>
            <div className={styles.contactFields}>
              {method === "email" ? (
                <label>{c.email}
                  <input type="email" autoComplete="email" maxLength={254} required disabled={busy || googleBusy || uncertain}
                    value={email} onChange={event => {
                      setEmail(event.target.value); setError("");
                    }} />
                </label>
              ) : (
                <div className={styles.phoneField}>
                  <label htmlFor={panelId + "-phone"}>{c.phone}</label>
                  <PhoneCountryInput id={panelId + "-phone"} locale={locale} required
                    disabled={busy || googleBusy || uncertain} value={phone} onChange={value => {
                      setPhone(value); setError("");
                    }} />
                </div>
              )}
            </div>
            <details className={styles.optionalName}>
              <summary>{c.nameOptional}</summary>
              <label>{c.name}
                <input type="text" autoComplete="name" minLength={2} maxLength={120}
                  disabled={busy || googleBusy || uncertain} value={displayName} onChange={event => {
                    setDisplayName(event.target.value); setError("");
                  }} />
              </label>
            </details>
            <small className={styles.privateNote}>{c.contactHelp}</small>
            <details className={styles.optionalNote}>
              <summary>{c.description}</summary>
              <textarea id={panelId + "-situation"} aria-label={c.description}
                maxLength={1400} rows={2}
                placeholder={c.placeholder} value={description} disabled={busy || googleBusy || uncertain}
                onChange={event => {
                  setDescription(event.target.value); setError("");
                }} />
              <small className={styles.privateNote}>{c.privateNote}</small>
            </details>
            <label className={styles.consent}>
              <input type="checkbox" required checked={consent} disabled={busy || googleBusy || uncertain}
                onChange={event => { setConsent(event.target.checked); }} />
              <span>{c.consent}</span>
            </label>
            <label className={styles.honeypot} aria-hidden="true">
              Website <input type="text" name="website" autoComplete="off" tabIndex={-1}
                disabled={busy || googleBusy || uncertain} value={website} onChange={event => setWebsite(event.target.value)} />
            </label>
            <button type="submit" className={styles.submit}
              disabled={busy || googleBusy ||
                (method === "email" ? !email.trim() : !phone.trim()) || !consent}>
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
              setMethod("email"); setGoogleReady(false);
              setPhone(""); setConsent(false); setWebsite(""); setError("");
              setUncertain(false); submission.current?.reset();
            }}>{c.again}</button>
          </>
        )}
        <details className={styles.privacy}>
          <summary>{c.privacy}</summary>
          <small className={styles.note}>{c.note}</small>
        </details>
      </div>
    </div>
  );
}

