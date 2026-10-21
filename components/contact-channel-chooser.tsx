"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import type { PublicAnalyticsEvent } from "@/lib/public-analytics";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import { readOrganicEventReferral, withOrganicEventReferral } from "@/lib/organic-event-referrals";
import { readPaidAdReferral, withPaidAdReferral } from "@/lib/paid-ad-referrals";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
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
    error: "We could not save your request. Please try again; no enquiry has been recorded.",
    privateNote: "Please avoid medical records, diagnoses or sensitive personal details in this short enquiry.",
    note: "Only the contact details you submit here are stored securely. They are unverified and used for a personal reply, not advertising. Messenger handoff is optional.",
    situation: "Situation",
    reference: "Enquiry",
    again: "New enquiry",
    quickSubmit: "Send free request", quickReady: "Google email is ready",
    quickPhone: "Use phone / WhatsApp instead", quickEmail: "Use email instead",
    quickConsent: "By tapping Send, you agree to one personal reply about this request. No marketing, charge or confirmed booking.",
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
    error: "Не удалось сохранить заявку. Попробуйте ещё раз; обращение пока не зарегистрировано.",
    privateNote: "Не указывайте здесь диагнозы, медицинские документы и другие чувствительные сведения.",
    note: "Сохраняем только указанные здесь контакты. Они не подтверждены и используются для ответа, а не для рекламы. Переход в мессенджер необязателен.",
    situation: "Ситуация",
    reference: "Заявка",
    again: "Новый запрос",
    quickSubmit: "Отправить бесплатный запрос", quickReady: "Email Google готов",
    quickPhone: "Вместо email — телефон / WhatsApp", quickEmail: "Использовать email",
    quickConsent: "Нажимая «Отправить», вы соглашаетесь на один личный ответ по запросу. Без рекламы, оплаты и автоматической записи.",
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
    error: "No pudimos guardar tu solicitud. Inténtalo de nuevo; no se ha registrado.",
    privateNote: "Evita incluir diagnósticos, documentos médicos o datos personales sensibles.",
    note: "Solo guardamos los contactos que introduces aquí; no están verificados y se usan para responder, no para publicidad. El chat es opcional.",
    situation: "Situación",
    reference: "Solicitud",
    again: "Nueva solicitud",
    quickSubmit: "Enviar solicitud gratis", quickReady: "Correo de Google listo",
    quickPhone: "Usar teléfono / WhatsApp", quickEmail: "Usar correo electrónico",
    quickConsent: "Al pulsar Enviar, aceptas una respuesta personal a esta solicitud. Sin publicidad, cobro ni reserva confirmada.",
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
  quick?: boolean;
  resetKey?: string;
  publicTopic?: string;
};

