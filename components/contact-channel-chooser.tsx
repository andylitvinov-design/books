"use client";

import { useEffect, useLayoutEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { ACQUISITION_EVENTS } from "@/data/local-acquisition";
import { emitPublicAnalyticsEvent, type PublicAnalyticsEvent } from "@/lib/public-analytics";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import { readOrganicEventReferral, withOrganicEventReferral } from "@/lib/organic-event-referrals";
import { readPaidAdReferral, withPaidAdReferral } from "@/lib/paid-ad-referrals";
import { normalizePublicServiceEnquiry } from "@/lib/practitioners/public-service-enquiry-input.mjs";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import styles from "./contact-channel-chooser.module.css";

type AcquisitionEvent = (typeof ACQUISITION_EVENTS)[number] | PublicAnalyticsEvent;
type SavedEnquiry = { referenceCode: string; saved: true; whatsappUrl: string };
type EnquiryAttempt = Readonly<{ body: string; context: string; whatsappUrl: string; confirmed: boolean }>;

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
    sending: "Saving request…", retry: "Retry the same request",
    saved: "Thank you — your request was received",
    next: "Andrey can contact you using the details provided. A date or place is confirmed separately. WhatsApp or Telegram is optional.",
    messengers: "Continue in your preferred messenger",
    error: "We could not confirm your request. Retry sends the same request, not a new one. Please do not submit another request while this is unresolved.",
    contextChanged: "An earlier request is unresolved. Return to the previous selection to retry that request.",
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
    sending: "Сохраняем заявку…", retry: "Повторить ту же заявку",
    saved: "Спасибо! Ваша заявка получена",
    next: "Андрей сможет связаться с вами по указанным контактам. Место и время подтверждаются отдельно. WhatsApp и Telegram — по желанию.",
    messengers: "Продолжить в удобном мессенджере",
    error: "Не удалось подтвердить заявку. Повтор отправит тот же запрос, а не новый. Не создавайте другую заявку, пока результат не подтверждён.",
    contextChanged: "Предыдущая заявка ещё не подтверждена. Вернитесь к прежнему выбору, чтобы повторить тот же запрос.",
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
    sending: "Guardando solicitud…", retry: "Reintentar la misma solicitud",
    saved: "¡Gracias! Hemos recibido tu solicitud",
    next: "Andrey puede responder usando tus datos. Fecha y plaza se confirman por separado. WhatsApp y Telegram son opcionales.",
    messengers: "Continuar por mensajería",
    error: "No pudimos confirmar tu solicitud. Reintentar envía la misma solicitud, no una nueva. No envíes otra mientras no se confirme el resultado.",
    contextChanged: "La solicitud anterior sigue sin confirmar. Vuelve a la selección anterior para reintentar esa solicitud.",
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
  /** One-step phone + WhatsApp / Telegram handoff; never show the sign-up/Google panel. */
  compactPhone?: boolean;
  /** Keep the original request button but reveal the compact phone-only form. */
  compactTrigger?: boolean;
  /** Keep the verified receipt in place so the visitor can select a messenger after saving. */
  stayAfterSave?: boolean;
  resetKey?: string;
  publicTopic?: string;
  /** Keep parent selection stable while a write is pending or its outcome is unknown. */
  onSubmissionLockChange?: (locked: boolean, owner: string) => void;
};

