"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowRight, CheckCircle2, ChevronDown, ImagePlus, ShieldCheck } from "lucide-react";
import { PhoneCountryInput } from "@/components/phone-country-input";
import { EXPRESS_MAX_SOURCE_BYTES, prepareFreeExpressPhoto } from "@/lib/practitioners/free-express-photo-client";
import { COACHING_FIELDS, COACHING_GROUPS } from "@/lib/coaching/intake-model";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-express-wizard.module.css";

type Focus = "situation" | "energy";
type Kind = "portrait" | "drawing";
type MediaState = Record<Kind, boolean>;
type Receipt = { referenceCode: string; saved: true };
const RESUME = "hh-free-express-wizard-resume-v2";
const PENDING_GOOGLE_CLAIM = "hh-free-express-google-claim-v2";
const PHOTO_LIMIT = 2_750_000;
const fieldsShort = new Set(["request", "idealOutcome", "priorityQuestion"]);
const copy = {
  en: {
    title: "Your free personal review", stepOf: "Step", of: "of", steps: ["Contact", "Question", "Photo", "Save", "Drawing", "Ready"],
    contact: "How can Andrey reach you?", intro: "Start with a phone number and one short question. No Google account or payment needed.",
    name: "Your name (optional)", phone: "Phone number (with country code)",
    question: "What would you like to explore?", questionHint: "One or two sentences are enough. Please do not include test results or medical records.",
    consent: "I agree to save my contact and question securely for one personal reply from Andrey. No marketing.",
    request: "Submit my free request", saving: "Saving…", invalidPhone: "Enter an international phone number, e.g. +1 416 555 0123.",
    invalid: "Add a short question and agree to one personal reply.", error: "We could not confirm saving. Retry without changing your original request.",
    confirmed: "Thank you! Your request is registered", ref: "Enquiry", optional: "Everything below is optional; your request is already saved.",
    details: "Tell Andrey a little more", detailsHint: "Choose a short answer or the existing full coaching questionnaire. You can switch without losing answers.",
    short: "Short · 2 minutes", detailed: "Detailed · 5–10 minutes",
    detailsConsent: "I agree to share these additional answers securely with Andrey for this review. They are not sent to messengers.",
    detailsSave: "Save answers and continue", missing: "Please complete the required questions.",
    skip: "Skip for now", next: "Continue", back: "Back", busy: "Saving…",
    portrait: "Add your photo (optional)", portraitHint: "A personal photo can help Andrey get acquainted. No diagnosis or health assessment will be made from the picture.",
    drawing: "Draw: ME — MY GOAL — MY PROBLEM",
    drawingHint: "On paper, draw three elements: Me, My Goal and My Problem. Circles or symbols are enough; there is no correct position. Photograph the whole sheet and upload it for symbolic reflection.",
    camera: "Take a photo", library: "Choose from photos", imageConsent: "I agree to share this image privately with Andrey for my written review. It will not be published.",
    upload: "Upload privately", uploadError: "Secure upload was not confirmed. Try again or skip. Do not send images in a messenger.",
    uploaded: "Image saved privately", remove: "Remove image", mediaTooLarge: "Choose an image under 12 MB. Larger photos are resized privately on your device before upload.", preparationError: "This photo could not be prepared on your device. Try a JPG or a different photo. Your request is still saved.",
    google: "Keep a private copy with Google", googleHint: "Your request is already in our CRM. Google sign-in is optional and lets you link the same request to your Holistic House account.",
    googleConsent: "I want to link this request to my verified Google account. It does not create a new request.",
    googleAction: "Sign in / Save to my account", googleSaved: "Saved to your private account",
    googleError: "We could not link your account. Your original request is still registered.",
    noGoogle: "Continue without Google", done: "Your request is ready",
    doneHint: "Andrey can review your question and get back to you personally. This is a free written reflection, not a live appointment or medical diagnosis.",
    contactSaved: "Contact and request saved", detailsSaved: "Questionnaire saved", drawingSaved: "Drawing saved", waiting: "Optional — not provided",
    messenger: "Optional: send only the reference code", whatsapp: "WhatsApp", telegram: "Telegram",
    privacy: "Your question, photo and drawing stay in private storage. Do not send personal materials or health information through WhatsApp or Telegram. Images are scheduled for automatic deletion after about a month.",
    restored: "Your saved request has been restored.", timeout: "Your secure continuation expired. The original request remains received; contact Andrey using your reference.",
  },
  ru: {
    title: "Ваша бесплатная диагностика", stepOf: "Шаг", of: "из", steps: ["Контакт", "Запрос", "Фото", "Сохранить", "Рисунок", "Готово"],
    contact: "Как с вами связаться?", intro: "Оставьте телефон и кратко опишите вопрос. Регистрация Google и оплата не нужны.",
    name: "Как к вам обращаться? (необязательно)", phone: "Телефон с кодом страны",
    question: "В чём суть вашего вопроса?", questionHint: "Достаточно одного-двух предложений. Не прикладывайте анализы или результаты тестов.",
    consent: "Согласен(на) сохранить контакт и вопрос для одного личного ответа Андрея. Без рассылок.",
    request: "Оформить бесплатную заявку", saving: "Сохраняем…", invalidPhone: "Введите номер с кодом страны, например +1 416 555 0123.",
    invalid: "Кратко опишите вопрос и подтвердите согласие на один ответ.", error: "Не удалось подтвердить сохранение. Повторите без изменения исходной заявки.",
    confirmed: "Спасибо! Заявка зарегистрирована", ref: "Номер", optional: "Дальше всё по желанию: заявка уже сохранена.",
    details: "Уточним ваш запрос", detailsHint: "Выберите краткую форму или полную авторскую коучинг-анкету. При переключении ответы сохраняются на экране.",
    short: "Кратко · 2 минуты", detailed: "Подробно · 5–10 минут",
    detailsConsent: "Согласен(на) передать дополнительные ответы Андрею в защищённый кабинет. В мессенджеры они не отправляются.",
    detailsSave: "Сохранить ответы и продолжить", missing: "Ответьте на обязательные вопросы.",
    skip: "Пропустить", next: "Продолжить", back: "Назад", busy: "Сохраняем…",
    portrait: "Добавьте своё фото (необязательно)", portraitHint: "Фото поможет Андрею познакомиться с вами. По фотографии мы не определяем болезни или диагнозы.",
    drawing: "Нарисуйте: Я — ЦЕЛЬ — ПРОБЛЕМА",
    drawingHint: "На листе бумаги обозначьте три элемента: Я, Моя цель и Проблема. Подойдут круги или символы, правильного расположения нет. Сфотографируйте весь лист и загрузите его для символического разбора.",
    camera: "Сфотографировать", library: "Выбрать из галереи", imageConsent: "Согласен(на) передать это изображение только Андрею для письменного разбора. Публиковаться оно не будет.",
    upload: "Загрузить защищённо", uploadError: "Загрузка не подтверждена. Повторите или пропустите. Не отправляйте фото в мессенджер.",
    uploaded: "Изображение сохранено приватно", remove: "Удалить фото", mediaTooLarge: "Выберите фото до 12 МБ. Большие фотографии уменьшаются прямо на вашем устройстве до отправки.", preparationError: "Не удалось обработать это фото на телефоне. Выберите JPG или другое фото. Заявка уже сохранена.",
    google: "Сохраните заявку в кабинете через Google", googleHint: "Заявка уже зарегистрирована в CRM. При желании войдите через Google и привяжите её к личному кабинету Holistic House.",
    googleConsent: "Хочу привязать заявку к подтверждённому Google-аккаунту. Новая заявка не создаётся.",
    googleAction: "Войти через Google / сохранить", googleSaved: "Сохранено в личном кабинете",
    googleError: "Не удалось привязать кабинет. Исходная заявка остаётся зарегистрированной.",
    noGoogle: "Продолжить без Google", done: "Ваша заявка готова",
    doneHint: "Андрей ознакомится с вопросом и свяжется с вами лично. Это бесплатный письменный разбор, не запись на созвон и не медицинский диагноз.",
    contactSaved: "Контакт и заявка сохранены", detailsSaved: "Анкета сохранена", drawingSaved: "Рисунок сохранён", waiting: "Необязательно — не добавлено",
    messenger: "По желанию: отправить только номер заявки", whatsapp: "WhatsApp", telegram: "Telegram",
    privacy: "Вопрос, фото и рисунок доступны только в защищённом хранилище. Не отправляйте личные данные и информацию о здоровье в WhatsApp или Telegram. Автоматическое удаление фото запланировано примерно через месяц.",
    restored: "Ваша заявка восстановлена.", timeout: "Срок защищённого дополнения истёк. Исходная заявка получена; свяжитесь с Андреем, указав её номер.",
  },
  es: {
    title: "Tu revisión personal gratuita", stepOf: "Paso", of: "de", steps: ["Contacto", "Pregunta", "Foto", "Guardar", "Dibujo", "Listo"],
    contact: "¿Cómo puede contactarte Andrey?", intro: "Deja tu teléfono y una pregunta breve. No necesitas Google ni pagar.",
    name: "Tu nombre (opcional)", phone: "Teléfono con prefijo del país",
    question: "¿Cuál es tu consulta?", questionHint: "Bastan una o dos frases. No adjuntes resultados de pruebas ni documentos médicos.",
    consent: "Acepto guardar mi contacto y pregunta para una respuesta personal de Andrey. Sin publicidad.",
    request: "Enviar solicitud gratuita", saving: "Guardando…", invalidPhone: "Introduce tu número internacional, p. ej. +1 416 555 0123.",
    invalid: "Describe tu consulta brevemente y acepta una respuesta personal.", error: "No pudimos confirmar el guardado. Vuelve a intentar sin cambiar la solicitud.",
    confirmed: "¡Gracias! Solicitud registrada", ref: "Referencia", optional: "Los siguientes pasos son opcionales: tu solicitud ya está guardada.",
    details: "Describe mejor tu consulta", detailsHint: "Elige la versión breve o el cuestionario completo. Cambiar no borra tus respuestas.",
    short: "Breve · 2 minutos", detailed: "Detallado · 5–10 minutos",
    detailsConsent: "Acepto compartir estas respuestas con Andrey dentro del portal privado. No se envían por mensajería.",
    detailsSave: "Guardar respuestas y continuar", missing: "Completa las preguntas obligatorias.",
    skip: "Omitir", next: "Continuar", back: "Volver", busy: "Guardando…",
    portrait: "Añade tu foto (opcional)", portraitHint: "Tu foto ayuda a Andrey a conocerte; no se utilizará para diagnosticar problemas de salud.",
    drawing: "Dibuja: YO — MI META — MI PROBLEMA",
    drawingHint: "Dibuja tres elementos en papel: Yo, Mi Meta y Mi Problema. Sirven círculos y símbolos; no hay posiciones correctas. Haz una foto de la hoja completa y súbela para una reflexión simbólica.",
    camera: "Tomar foto", library: "Elegir foto", imageConsent: "Acepto compartir esta imagen en privado solo con Andrey para mi revisión escrita. No se publicará.",
    upload: "Subir de forma privada", uploadError: "No se confirmó la carga privada. Prueba de nuevo u omite el paso. No uses un mensajero.",
    uploaded: "Imagen guardada en privado", remove: "Eliminar foto", mediaTooLarge: "Elige una imagen de menos de 12 MB. Las fotos grandes se reducen en tu dispositivo antes de subirlas.", preparationError: "No pudimos preparar esta foto en tu dispositivo. Prueba con una imagen JPG diferente. Tu solicitud está guardada.",
    google: "Guarda una copia con Google", googleHint: "Tu solicitud ya está registrada. Puedes vincularla a tu cuenta de Holistic House con Google.",
    googleConsent: "Quiero vincular esta solicitud a mi cuenta verificada de Google. No se creará otra solicitud.",
    googleAction: "Iniciar sesión / Guardar", googleSaved: "Guardado en tu cuenta privada",
    googleError: "No se pudo vincular la cuenta. La solicitud original permanece guardada.",
    noGoogle: "Continuar sin Google", done: "Tu solicitud está lista",
    doneHint: "Andrey revisará tu consulta y podrá responderte personalmente. Es una revisión escrita simbólica, no una cita ni un diagnóstico médico.",
    contactSaved: "Contacto y solicitud guardados", detailsSaved: "Respuestas guardadas", drawingSaved: "Dibujo guardado", waiting: "Opcional — no enviado",
    messenger: "Opcional: envía solo la referencia", whatsapp: "WhatsApp", telegram: "Telegram",
    privacy: "Tu pregunta, foto y dibujo permanecen privados. No envíes datos personales ni de salud por WhatsApp o Telegram. Las imágenes se programan para su eliminación automática aproximadamente al mes.",
    restored: "Tu solicitud se ha recuperado.", timeout: "El período seguro para añadir datos caducó. La solicitud inicial permanece guardada.",
  },
} as const;

