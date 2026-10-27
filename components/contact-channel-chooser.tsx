"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { FreeExpressGoogleClaim } from "@/components/free-express-google-claim";
import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import { emitPublicAnalyticsEvent, type PublicAnalyticsEvent } from "@/lib/public-analytics";
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
    quickConsent: "Check the box to request one personal reply. No marketing, charge or confirmed booking.",
    compactConsent: "I agree to a personal reply about this request only. No marketing.",
    compactPhoneLabel: "Phone number", compactPhoneError: "Enter your international phone number.",
    compactSaved: "Request saved. Review the message and tap Send in your chat.",
    compactHandoff: "Chat did not open automatically. Use a button below.",
    expressQuestion: "What would you like to explore? (optional)",
    expressHint: "One or two sentences. Please avoid medical records, symptoms, or test results.",
    expressAddDetails: "Add a few words (optional)",
    compactConsentRequired: "Please agree to one personal reply before continuing.",
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
    quickConsent: "Отметьте согласие выше, чтобы получить личный ответ. Без рекламы, оплаты и автоматической записи.",
    compactConsent: "Согласен(на) на личный ответ по заявке. Без рекламы.",
    compactPhoneLabel: "Номер телефона", compactPhoneError: "Введите номер телефона с кодом страны.",
    compactSaved: "Заявка сохранена. Проверьте сообщение и нажмите «Отправить» в чате.",
    compactHandoff: "Чат не открылся автоматически. Нажмите кнопку ниже.",
    expressQuestion: "В чём суть вашего вопроса? (необязательно)",
    expressHint: "Одно-два предложения. Не указывайте симптомы, анализы и результаты тестов.",
    expressAddDetails: "Уточнить вопрос (по желанию)",
    compactConsentRequired: "Для отправки подтвердите согласие на один личный ответ.",
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
    quickConsent: "Marca la casilla para solicitar una respuesta personal. Sin publicidad, cobro ni reserva confirmada.",
    compactConsent: "Acepto recibir una respuesta personal sobre esta solicitud. Sin publicidad.",
    compactPhoneLabel: "Número de teléfono", compactPhoneError: "Introduce tu teléfono con prefijo internacional.",
    compactSaved: "Solicitud guardada. Revisa el mensaje y pulsa Enviar en el chat.",
    compactHandoff: "El chat no se abrió. Usa un botón de abajo.",
    expressQuestion: "¿Cuál es tu consulta? (opcional)",
    expressHint: "Una o dos frases. Evita síntomas, informes médicos y resultados de pruebas.",
    expressAddDetails: "Añadir detalles (opcional)",
    compactConsentRequired: "Acepta una respuesta personal antes de continuar.",
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
  /** Phone + messenger handoff for existing compact forms. */
  compactPhone?: boolean;
  /** Only Alchemy's fixed one-time SKU; never a client-specified amount or booking status. */
  bookingSku?: "express-consultation-30" | "personal-session-60";
  /** Keep the original request button but reveal the compact phone-only form. */
  compactTrigger?: boolean;
  /** Keep the verified receipt in place so the visitor can select a messenger after saving. */
  stayAfterSave?: boolean;
  resetKey?: string;
  publicTopic?: string;
  /** Public EN/RU/ES consultation offer label saved to CRM; no private notes. */
  publicServiceTitle?: string;
  /** Only the confirmed free situation request may be saved via signed Google claim. */
  allowSecureExpressClaim?: boolean;
};