/** Anonymous first-party lead save, followed by an explicit client-initiated messenger handoff. */
export function ContactChannelChooser({
  locale, whatsappUrl, className, label, event = "contact_click", analyticsEvent,
  onChannelClick, attributes, id, quick = false, compactPhone = false, compactTrigger = false, stayAfterSave = false, resetKey, publicTopic, onSubmissionLockChange,
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<EnquiryAttempt | null>(null);
  const operationPending = useRef(false);
  const pendingHandoff = useRef<Window | null>(null);
  const [locked, setLocked] = useState(false);
  const mounted = useRef(false);
  const authAttempt = useRef<{ context: string } | null>(null);
  const lockCallback = useRef(onSubmissionLockChange);
  const pathname = usePathname();
  const router = useRouter();
  const [publicEventSearch, setPublicEventSearch] = useState("");
  const [publicAdSearch, setPublicAdSearch] = useState("");
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const c = copy[locale];
  const enquiryResetKey = resetKey || whatsappUrl;
  const contextKey = JSON.stringify([enquiryResetKey, whatsappUrl, pathname, locale, quick, compactPhone, publicTopic, stayAfterSave]);
  const activeContext = useRef(contextKey);
  const contextRevision = useRef(0);
  // A committed A → B → A transition must not revive an old handler or
  // response merely because the public context string matches again.
  const renderRevision = contextRevision.current + (activeContext.current !== contextKey ? 1 : 0);

  useLayoutEffect(() => { lockCallback.current = onSubmissionLockChange; }, [onSubmissionLockChange]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      authAttempt.current = null;
      try { pendingHandoff.current?.close(); } catch { /* Close only our unsent blank window. */ }
      pendingHandoff.current = null;
      // A replacing child may already own a newer lock. Parent releases only
      // a matching owner, never whichever request happens to be current.
      lockCallback.current?.(false, panelId);
    };
  }, [panelId]);

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

  useLayoutEffect(() => {
    if (activeContext.current !== contextKey) {
      contextRevision.current += 1;
      try { pendingHandoff.current?.close(); } catch { /* Never hand off a stale selection. */ }
      pendingHandoff.current = null;
    }
    activeContext.current = contextKey;
  }, [contextKey]);

  useEffect(() => {
    // A lost response does not mean no write. Keep the original body and UUID
    // in memory; changing a prop must not create a second uncertain enquiry.
    if (operation.current && !operation.current.confirmed) {
      setError(operation.current.context === contextKey ? c.error : c.contextChanged);
      return;
    }
    if (compactPhone) {
      // Preserve the entered phone when changing a confirmed/public selection.
      // An unresolved operation above always retains its exact body and lock.
      setMethod("phone");
      setSaved(null);
      setError("");
      operation.current = null;
      setLocked(false);
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
    operation.current = null;
    setLocked(false);
  }, [contextKey, quick, compactPhone, c.error, c.contextChanged]);

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

  const referredWhatsappUrl = withPaidAdReferral(
    withOrganicEventReferral(whatsappUrl, publicEventSearch, pathname, locale),
    publicAdSearch, pathname, locale,
  );
  let originalMessage = "";
  try {
    // Reuse the existing trusted-handoff validation; malformed URLs never POST.
    telegramEnquiryUrlFromWhatsApp(referredWhatsappUrl);
    originalMessage = new URL(referredWhatsappUrl).searchParams.get("text") || "";
  } catch { /* Invalid public context fails validation before a write. */ }
  const serviceTitle = originalMessage.split("\n")
    .find(line => /^(?:Service|Услуга|Servicio):\s*/i.test(line))
    ?.replace(/^[^:]+:\s*/, "").trim() || "";

  // A same-tab OAuth return uses only non-sensitive, public service identity in
  // sessionStorage; never save entered contacts, private notes or tokens there.
  useEffect(() => {
    if (compactPhone || operation.current || authAttempt.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("hh_enquiry") !== "google") return;
    let pending: { path?: string; service?: string; panel?: string } | null = null;
    try {
      pending = JSON.parse(window.sessionStorage.getItem("hh-google-enquiry-return") || "null");
    } catch { /* A blocked or malformed temporary marker never creates a lead. */ }
    if (pending?.path !== pathname || pending.service !== serviceTitle || pending.panel !== panelId) return;
    try { window.sessionStorage.removeItem("hh-google-enquiry-return"); }
    catch { return; } // Do not continue a return marker we cannot consume safely.
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
        if (!active || !mounted.current || activeContext.current !== contextKey || operation.current) return;
        const nextEmail = typeof profile.email === "string" ? profile.email.trim() : "";
        const nextName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) throw new Error("NO_EMAIL");
        setEmail(nextEmail);
        if (nextName.length >= 2 && nextName.length <= 120) setDisplayName(nextName);
        setMethod("email");
        setGoogleReady(true);
        setError("");
      }).catch(() => {
        if (active && mounted.current && activeContext.current === contextKey && !operation.current) setError(c.googleError);
      });
    return () => { active = false; };
  }, [pathname, serviceTitle, panelId, c.googleError, contextKey, compactPhone]);

  // Prefill from a verified account without silently creating a lead.
  // Reply consent still requires the unchecked, explicit checkbox.
  useEffect(() => {
    if (compactPhone || !quick || operation.current) return;
    let active = true;
    fetch("/api/app/auth/contact-profile", { method: "GET", credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(profile => {
        if (!active || !profile || !mounted.current || activeContext.current !== contextKey || operation.current) return;
        const nextEmail = typeof profile.email === "string" ? profile.email.trim() : "";
        const nextName = typeof profile.displayName === "string" ? profile.displayName.trim() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) return;
        setEmail(current => current || nextEmail);
        if (nextName.length >= 2 && nextName.length <= 120) setDisplayName(current => current || nextName);
        setGoogleReady(true);
      }).catch(() => { /* A guest can submit a request without Google. */ });
    return () => { active = false; };
  }, [quick, contextKey, compactPhone]);

  async function startGoogle() {
    if (compactPhone || googleBusy || busy || operation.current || authAttempt.current) return;
    const attempt = { context: contextKey };
    authAttempt.current = attempt;
    let markerSaved = false;
    let redirectStarted = false;
    onSubmissionLockChange?.(true, panelId);
    setGoogleBusy(true);
    setError("");
    try {
      const response = await fetch("/api/app/auth/start", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, continueTo: "enquiry", returnPath: pathname }),
      });
      const data = await response.json().catch(() => ({}));
      if (!mounted.current || activeContext.current !== attempt.context || authAttempt.current !== attempt) return;
      if (!response.ok || typeof data.redirectUrl !== "string" ||
          new URL(data.redirectUrl).protocol !== "https:") throw new Error("GOOGLE_UNAVAILABLE");
      window.sessionStorage.setItem("hh-google-enquiry-return",
        JSON.stringify({ path: pathname, service: serviceTitle, panel: panelId }));
      markerSaved = true;
      window.location.assign(data.redirectUrl);
      redirectStarted = true;
    } catch {
      if (markerSaved) {
        try { window.sessionStorage.removeItem("hh-google-enquiry-return"); } catch { /* Best effort only. */ }
      }
      if (mounted.current && activeContext.current === attempt.context) setError(c.googleError);
    } finally {
      if (authAttempt.current === attempt && !redirectStarted) {
        authAttempt.current = null;
        if (mounted.current) {
          setGoogleBusy(false);
          if (!operation.current) onSubmissionLockChange?.(false, panelId);
        }
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveEnquiry();
  }

  async function saveEnquiry(channel?: "whatsapp" | "telegram") {
    if (!mounted.current || activeContext.current !== contextKey || contextRevision.current !== renderRevision) return;
    if (busy || googleBusy || authAttempt.current || saved || operation.current?.confirmed || operationPending.current) return;
    if (operation.current && operation.current.context !== contextKey) {
      setError(c.contextChanged);
      return;
    }
    let attempt = operation.current;
    if (!attempt) {
      const cleanedPhone = phone.replace(/[\s().-]/g, "");
      const usePhone = compactPhone || method === "phone";
      const payload = {
        operationId: crypto.randomUUID(), serviceTitle,
        description: description.trim() || ((quick || compactPhone) ? publicTopic?.trim() || "" : ""),
        sourcePath: pathname, locale,
        contact: { displayName: displayName.trim(), email: usePhone ? "" : email.trim(), phone: usePhone ? cleanedPhone : "" },
        contactConsent: consent, website,
      };
      try {
        // Validate with the same pure contract as the API, but send the original
        // optional note unchanged. Server normalization remains authoritative.
        normalizePublicServiceEnquiry(payload);
      } catch {
        setError(compactPhone ? c.compactPhoneError : c.contactError);
        return;
      }
      attempt = { body: JSON.stringify(payload), context: contextKey,
        whatsappUrl: referredWhatsappUrl, confirmed: false };
      operation.current = attempt;
    }
    const submittedRevision = contextRevision.current;
    operationPending.current = true;
    // Reserve a blank tab during the explicit messenger tap, before awaiting
    // CRM. Never put contact details in its URL, and never hand off before save.
    let handoffWindow: Window | null = null;
    if (channel) {
      try {
        handoffWindow = window.open("about:blank", "_blank");
        pendingHandoff.current = handoffWindow;
        if (handoffWindow) handoffWindow.opener = null;
      } catch { /* The saved receipt still shows manually tappable links. */ }
    }
    setLocked(true);
    onSubmissionLockChange?.(true, panelId);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/service-enquiries", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: attempt.body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.saved !== true || typeof data.referenceCode !== "string" || !/^HH-[A-F0-9]{12}$/.test(data.referenceCode)) {
        throw new Error(data.error || "NOT_SAVED");
      }
      if (!mounted.current || contextRevision.current !== submittedRevision || activeContext.current !== attempt.context || operation.current !== attempt) {
        try { handoffWindow?.close(); } catch { /* Stale results cannot navigate. */ }
        return;
      }
      operation.current = { ...attempt, confirmed: true };
      setLocked(false);
      onSubmissionLockChange?.(false, panelId);
      setSaved({ saved: true, referenceCode: data.referenceCode, whatsappUrl: attempt.whatsappUrl });
      // Only a confirmed server/CRM write creates a receipt. No personal data
      // or sensitive answers are placed in browser storage or the URL.
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY, JSON.stringify({
          referenceCode: data.referenceCode, createdAt: Date.now(),
        }));
        if (!stayAfterSave && !compactPhone) router.push("/" + locale + "/thank-you");
      } catch {
        // Private browsing may block sessionStorage. The existing in-place
        // confirmation and optional messenger handoff remain available.
      }
      if (channel) {
        const draftUrl = new URL(attempt.whatsappUrl);
        draftUrl.searchParams.set("text",
          (draftUrl.searchParams.get("text") || "") + "\n\n" + c.reference + ": " + data.referenceCode,
        );
        const destination = channel === "whatsapp"
          ? draftUrl.toString()
          : telegramEnquiryUrlFromWhatsApp(draftUrl.toString());
        try {
          if (!handoffWindow || handoffWindow.closed) throw new Error("HANDOFF_BLOCKED");
          handoffWindow.location.replace(destination);
          // This is now the visitor's chat, not a pending window to close.
          pendingHandoff.current = null;
        } catch {
          try { handoffWindow?.close(); } catch { /* No effect on the saved request. */ }
          setError(c.compactHandoff);
          return;
        }
        // Optional notification/analytics must never turn a saved receipt into
        // an unknown outcome or close an already-opened messenger.
        try { onChannelClick?.(channel); } catch { /* The request is already saved. */ }
        try { if (analyticsEvent) emitPublicAnalyticsEvent(analyticsEvent); } catch { /* Best effort only. */ }
      }
    } catch {
      try { handoffWindow?.close(); } catch { /* Never hand off an unsaved request. */ }
      if (mounted.current && contextRevision.current === submittedRevision && activeContext.current === attempt.context) setError(c.error);
    } finally {
      if (pendingHandoff.current === handoffWindow) pendingHandoff.current = null;
      operationPending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  let preparedWhatsApp = referredWhatsappUrl;
  if (saved) {
    const draftUrl = new URL(saved.whatsappUrl);
    draftUrl.searchParams.set("text",
      (draftUrl.searchParams.get("text") || "") + "\n\n" + c.reference + ": " + saved.referenceCode,
    );
    preparedWhatsApp = draftUrl.toString();
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
                disabled={locked || busy || googleBusy} required onChange={value => {
                  setPhone(value); setError("");
                }} />
            </div>
            <label className={styles.compactConsent}>
              <input type="checkbox" checked={consent} required disabled={locked || busy || googleBusy}
                onPointerDown={event => {
                  if (event.defaultPrevented || !event.isPrimary || event.button !== 0 || event.currentTarget.disabled) return;
                  event.currentTarget.focus({ preventScroll: true });
                }}
                onChange={event => { setConsent(event.target.checked); setError(""); }} />
              <span>{c.compactConsent}</span>
            </label>
            <label className={styles.honeypot} aria-hidden="true">
              Website <input type="text" tabIndex={-1} autoComplete="off"
                disabled={locked || busy || googleBusy} value={website} onChange={event => setWebsite(event.target.value)} />
            </label>
            <div className={styles.compactChannels} role="group" aria-label={c.messengers}>
              <button type="button" className={styles.whatsapp} disabled={busy || googleBusy}
                aria-label={locked ? c.retry + ": WhatsApp" : "WhatsApp"}
                data-contact-channel-submit="whatsapp" onClick={() => { void saveEnquiry("whatsapp"); }}>
                <MessageCircle size={19} aria-hidden="true" />{busy ? c.sending : "WhatsApp"}
              </button>
              <button type="button" className={styles.telegram} disabled={busy || googleBusy}
                aria-label={locked ? c.retry + ": Telegram" : "Telegram"}
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
              disabled={locked || busy || googleBusy} aria-label={c.google}>
              <span className={styles.googleMark} aria-hidden="true">G</span>
              {googleBusy ? c.googleBusy : c.google}
            </button>}
            {googleReady && method === "email" && <p className={styles.googleReady} role="status">{quick ? c.quickReady : c.googleReady}</p>}
            {(!quick || !googleReady) && <p className={styles.separator}><span>{c.divider}</span></p>}
            {!quick && <div className={styles.methodChoices} role="group" aria-label={c.replyVia}>
              <button type="button" aria-pressed={method === "email"} disabled={locked || busy || googleBusy}
                onClick={() => { setMethod("email"); setError(""); }}>
                {c.email}
              </button>
              <button type="button" aria-pressed={method === "phone"} disabled={locked || busy || googleBusy}
                onClick={() => { setMethod("phone"); setError(""); }}>
                {c.phone}
              </button>
            </div>}
            <div className={styles.contactFields}>
              {method === "email" ? (
                <label>{c.email}
                  <input type="email" autoComplete="email" maxLength={254} required disabled={locked || busy || googleBusy}
                    value={email} onChange={event => {
                      setEmail(event.target.value); setError("");
                    }} />
                </label>
              ) : (
                <div className={styles.phoneField}>
                  <label htmlFor={panelId + "-phone"}>{c.phone}</label>
                  <PhoneCountryInput id={panelId + "-phone"} locale={locale} required
                    disabled={locked || busy || googleBusy} value={phone} onChange={value => {
                      setPhone(value); setError("");
                    }} />
                </div>
              )}
            </div>
            {!quick && <><details className={styles.optionalName}>
              <summary>{c.nameOptional}</summary>
              <label>{c.name}
                <input type="text" autoComplete="name" minLength={2} maxLength={120}
                  disabled={locked || busy || googleBusy} value={displayName} onChange={event => {
                    setDisplayName(event.target.value); setError("");
                  }} />
              </label>
            </details>
            <small className={styles.privateNote}>{c.contactHelp}</small>
            <details className={styles.optionalNote}>
              <summary>{c.description}</summary>
              <textarea id={panelId + "-situation"} aria-label={c.description}
                maxLength={1400} rows={2}
                placeholder={c.placeholder} value={description} disabled={locked || busy}
                onChange={event => {
                  setDescription(event.target.value); setError("");
                }} />
              <small className={styles.privateNote}>{c.privateNote}</small>
            </details>
            </>}
            <label className={styles.consent}>
              <input type="checkbox" required checked={consent} disabled={locked || busy}
                onPointerDown={event => {
                  if (event.defaultPrevented || !event.isPrimary || event.button !== 0 || event.currentTarget.disabled) return;
                  // Keep the visible pointer target stable; native activation still owns consent.
                  event.currentTarget.focus({ preventScroll: true });
                }}
                onChange={event => { setConsent(event.target.checked); }} />
              <span>{c.consent}</span>
            </label>
            {quick && <button type="button" className={styles.quickSwitch} disabled={locked || busy || googleBusy}
              onClick={() => { setMethod(current => current === "email" ? "phone" : "email"); setError(""); }}>
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
              <Send size={17} aria-hidden="true" />{busy ? c.sending : locked ? c.retry : (quick ? c.quickSubmit : c.submit)}
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
              setPhone(""); setConsent(false); setWebsite(""); setError(""); operation.current = null;
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