/** Anonymous first-party lead save, followed by an explicit client-initiated messenger handoff. */
export function ContactChannelChooser({
  locale, whatsappUrl, className, label, event = "contact_click", analyticsEvent,
  onChannelClick, attributes, id, quick = false, resetKey, publicTopic,
}: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(quick);
  const [website, setWebsite] = useState("");
  const [saved, setSaved] = useState<SavedEnquiry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const [publicEventSearch, setPublicEventSearch] = useState("");
  const [publicAdSearch, setPublicAdSearch] = useState("");
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const c = copy[locale];
  const enquiryResetKey = resetKey || whatsappUrl;

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
    setMethod("email");
    setGoogleReady(false);
    setEmail("");
    setPhone("");
    setConsent(quick);
    setWebsite("");
    setSaved(null);
    setError("");
    operationId.current = null;
  }, [enquiryResetKey, quick]);

  useEffect(() => {
    if (!open && !(quick && saved)) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // On iPhone, the form shrinks after save and the messenger actions can fall
    // under the fixed bottom navigation. Reposition the saved actions, not just
    // the first form opening. The visitor still decides whether to open a chat.
    const target = saved
      ? panelRef.current?.querySelector('[data-contact-channel="whatsapp"]')
      : panelRef.current;
    target?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [open, saved, quick]);

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
        if (!active) return;
        const nextEmail = typeof profile.email === "string" ? profile.email.trim() : "";
        const nextName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error("NO_EMAIL");
        setEmail(nextEmail);
        if (nextName.length >= 2 && nextName.length <= 120) setDisplayName(nextName);
        setMethod("email");
        setGoogleReady(true);
        setError("");
      }).catch(() => { if (active) setError(c.googleError); });
    return () => { active = false; };
  }, [pathname, serviceTitle, panelId, c.googleError]);

  // Prefill from a verified account without silently creating a lead.
  // Consent is the explicit Submit tap after the reply-only disclosure.
  useEffect(() => {
    if (!quick) return;
    let active = true;
    fetch("/api/app/auth/contact-profile", { method: "GET", credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(profile => {
        if (!active || !profile) return;
        const nextEmail = typeof profile.email === "string" ? profile.email.trim() : "";
        const nextName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return;
        setEmail(current => current || nextEmail);
        if (nextName.length >= 2 && nextName.length <= 120) setDisplayName(current => current || nextName);
        setGoogleReady(true);
      }).catch(() => { /* A guest can submit a request without Google. */ });
    return () => { active = false; };
  }, [quick]);

  async function startGoogle() {
    if (googleBusy || busy) return;
    setGoogleBusy(true);
    setError("");
    try {
      const response = await fetch("/api/app/auth/start", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, continueTo: "enquiry", returnPath: pathname }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || typeof data.redirectUrl !== "string" ||
          new URL(data.redirectUrl).protocol !== "https:") throw new Error("GOOGLE_UNAVAILABLE");
      window.sessionStorage.setItem("hh-google-enquiry-return",
        JSON.stringify({ path: pathname, service: serviceTitle, panel: panelId }));
      window.location.assign(data.redirectUrl);
    } catch {
      window.sessionStorage.removeItem("hh-google-enquiry-return");
      setGoogleBusy(false);
      setError(c.googleError);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || saved) return;
    const cleanedPhone = phone.replace(/[\s().-]/g, "");
    if ((method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ||
      (method === "phone" && ! /^\+[1-9][0-9]{7,14}$/.test(cleanedPhone)) || !consent) {
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
          operationId: nextId, serviceTitle,
          description: description.trim() || (quick ? publicTopic?.trim() || "" : ""),
          sourcePath: pathname, locale,
          contact: { displayName: displayName.trim(), email: method === "email" ? email.trim() : "", phone: method === "phone" ? cleanedPhone : "" },
          contactConsent: consent, website,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.saved !== true || !/^HH-[A-F0-9]{12}$/.test(data.referenceCode || "")) {
        throw new Error(data.error || "NOT_SAVED");
      }
      setSaved({ saved: true, referenceCode: data.referenceCode });
      // Only a confirmed server/CRM write creates a receipt. No personal data
      // or sensitive answers are placed in browser storage or the URL.
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY, JSON.stringify({
          referenceCode: data.referenceCode, createdAt: Date.now(),
        }));
        router.push("/" + locale + "/thank-you");
      } catch {
        // Private browsing may block sessionStorage. The existing in-place
        // confirmation and optional messenger handoff remain available.
      }
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
      originalMessage + "\n\n" + c.reference + ": " + saved.referenceCode,
    );
    preparedWhatsApp = draftUrl.toString();
  }

  return (
    <div className={styles.wrapper} data-contact-channel-chooser data-open={open || quick} data-quick={quick}>
      {!quick && <button id={id} type="button" className={[styles.trigger, className].filter(Boolean).join(" ")}
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}
        data-contact-order>
        <ShoppingBag size={20} aria-hidden="true" />
        <span>{label || c.order}</span>
        <ChevronDown className={styles.chevron} size={21} aria-hidden="true" />
      </button>}
      <div ref={panelRef} className={[styles.panel, quick ? styles.quickPanel : ""].join(" ")} id={panelId} hidden={!open && !quick}>
        {(!quick || saved) && <p className={styles.question}>{saved ? c.messengers : c.question}</p>}
        {!saved ? (
          <form onSubmit={submit} className={styles.enquiryForm}>
            {(!quick || !googleReady) && <button type="button" className={styles.googleButton} onClick={startGoogle}
              disabled={busy || googleBusy} aria-label={c.google}>
              <span className={styles.googleMark} aria-hidden="true">G</span>
              {googleBusy ? c.googleBusy : c.google}
            </button>}
            {googleReady && method === "email" && <p className={styles.googleReady} role="status">{quick ? c.quickReady : c.googleReady}</p>}
            {(!quick || !googleReady) && <p className={styles.separator}><span>{c.divider}</span></p>}
            {!quick && <div className={styles.methodChoices} role="group" aria-label={c.replyVia}>
              <button type="button" aria-pressed={method === "email"} disabled={busy || googleBusy}
                onClick={() => { setMethod("email"); setError(""); operationId.current = null; }}>
                {c.email}
              </button>
              <button type="button" aria-pressed={method === "phone"} disabled={busy || googleBusy}
                onClick={() => { setMethod("phone"); setError(""); operationId.current = null; }}>
                {c.phone}
              </button>
            </div>}
            <div className={styles.contactFields}>
              {method === "email" ? (
                <label>{c.email}
                  <input type="email" autoComplete="email" maxLength={254} required disabled={busy || googleBusy}
                    value={email} onChange={event => {
                      setEmail(event.target.value); setError(""); operationId.current = null;
                    }} />
                </label>
              ) : (
                <div className={styles.phoneField}>
                  <label htmlFor={panelId + "-phone"}>{c.phone}</label>
                  <PhoneCountryInput id={panelId + "-phone"} locale={locale} required
                    disabled={busy || googleBusy} value={phone} onChange={value => {
                      setPhone(value); setError(""); operationId.current = null;
                    }} />
                </div>
              )}
            </div>
            {!quick && <><details className={styles.optionalName}>
              <summary>{c.nameOptional}</summary>
              <label>{c.name}
                <input type="text" autoComplete="name" minLength={2} maxLength={120}
                  disabled={busy || googleBusy} value={displayName} onChange={event => {
                    setDisplayName(event.target.value); setError(""); operationId.current = null;
                  }} />
              </label>
            </details>
            <small className={styles.privateNote}>{c.contactHelp}</small>
            <details className={styles.optionalNote}>
              <summary>{c.description}</summary>
              <textarea id={panelId + "-situation"} aria-label={c.description}
                maxLength={1400} rows={2}
                placeholder={c.placeholder} value={description} disabled={busy}
                onChange={event => {
                  setDescription(event.target.value); setError(""); operationId.current = null;
                }} />
              <small className={styles.privateNote}>{c.privateNote}</small>
            </details>
            <label className={styles.consent}>
              <input type="checkbox" required checked={consent} disabled={busy}
                onChange={event => { setConsent(event.target.checked); operationId.current = null; }} />
              <span>{c.consent}</span>
            </label></>}
            {quick && <button type="button" className={styles.quickSwitch} disabled={busy || googleBusy}
              onClick={() => { setMethod(current => current === "email" ? "phone" : "email"); setError(""); operationId.current = null; }}>
              {method === "email" ? c.quickPhone : c.quickEmail}
            </button>}
            {quick && <small className={styles.quickConsent}>{c.quickConsent}</small>}
            <label className={styles.honeypot} aria-hidden="true">
              Website <input type="text" name="website" autoComplete="off" tabIndex={-1}
                value={website} onChange={event => setWebsite(event.target.value)} />
            </label>
            <button type="submit" className={styles.submit}
              disabled={busy || googleBusy ||
                (method === "email" ? !email.trim() : !phone.trim()) || !consent}>
              <Send size={17} aria-hidden="true" />{busy ? c.sending : (quick ? c.quickSubmit : c.submit)}
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
              setMethod("email"); setGoogleReady(false);
              setPhone(""); setConsent(quick); setWebsite(""); setError(""); operationId.current = null;
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