export function FreeExpressWizard({ locale, focus, serviceTitle, onSaved, onRestoredFocus }: {
  locale: PublicLocale; focus: Focus; serviceTitle: string; onSaved?: () => void;
  onRestoredFocus?: (nextFocus: Focus) => void;
}) {
  const t = copy[locale];
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [replyConsent, setReplyConsent] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"short" | "detailed">("short");
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({ focus: true });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [detailsConsent, setDetailsConsent] = useState(false);
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [media, setMedia] = useState<MediaState>({ portrait: false, drawing: false });
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [imageConsent, setImageConsent] = useState(false);
  const [googleConsent, setGoogleConsent] = useState(false);
  const [googleSaved, setGoogleSaved] = useState(false);
  const operation = useRef<string | null>(null);
  const pending = useRef<object | null>(null);
  const attempted = useRef(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected || selected.size > PHOTO_LIMIT) { setPreview(""); return; }
    // Public landing CSP permits data: images, not blob: images. Read a small
    // local preview without uploading or widening CSP for other visitors.
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") setPreview(reader.result); };
    reader.onerror = () => setPreview("");
    reader.readAsDataURL(selected);
    return () => { if (reader.readyState === FileReader.LOADING) reader.abort(); };
  }, [selected]);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    let prior: { locale?: string; referenceCode?: string } | null = null;
    try { prior = JSON.parse(window.sessionStorage.getItem(RESUME) || "null"); }
    catch { /* A missing session marker never initiates an enquiry. */ }
    const resume = prior?.locale === locale
      && /^HH-[A-F0-9]{12}$/.test(prior.referenceCode || "");
    // An OAuth marker is not sufficient: the browser must have our specific
    // prior receipt too, otherwise another Google enquiry could be claimed.
    const isGoogleReturn = resume && new URLSearchParams(window.location.search).get("hh_enquiry") === "google";
    if (!resume) return;
    void (async () => {
      try {
        const res = await fetch("/api/free-express", { credentials: "same-origin", cache: "no-store" });
        if (!res.ok) { if (res.status === 401 || res.status === 409) setError(t.timeout); return; }
        const data = await res.json();
        if (!data.saved || data.referenceCode !== prior?.referenceCode) {
          setError(t.timeout);
          return;
        }
        setReceipt({ saved: true, referenceCode: data.referenceCode });
        setDetailsSaved(data.contextSaved === true);
        if (data.focus === 'situation' || data.focus === 'energy') onRestoredFocus?.(data.focus);
        onSaved?.();
        const status = await fetch("/api/free-express/media", { credentials: "same-origin", cache: "no-store" });
        if (status.ok) {
          const flags = await status.json();
          setMedia({ portrait: flags.portrait === true, drawing: flags.drawing === true });
        }
        setStep(isGoogleReturn ? 3 : data.contextSaved ? 3 : 1);
        setError(t.restored);
        if (isGoogleReturn) {
          // The user explicitly ticked consent and pressed Google save before
          // OAuth. Match this tab's short-lived intent to the verified receipt,
          // then complete the account link once. A URL marker alone is never consent.
          let pendingClaim: { locale?: string; referenceCode?: string; createdAt?: number } | null = null;
          try { pendingClaim = JSON.parse(window.sessionStorage.getItem(PENDING_GOOGLE_CLAIM) || "null"); }
          catch { /* Invalid tab state cannot authorize a claim. */ }
          const marker = new URL(window.location.href);
          const oauthFailed = marker.searchParams.has("auth");
          marker.searchParams.delete("hh_enquiry");
          marker.searchParams.delete("auth");
          window.history.replaceState(window.history.state, "", marker.pathname + marker.search + marker.hash);
          const canClaim = !oauthFailed
            && pendingClaim?.locale === locale
            && pendingClaim.referenceCode === data.referenceCode
            && Number.isSafeInteger(pendingClaim.createdAt)
            && Date.now() >= Number(pendingClaim.createdAt)
            && Date.now() - Number(pendingClaim.createdAt) < 10 * 60_000;
          if (canClaim) {
            try {
              const claimResponse = await fetch("/api/free-express/claim", {
                method: "POST", credentials: "same-origin", cache: "no-store",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consent: true, referenceCode: data.referenceCode }),
              });
              const claim = await claimResponse.json().catch(() => null);
              if (!claimResponse.ok || claim?.saved !== true
                || claim.referenceCode !== data.referenceCode) throw new Error("CLAIM_NOT_CONFIRMED");
              setGoogleSaved(true);
              setStep(data.focus === "energy" ? 5 : 4);
              setError("");
              window.sessionStorage.removeItem(PENDING_GOOGLE_CLAIM);
            } catch { setError(t.googleError); }
          } else if (oauthFailed) {
            setError(t.googleError);
            try { window.sessionStorage.removeItem(PENDING_GOOGLE_CLAIM); } catch {}
          }
        }
      } catch { /* The original server receipt, not browser state, is authoritative. */ }
    })();
  }, [locale, onSaved, onRestoredFocus, t.restored, t.googleError]);

  function remember(referenceCode: string) {
    try { window.sessionStorage.setItem(RESUME, JSON.stringify({ locale, referenceCode })); }
    catch { /* A blocked browser store never invalidates a committed lead. */ }
  }

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || receipt) return;
    const cleanPhone = phone.replace(/[\s().-]/g, "");
    if (!/^\+[1-9][0-9]{7,14}$/.test(cleanPhone)) { setError(t.invalidPhone); return; }
    if (!replyConsent || question.trim().length < 4) { setError(t.invalid); return; }
    if (!pending.current) {
      operation.current = crypto.randomUUID();
      pending.current = {
        operationId: operation.current, locale, serviceTitle,
        sourcePath: "/" + locale + "/services/free-situation-review",
        description: "Request category: " + (focus === "situation" ? "situation" : "energy-and-wellbeing")
          + "\nInitial question: " + question.trim().slice(0, 400),
        contact: { displayName: name.trim(), email: "", phone: cleanPhone },
        contactConsent: true, website: "",
      };
    }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/service-enquiries", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending.current),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.saved !== true || !/^HH-[A-F0-9]{12}$/.test(data.referenceCode || ""))
        throw new Error("NOT_COMMITTED");
      setReceipt({ saved: true, referenceCode: data.referenceCode });
      setStep(1); onSaved?.(); remember(data.referenceCode);
      pending.current = null;
      try { window.sessionStorage.setItem(RECEIPT_SESSION_KEY, JSON.stringify({
        referenceCode: data.referenceCode, createdAt: Date.now(),
      })); } catch { /* Receipt is visible on screen. */ }
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detailsConsent) { setError(t.missing); return; }
    const required = mode === "short"
      ? ["request", "idealOutcome"]
      : COACHING_FIELDS.filter(field => field.required).map(field => field.id);
    const missing = required.find(key => (answers[key] || "").trim().length < 4);
    if (missing) {
      const field = COACHING_FIELDS.find(item => item.id === missing);
      if (mode === "detailed" && field)
        setGroupsOpen(previous => ({ ...previous, [field.group]: true }));
      setError(t.missing);
      requestAnimationFrame(() => document.getElementById("hh-express-field-" + missing)?.focus());
      return;
    }
    setBusy(true); setError("");
    try {
      const activeAnswers = Object.fromEntries(
        Object.entries(answers).filter(([key]) => mode === "detailed" || fieldsShort.has(key)),
      );
      const res = await fetch("/api/free-express", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, answers: activeAnswers, consent: true, referenceCode: receipt?.referenceCode }),
      });
      if (!res.ok || (await res.json()).saved !== true) throw new Error("DETAILS_NOT_SAVED");
      setDetailsSaved(true); setStep(2);
    } catch { setError(t.error); }
    finally { setBusy(false); }
  }

  function nextAfterGoogle() { setStep(focus === "situation" ? 4 : 5); setError(""); }

  async function upload(kind: Kind) {
    if (!selected || busy) return;
    if (selected.size > EXPRESS_MAX_SOURCE_BYTES) { setError(t.mediaTooLarge); return; }
    if (!imageConsent) { setError(t.imageConsent); return; }
    setBusy(true); setError("");
    try {
      const form = new FormData();
      form.set("kind", kind); form.set("photo", await prepareFreeExpressPhoto(selected)); form.set("consent", "yes");
      form.set("referenceCode", receipt?.referenceCode || "");
      const res = await fetch("/api/free-express/media", {
        method: "POST", credentials: "same-origin", body: form,
      });
      if (!res.ok || (await res.json()).uploaded !== true) throw new Error("PHOTO_NOT_SAVED");
      setMedia(old => ({ ...old, [kind]: true }));
      setSelected(null); setImageConsent(false);
      setStep(kind === "portrait" ? 3 : 5);
    } catch (failure) {
      setError(failure instanceof Error && failure.message.startsWith("PHOTO_") ? t.preparationError : t.uploadError);
    }
    finally { setBusy(false); }
  }

  async function remove(kind: Kind) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/free-express/media", {
        method: "DELETE", credentials: "same-origin",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, referenceCode: receipt?.referenceCode }),
      });
      if (!res.ok) throw new Error("REMOVE_UNCONFIRMED");
      setMedia(old => ({ ...old, [kind]: false }));
    } catch { setError(t.uploadError); }
    finally { setBusy(false); }
  }

  async function saveWithGoogle() {
    if (!googleConsent || busy) { setError(t.googleError); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/free-express/claim", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consent: true, referenceCode: receipt?.referenceCode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.saved !== true || data.referenceCode !== receipt?.referenceCode) throw new Error("CLAIM_FAILED");
        setGoogleSaved(true);
        try { window.sessionStorage.removeItem(PENDING_GOOGLE_CLAIM); } catch {}
        nextAfterGoogle();
        return;
      }
      if (res.status !== 401) throw new Error("CLAIM_FAILED");
      const auth = await fetch("/api/app/auth/start", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, continueTo: "enquiry", returnPath: "/" + locale + "/services/free-situation-review" }),
      });
      const value = await auth.json().catch(() => null);
      if (!auth.ok || typeof value?.redirectUrl !== "string" || !value.redirectUrl.startsWith("https://"))
        throw new Error("GOOGLE_UNAVAILABLE");
      remember(receipt?.referenceCode || "");
      try {
        window.sessionStorage.setItem(PENDING_GOOGLE_CLAIM,
          JSON.stringify({ locale, referenceCode: receipt?.referenceCode, createdAt: Date.now() }));
      } catch { /* The client can confirm manually after OAuth if storage is unavailable. */ }
      window.location.assign(value.redirectUrl);
    } catch { setError(t.googleError); }
    finally { setBusy(false); }
  }

  const renderCoachingField = (field: (typeof COACHING_FIELDS)[number], index: number) => (
    <label key={field.id} className={styles.answer}>
      <span>{index + 1}. {field.label[locale]}
        {(mode === "detailed" ? field.required : field.id !== "priorityQuestion") ? " *" : ""}</span>
      <textarea id={"hh-express-field-" + field.id} rows={2} maxLength={field.max}
        aria-required={mode === "detailed" ? field.required : field.id !== "priorityQuestion"}
        disabled={busy} value={answers[field.id] || ""}
        onChange={event => setAnswers(current => ({ ...current, [field.id]: event.target.value }))} />
    </label>
  );

  const activeMedia: Kind = step === 4 ? "drawing" : "portrait";
  // Energy/wellbeing requests do not need the symbolic drawing. They have a
  // real five-step journey, not an invisible sixth step marked "complete".
  const shownSteps = focus === "situation" ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 5];
  const visibleStepNumber = Math.max(1, shownSteps.indexOf(step) + 1);
  const whatsapp = receipt ? whatsappEnquiryUrl({
    locale, service: serviceTitle,
    request: "My free written review request is registered. " + t.ref + ": " + receipt.referenceCode,
    pagePath: "/" + locale + "/services/free-situation-review",
  }) : "";

  return <section className={styles.root} data-free-express-wizard aria-label={t.title} lang={locale}>
    <div className={styles.progressWrap}>
      <p className={styles.currentStep} role="status">{t.stepOf} {visibleStepNumber} {t.of} {shownSteps.length} <strong>{t.steps[step]}</strong></p>
      <div className={styles.progress} aria-label={t.title}
        style={{ gridTemplateColumns: `repeat(${shownSteps.length}, minmax(0, 1fr))` }}>
        {shownSteps.map((i, index) => <span key={t.steps[i]} aria-current={i === step ? "step" : undefined}
          data-active={i === step ? "true" : "false"} data-done={i < step ? "true" : "false"}>{index + 1}<small>{t.steps[i]}</small></span>)}
      </div>
    </div>

    {receipt && <div className={styles.receipt} role="status" data-free-express-receipt>
      <CheckCircle2 size={22} aria-hidden="true" /><div><strong>{t.confirmed}</strong><p>{t.ref}: {receipt.referenceCode}</p><small>{t.optional}</small></div>
    </div>}

    {step === 0 && <form className={styles.form} onSubmit={event => { void register(event); }} data-free-express-lead>
      <h3>{t.contact}</h3><p>{t.intro}</p>
      <details className={styles.optionalName}>
        <summary>{t.name}</summary>
        <label><input aria-label={t.name} autoComplete="name" value={name} maxLength={120}
          disabled={busy || !!pending.current} onChange={event => setName(event.target.value)} /></label>
      </details>
      <div className={styles.phone}><span>{t.phone}</span>
        <PhoneCountryInput locale={locale} value={phone} disabled={busy || !!pending.current} required
          onChange={value => { setPhone(value); setError(""); }} /></div>
      <label>{t.question}<textarea rows={2} maxLength={400} value={question}
        placeholder={t.questionHint} disabled={busy || !!pending.current}
        onChange={event => { setQuestion(event.target.value); setError(""); }} /></label>
      <label className={styles.consent}><input type="checkbox" checked={replyConsent} disabled={busy || !!pending.current}
        onChange={event => setReplyConsent(event.target.checked)} /><span>{t.consent}</span></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.primary} type="submit" disabled={busy}><ArrowRight size={18} />{busy ? t.saving : t.request}</button>
    </form>}

    {step === 1 && <form className={styles.form} onSubmit={event => { void saveDetails(event); }} data-free-express-questions>
      <h3>{t.details}</h3><p>{t.detailsHint}</p>
      <div className={styles.tabs} role="group" aria-label={t.details}>
        <button type="button" aria-pressed={mode === "short"} disabled={busy}
          onClick={() => { setMode("short"); setError(""); }}>{t.short}</button>
        <button type="button" aria-pressed={mode === "detailed"} disabled={busy}
          onClick={() => { setMode("detailed"); setError(""); }}>{t.detailed}</button>
      </div>
      {mode === "short"
        ? COACHING_FIELDS.filter(field => fieldsShort.has(field.id)).map(renderCoachingField)
        : COACHING_GROUPS.map((group, groupIndex) => (
          <details key={group.id} className={styles.questionGroup}
            open={groupsOpen[group.id] ?? (groupIndex === 0)}
            onToggle={event => {
              const opened = event.currentTarget.open;
              setGroupsOpen(previous => previous[group.id] === opened ? previous : {
                ...previous, [group.id]: opened,
              });
            }}>
            <summary><span><strong>{group.title[locale]}</strong><small>{group.hint[locale]}</small></span>
              <ChevronDown aria-hidden="true" size={19} /></summary>
            <div className={styles.questionGroupFields}>
              {COACHING_FIELDS.filter(field => field.group === group.id).map(field =>
                renderCoachingField(field, COACHING_FIELDS.indexOf(field)))}
            </div>
          </details>
        ))}
      <label className={styles.consent}><input type="checkbox" checked={detailsConsent} disabled={busy}
        onChange={event => setDetailsConsent(event.target.checked)} /><span>{t.detailsConsent}</span></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.actions}><button className={styles.primary} type="submit" disabled={busy}>{busy ? t.busy : t.detailsSave}</button>
        <button className={styles.secondary} type="button" disabled={busy} onClick={() => { setStep(2); setError(""); }}>{t.skip}</button></div>
    </form>}

    {(step === 2 || step === 4) && <div className={styles.form} data-free-express-media={activeMedia}>
      <h3>{step === 4 ? t.drawing : t.portrait}</h3>
      <p>{step === 4 ? t.drawingHint : t.portraitHint}</p>
      {step === 4 && <div className={styles.sketch} aria-hidden="true">
        <span>① {locale === "ru" ? "Я" : locale === "es" ? "YO" : "ME"}</span>
        <span>② {locale === "ru" ? "Цель" : locale === "es" ? "Meta" : "Goal"}</span>
        <span>③ {locale === "ru" ? "Проблема" : locale === "es" ? "Problema" : "Problem"}</span>
      </div>}
      {media[activeMedia] ? <div className={styles.savedMedia}><CheckCircle2 size={18} />{t.uploaded}
        <button type="button" disabled={busy} onClick={() => { void remove(activeMedia); }}>{t.remove}</button></div> : <>
        <div className={styles.photoActions}>
          <button type="button" className={styles.secondary} onClick={() => cameraInput.current?.click()}><ImagePlus size={17} />{t.camera}</button>
          <button type="button" className={styles.secondary} onClick={() => photoInput.current?.click()}><ImagePlus size={17} />{t.library}</button>
          <input ref={cameraInput} className={styles.hiddenFile} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture={step === 2 ? "user" : "environment"} onChange={event => { setSelected(event.target.files?.[0] || null); setError(""); }} />
          <input ref={photoInput} className={styles.hiddenFile} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={event => { setSelected(event.target.files?.[0] || null); setError(""); }} />
        </div>
        {preview && <Image src={preview} unoptimized alt="" width={280} height={240} className={styles.preview} />}
        <label className={styles.consent}><input type="checkbox" checked={imageConsent} disabled={busy}
          onChange={event => setImageConsent(event.target.checked)} /><span>{t.imageConsent}</span></label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button type="button" className={styles.primary} disabled={!selected || !imageConsent || busy}
          onClick={() => { void upload(activeMedia); }}>{busy ? t.busy : t.upload}</button>
      </>}
      <button className={styles.secondary} type="button" disabled={busy}
        onClick={() => { setSelected(null); setImageConsent(false); setStep(step === 2 ? 3 : 5); setError(""); }}>{t.skip}</button>
    </div>}

    {step === 3 && <div className={styles.form} data-free-express-google>
      <h3>{t.google}</h3><p>{t.googleHint}</p>
      {googleSaved && <p role="status" className={styles.success}>{t.googleSaved}</p>}
      <label className={styles.consent}><input type="checkbox" checked={googleConsent} disabled={busy}
        onChange={event => setGoogleConsent(event.target.checked)} /><span>{t.googleConsent}</span></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="button" className={styles.primary} disabled={busy || !googleConsent}
        onClick={() => { void saveWithGoogle(); }}>{busy ? t.busy : t.googleAction}</button>
      <button type="button" className={styles.secondary} disabled={busy} onClick={nextAfterGoogle}>{t.noGoogle}</button>
    </div>}

    {step === 5 && <div className={styles.form} data-free-express-complete>
      <h3><CheckCircle2 size={24} />{t.done}</h3><p>{t.doneHint}</p>
      <div className={styles.summary}>
        <p><CheckCircle2 size={17} />{t.contactSaved}</p>
        <p>{detailsSaved ? "✓ " + t.detailsSaved : "○ " + t.waiting}</p>
        <p>{googleSaved ? "✓ " + t.googleSaved : "○ " + t.waiting}</p>
        {focus === "situation" && <p>{media.drawing ? "✓ " + t.drawingSaved : "○ " + t.waiting}</p>}
      </div>
      <p className={styles.help}>{t.messenger}</p>
      <div className={styles.actions}>
        <a className={styles.secondary} href={whatsapp} target="_blank" rel="noopener noreferrer">{t.whatsapp}</a>
        <a className={styles.secondary} href={telegramEnquiryUrlFromWhatsApp(whatsapp)} target="_blank" rel="noopener noreferrer">{t.telegram}</a>
      </div>
    </div>}
    {receipt && <p className={styles.private}><ShieldCheck size={15} aria-hidden="true" />{t.privacy}</p>}
  </section>;
}