/** Anonymous first-party lead save, followed by an explicit client-initiated messenger handoff. */
export function ContactChannelChooser({
  locale, whatsappUrl, className, label, event = "contact_click", analyticsEvent,
  onChannelClick, attributes, id, quick = false, compactPhone = false, compactTrigger = false, stayAfterSave = false, resetKey, publicTopic, publicServiceTitle, allowSecureExpressClaim = false, bookingSku,
}: Props) {
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
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingStartsAt, setBookingStartsAt] = useState<string | null>(null);
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  const submitting = useRef(false);
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
    if (compactPhone) {
      // A changed option must create a fresh enquiry, but keep an entered phone
      // so switching between free/personal choices never requires retyping it.
      setMethod("phone");
      setSaved(null);
      setBookingConfirmed(false);
      setBookingStartsAt(null);
      setPaymentExpanded(false);
      setError("");
      operationId.current = null;
      return;
    }
    setOpen(false);
    setDescription("");
    setDisplayName("");
    setMethod("email");
    setGoogleReady(false);
    setEmail("");
    setPhone("");
    setConsent(false);
    setWebsite("");
    setSaved(null);
    setError("");
    operationId.current = null;
  }, [enquiryResetKey, quick, compactPhone]);

  useEffect(() => {
    if (compactPhone || (!open && !(quick && saved))) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // On iPhone, the form shrinks after save and the messenger actions can fall
    // under the fixed bottom navigation. Reposition the saved actions, not just
    // the first form opening. The visitor still decides whether to open a chat.
    const target = saved
      ? panelRef.current?.querySelector('[data-contact-channel="whatsapp"]')
      : panelRef.current;
    target?.scrollIntoView({ block: "center", behavior: reducedMotion ? "auto" : "smooth" });
  }, [open, saved, quick, compactPhone]);

  // An opened short form must remain reachable above the iPhone bottom bar.
  useEffect(() => {
    if (!compactPhone || !compactTrigger || !open) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panelRef.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }, [compactPhone, compactTrigger, open, saved]);

  // Never trust a typed name, public HH reference, query string or local storage
  // to unlock the cart. Only the original signed HttpOnly cookie + RLS can read
  // the practitioner's confirmed booking status.
  useEffect(() => {
    if (!bookingSku) return;
    let active = true;
    fetch("/api/service-enquiries/booking-status", {
      credentials: "same-origin", cache: "no-store",
    }).then(response => response.ok ? response.json() : null)
      .then(status => {
        if (!active || !status || status.bookingSku !== bookingSku ||
            !/^HH-[A-F0-9]{12}$/.test(status.referenceCode || "")) return;
        setSaved({ saved: true, referenceCode: status.referenceCode });
        setBookingConfirmed(status.booked === true);
        setBookingStartsAt(status.booked === true && typeof status.startsAt === "string" ? status.startsAt : null);
      }).catch(() => { /* No signed proof or offline: never unlock payment. */ });
    return () => { active = false; };
  }, [bookingSku, enquiryResetKey]);

  async function checkBookingStatus() {
    if (!bookingSku) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/service-enquiries/booking-status", {
        credentials: "same-origin", cache: "no-store",
      });
      const status = await response.json().catch(() => ({}));
      if (!response.ok || status.bookingSku !== bookingSku ||
          !/^HH-[A-F0-9]{12}$/.test(status.referenceCode || "")) throw new Error("NOT_VERIFIED");
      setSaved({ saved: true, referenceCode: status.referenceCode });
      setBookingConfirmed(status.booked === true);
      setBookingStartsAt(status.booked === true && typeof status.startsAt === "string" ? status.startsAt : null);
    } catch {
      setError(locale === "ru" ? "Не удалось проверить запись. Попробуйте позже." :
        locale === "es" ? "No se ha podido comprobar la reserva." :
        "Could not verify the booking. Please try again.");
    } finally { setBusy(false); }
  }

  const referredWhatsappUrl = withPaidAdReferral(
    withOrganicEventReferral(whatsappUrl, publicEventSearch, pathname, locale),
    publicAdSearch, pathname, locale,
  );
  const originalMessage = new URL(referredWhatsappUrl).searchParams.get("text") || "";
  // Only the one personal express review gets a brief note in compact phone
  // capture. Other compact forms keep their approved layout and contract.
  const expressReview = compactPhone && publicTopic?.startsWith("Express review focus: ");
  // Preserve the selected public tariff instead of a generic WhatsApp heading.
  const serviceTitle = publicServiceTitle?.trim() || originalMessage.split("\n")
    .find(line => /^(?:Service|Услуга|Servicio):\s*/i.test(line))
    ?.replace(/^[^:]+:\s*/, "").trim() || "Holistic House service";

  // A same-tab OAuth return uses only non-sensitive, public service identity in
  // sessionStorage; never save entered contacts, private notes or tokens there.
  useEffect(() => {
    const url = new URL(window.location.href);
    if ((compactPhone && !bookingSku) || url.searchParams.get("hh_enquiry") !== "google") return;
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
  }, [pathname, serviceTitle, panelId, c.googleError, compactPhone, bookingSku]);

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void saveEnquiry();
  }

  async function saveEnquiry(channel?: "whatsapp" | "telegram") {
    if (busy || saved) return;
    if (submitting.current) return;
    const cleanedPhone = phone.replace(/[\s().-]/g, "");
    const usePhone = (compactPhone && !bookingSku) || method === "phone";
    if ((!usePhone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) ||
      (usePhone && !/^\+[1-9][0-9]{7,14}$/.test(cleanedPhone))) {
      setError(compactPhone ? c.compactPhoneError : c.contactError);
      return;
    }
    if (!consent) {
      setError(compactPhone ? c.compactConsentRequired : c.quickConsent);
      return;
    }
    // Open synchronously during the messenger tap: iPhone Safari blocks a new
    // tab if we try window.open only after the asynchronous CRM save.
    let handoffWindow: Window | null = null;
    if (channel) {
      try {
        handoffWindow = window.open("about:blank", "_blank");
        if (handoffWindow) handoffWindow.opener = null;
      } catch { /* The saved receipt still shows manually tappable links. */ }
    }
    submitting.current = true;
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
          ...(bookingSku ? { bookingSku } : {}),
          description: expressReview
            ? [publicTopic?.trim() || "", ...(description.trim() ? ["Initial question: " + description.trim()] : [])].join("\n")
            : description.trim() || ((quick || compactPhone) ? publicTopic?.trim() || "" : ""),
          sourcePath: pathname, locale,
          contact: { displayName: displayName.trim(), email: usePhone ? "" : email.trim(), phone: usePhone ? cleanedPhone : "" },
          contactConsent: consent, website,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.saved !== true || !/^HH-[A-F0-9]{12}$/.test(data.referenceCode || "")) {
        if (response.status === 409) operationId.current = null;
        throw new Error(data.error || "NOT_SAVED");
      }
      setSaved({ saved: true, referenceCode: data.referenceCode });
      if (bookingSku) { setBookingConfirmed(false); setBookingStartsAt(null); }
      // Only a confirmed server/CRM write creates a receipt. No personal data
      // or sensitive answers are placed in browser storage or the URL.
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY, JSON.stringify({
          referenceCode: data.referenceCode, createdAt: Date.now(),
        }));
        if (!stayAfterSave) router.push("/" + locale + "/thank-you");
      } catch {
        // Private browsing may block sessionStorage. The existing in-place
        // confirmation and optional messenger handoff remain available.
      }
      if (channel) {
        const draftUrl = new URL(referredWhatsappUrl);
        draftUrl.searchParams.set("text", originalMessage + "\n\n" + c.reference + ": " + data.referenceCode);
        const destination = channel === "whatsapp"
          ? draftUrl.toString()
          : telegramEnquiryUrlFromWhatsApp(draftUrl.toString());
        try {
          if (!handoffWindow || handoffWindow.closed) throw new Error("HANDOFF_BLOCKED");
          handoffWindow.location.replace(destination);
          onChannelClick?.(channel);
          if (analyticsEvent) emitPublicAnalyticsEvent(analyticsEvent);
        } catch {
          try { handoffWindow?.close(); } catch { /* No effect on the saved request. */ }
          setError(c.compactHandoff);
        }
      }
    } catch {
      try { handoffWindow?.close(); } catch { /* Never hand off an unsaved request. */ }
      setError(c.error);
    } finally {
      submitting.current = false;
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

  if (compactPhone && bookingSku) {
    const paidReady = bookingConfirmed && Boolean(saved && bookingStartsAt);
    const sessionText = bookingSku === "express-consultation-30"
      ? (locale === "ru" ? "Экспресс · 30 мин · €50" : locale === "es" ? "Exprés · 30 min · 50 €" : "Express · 30 min · €50")
      : (locale === "ru" ? "Личная сессия · 60 мин · €100" : locale === "es" ? "Sesión personal · 60 min · 100 €" : "Personal session · 60 min · €100");
    const bookLabel = locale === "ru" ? "Book a Session · Записаться" : locale === "es" ? "Book a Session · Reservar" : "Book a Session";
    const payLabel = locale === "ru" ? "Pay Your Session · Оплатить" : locale === "es" ? "Pay Your Session · Pagar" : "Pay Your Session";
    return (
      <div className={[styles.compactPhone, styles.compactPhoneToggle].join(" ")}
        data-contact-channel-chooser data-session-booking-flow data-booking-sku={bookingSku}>
        <button id={id} type="button" className={[styles.trigger, className].filter(Boolean).join(" ")}
          aria-expanded={open} aria-controls={panelId} data-contact-order
          data-booking-cta={paidReady ? "pay" : "book"}
          onClick={() => {
            if (paidReady) { setOpen(true); setPaymentExpanded(value => !value); }
            else { setOpen(value => !value); setPaymentExpanded(false); }
          }}>
          <ShoppingBag size={20} aria-hidden="true" />
          <span>{paidReady ? payLabel : bookLabel}</span>
          <ChevronDown className={styles.chevron} size={21} aria-hidden="true" />
        </button>
        <div ref={panelRef} id={panelId} className={styles.compactTogglePanel} hidden={!open}>
          {!saved ? (
            <form className={styles.bookingForm} data-booking-step="contact" onSubmit={submit}>
              <p className={styles.bookingIntro}>{locale === "ru"
                ? "Забронируйте выбранную сессию через телефон или Google. Время подтвердит Андрей."
                : locale === "es" ? "Reserva con teléfono o Google. Andrey confirmará el horario."
                  : "Book with your phone number or Google. Andrey will confirm the time."}</p>
              <p className={styles.bookingProduct}>{sessionText}</p>
              {!googleReady ? (
                <button type="button" className={styles.googleButton} onClick={startGoogle}
                  disabled={busy || googleBusy} aria-label={c.google}>
                  <span className={styles.googleMark} aria-hidden="true">G</span>
                  {googleBusy ? c.googleBusy : c.google}
                </button>
              ) : null}
              {googleReady && method === "email" ? (
                <>
                  <p className={styles.googleReady} role="status">{c.googleReady}</p>
                  <button className={styles.bookingSwitch} type="button"
                    onClick={() => { setMethod("phone"); setError(""); operationId.current = null; }}>
                    {c.quickPhone}
                  </button>
                </>
              ) : (
                <div className={styles.compactPhoneField}>
                  <label htmlFor={panelId + "-phone"}>{c.compactPhoneLabel}</label>
                  <PhoneCountryInput id={panelId + "-phone"} locale={locale} value={phone}
                    disabled={busy || googleBusy} required onChange={value => {
                      setPhone(value); setMethod("phone"); setError(""); operationId.current = null;
                    }} />
                </div>
              )}
              <label className={styles.compactConsent}>
                <input type="checkbox" checked={consent} required disabled={busy || googleBusy}
                  onChange={event => { setConsent(event.target.checked); setError(""); operationId.current = null; }} />
                <span>{c.compactConsent}</span>
              </label>
              <label className={styles.honeypot} aria-hidden="true">
                Website <input type="text" tabIndex={-1} autoComplete="off"
                  value={website} onChange={event => setWebsite(event.target.value)} />
              </label>
              <button type="submit" className={styles.bookingPrimary}
                disabled={busy || googleBusy || !consent ||
                  (method === "email" ? !googleReady || !email.trim() : !phone.trim())}>
                {busy ? c.sending : bookLabel}
              </button>
              <p className={styles.bookingFine}>{locale === "ru"
                ? "Это заявка в CRM, не автоматическое подтверждение записи. Без оплаты и рекламы."
                : locale === "es" ? "Se registra una solicitud, no una cita ni un pago automático. Sin publicidad."
                  : "This creates a CRM enquiry, not a confirmed appointment or charge. No marketing."}</p>
              {error && <p className={styles.error} role="alert">{error}</p>}
            </form>
          ) : (
            <section className={styles.compactReceipt} data-booking-step={paidReady ? "confirmed" : "pending"}>
              <p className={styles.saved} role="status">{c.saved} · {saved.referenceCode}</p>
              <p className={styles.bookingProduct}>{sessionText}</p>
              {paidReady ? (
                <p className={styles.bookingSuccess}>
                  {locale === "ru" ? "Время подтверждено:" : locale === "es" ? "Horario confirmado:" : "Confirmed time:"}
                  {" "}<time dateTime={bookingStartsAt!}>
                    {new Date(bookingStartsAt!).toLocaleString(locale === "ru" ? "ru-RU" : locale === "es" ? "es-ES" : "en-CA", {
                      year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
                    })}
                  </time>
                </p>
              ) : (
                <p className={styles.bookingPending} role="status">
                  {locale === "ru"
                    ? "Заявка получена. Андрей согласует с вами время; оплата откроется после его подтверждения."
                    : locale === "es"
                      ? "Solicitud recibida. Andrey acordará la hora contigo. El pago se habilita tras su confirmación."
                      : "Request received. Andrey will agree a time with you. Payment unlocks only after his confirmation."}
                </p>
              )}
              {paidReady && paymentExpanded ? (
                <section className={styles.bookingPayPanel} data-booking-payment-options>
                  <strong>{locale === "ru" ? "Ваша корзина" : locale === "es" ? "Tu carrito" : "Your cart"} · {sessionText}</strong>
                  <Link className={styles.bookingPrimary}
                    href={"/" + locale + "/cart?items=" + encodeURIComponent(bookingSku)}
                    prefetch={false} data-booking-cart-link>
                    {locale === "ru" ? "Открыть корзину и способы оплаты" : locale === "es"
                      ? "Abrir carrito y métodos de pago" : "Open cart & payment methods"}
                  </Link>
                  <small>{locale === "ru" ? "Выберите доступный способ оплаты. Поступление подтверждается отдельно."
                    : locale === "es" ? "Elige un método disponible. La recepción del pago se confirma por separado."
                      : "Choose an available payment method in the cart. Receipt is verified separately."}</small>
                </section>
              ) : null}
              {!paidReady ? (
                <button type="button" className={styles.bookingCheck} disabled={busy}
                  onClick={() => { void checkBookingStatus(); }} data-booking-check-status>
                  {busy ? c.sending : locale === "ru" ? "Проверить подтверждение времени" : locale === "es"
                    ? "Comprobar confirmación" : "Check booking confirmation"}
                </button>
              ) : null}
              <details className={styles.bookingChat}>
                <summary>{c.messengers}</summary>
                <div className={styles.compactChannels}>
                  <AcquisitionEventLink prefetch={false} className={styles.whatsapp} href={preparedWhatsApp}
                    event={event} analyticsEvent={analyticsEvent} onClick={() => onChannelClick?.("whatsapp")}
                    target="_blank" rel="noopener noreferrer"
                    attributes={{ ...attributes, "data-contact-channel": "whatsapp" }}>
                    <MessageCircle size={19} aria-hidden="true" />WhatsApp
                  </AcquisitionEventLink>
                  <AcquisitionEventLink prefetch={false} className={styles.telegram}
                    href={telegramEnquiryUrlFromWhatsApp(preparedWhatsApp)}
                    event={event} analyticsEvent={analyticsEvent}
                    onClick={() => onChannelClick?.("telegram")} target="_blank" rel="noopener noreferrer"
                    attributes={{ ...attributes, "data-contact-channel": "telegram" }}>
                    <Send size={19} aria-hidden="true" />Telegram
                  </AcquisitionEventLink>
                </div>
              </details>
              {error && <p className={styles.error} role="alert">{error}</p>}
            </section>
          )}
        </div>
      </div>
    );
  }

  if (compactPhone) {
    return (
      <div className={[styles.compactPhone, compactTrigger ? styles.compactPhoneToggle : ""].filter(Boolean).join(" ")}
        data-contact-channel-chooser data-reiki-phone-enquiry data-compact-phone-trigger={compactTrigger ? "true" : undefined}>
        {compactTrigger ? (
          <button id={id} type="button" className={[styles.trigger, className].filter(Boolean).join(" ")}
            aria-expanded={open} aria-controls={panelId} data-contact-order
            onClick={() => setOpen((value) => !value)}>
            <MessageCircle size={20} aria-hidden="true" />
            <span>{label || c.order}</span>
            <ChevronDown className={styles.chevron} size={21} aria-hidden="true" />
          </button>
        ) : null}
        <div ref={panelRef} id={panelId} className={compactTrigger ? styles.compactTogglePanel : undefined}
          hidden={compactTrigger && !open}>
          {!saved ? (
          <form className={styles.compactPhoneForm} onSubmit={event => event.preventDefault()}>
            <div className={styles.compactPhoneField}>
              <label htmlFor={panelId + "-phone"}>{c.compactPhoneLabel}</label>
              <PhoneCountryInput id={panelId + "-phone"} locale={locale} value={phone}
                disabled={busy} required onChange={value => {
                  setPhone(value); setError(""); operationId.current = null;
                }} />
            </div>
            {expressReview && <details className={styles.compactQuestionReveal}>
              <summary>{c.expressAddDetails}</summary>
              <label className={styles.compactQuestion}>
                <span>{c.expressQuestion}</span>
                <textarea rows={2} maxLength={300} value={description} disabled={busy}
                  placeholder={c.expressHint}
                  onChange={event => { setDescription(event.target.value); setError(""); operationId.current = null; }} />
              </label>
            </details>}
            <label className={styles.compactConsent}>
              <input type="checkbox" checked={consent} required disabled={busy}
                onChange={event => { setConsent(event.target.checked); setError(""); operationId.current = null; }} />
              <span>{c.compactConsent}</span>
            </label>
            <label className={styles.honeypot} aria-hidden="true">
              Website <input type="text" tabIndex={-1} autoComplete="off"
                value={website} onChange={event => setWebsite(event.target.value)} />
            </label>
            <div className={styles.compactChannels} role="group" aria-label={c.messengers}>
              <button type="button" className={styles.whatsapp} disabled={busy}
                data-contact-channel-submit="whatsapp" onClick={() => { void saveEnquiry("whatsapp"); }}>
                <MessageCircle size={19} aria-hidden="true" />{busy ? c.sending : "WhatsApp"}
              </button>
              <button type="button" className={styles.telegram} disabled={busy}
                data-contact-channel-submit="telegram" onClick={() => { void saveEnquiry("telegram"); }}>
                <Send size={19} aria-hidden="true" />{busy ? c.sending : "Telegram"}
              </button>
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </form>
        ) : (
          <div className={styles.compactReceipt}>
            <p className={styles.saved} role="status">{c.saved} · {saved.referenceCode}</p>
            <p className={styles.next}>{c.compactSaved}</p>
            <div className={styles.compactChannels} role="group" aria-label={c.messengers}>
              <AcquisitionEventLink prefetch={false} className={styles.whatsapp}
                href={preparedWhatsApp} event={event} analyticsEvent={analyticsEvent}
                onClick={() => onChannelClick?.("whatsapp")}
                target="_blank" rel="noopener noreferrer"
                attributes={{ ...attributes, "data-contact-channel": "whatsapp" }}>
                <MessageCircle size={19} aria-hidden="true" />WhatsApp
              </AcquisitionEventLink>
              <AcquisitionEventLink prefetch={false} className={styles.telegram}
                href={telegramEnquiryUrlFromWhatsApp(preparedWhatsApp)}
                event={event} analyticsEvent={analyticsEvent}
                onClick={() => onChannelClick?.("telegram")}
                target="_blank" rel="noopener noreferrer"
                attributes={{ ...attributes, "data-contact-channel": "telegram" }}>
                <Send size={19} aria-hidden="true" />Telegram
              </AcquisitionEventLink>
            </div>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </div>
        )}
        {allowSecureExpressClaim && expressReview &&
          <FreeExpressGoogleClaim locale={locale} referenceCode={saved?.referenceCode || null}
            onRestored={ref=>setSaved({saved:true,referenceCode:ref})}/>}
        </div>
      </div>
    );
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
            </>}
            <label className={styles.consent}>
              <input type="checkbox" required checked={consent} disabled={busy}
                onChange={event => { setConsent(event.target.checked); operationId.current = null; }} />
              <span>{c.consent}</span>
            </label>
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
              setPhone(""); setConsent(false); setWebsite(""); setError(""); operationId.current = null;
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
