"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ClipboardCopy, LockKeyhole, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { appFetch } from "@/lib/app/client-fetch";
import { COACHING_FIELDS, COACHING_GROUPS, COACHING_INTAKE_VERSION, COACHING_TOPICS, coachingIntakeEntryTopic } from "@/lib/coaching/intake-model";
import { DIAGNOSTIC_START_KEY, parseDiagnosticStart } from "@/lib/coaching/diagnostic-enquiry.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./coaching-intake-form.module.css";

type Draft = {
  topic: string;
  name: string;
  city: string;
  answers: Record<string, string>;
  questions: string[];
  status: "draft" | "complete";
};
type Saved = { accountId: string; revision: number; intake: Draft | null; updatedAt: string | null };
const key = "hh-coaching-intake-oauth-v1";
const blank = (): Draft => ({ topic: "personal", name: "", city: "", answers: {}, questions: [""], status: "draft" });

const copy = {
  en: {
    sendEyebrow: "FINAL STEP · SEND YOUR REQUEST",
    sendTitle: "Send your questionnaire",
    sendPaidTitle: "Request a personal coaching session",
    sendLead: "Choose the format below. Your answers reach Andrey only after you press Send.",
    sendOption: "Response format",
    moreQuestions: "Add details · {n} optional questions",
    lessQuestions: "Hide optional questions",
    phoneInstead: "Prefer to leave a phone number?",
    sendFree: "Free · €0",
    sendShort: "30 min · €50",
    sendFull: "60 min · €100",
    sendEmail: "Email for reply",
    sendPhone: "Phone",
    sendConsent: "I agree to share these answers and my contact with Andrey for one personal reply. No marketing.",
    sendButton: "Send answers",
    sendError: "Complete the three essential questions, provide an email or phone, and agree to send your answers.",
    sendFailure: "Your request could not be confirmed. Please retry; your answers are still here.",
    sendSuccess: "Your questionnaire and contact were received. Reference:",
    sendUpgrade: "Would you prefer a live consultation? Request 30 minutes (€50) or 60 minutes (€100).",
    sendNext: "Your request will be reviewed personally. This is not a confirmed booking or payment.",
    saveOptional: "OPTIONAL · KEEP A PRIVATE COPY",
    eyebrow: "AUTHOR'S COACHING QUESTIONNAIRE · HOLISTIC HOUSE",
    title: "Your coaching questions",
    lead: "One question per line. Answer at your own pace.",
    labelTopic: "What is your request about?",
    yourName: "How should we address you? (optional)",
    location: "City and country (optional)",
    addQuestion: "Add another question", ownQuestions: "What would you like to ask the coach?",
    ownHint: "List concrete questions you want to discuss. Choose ONE priority question in the field above.",
    questionPlaceholder: "Write your question here",
    optional: "Optional", required: "Essential to complete", requiredLegend: "* Essential; all other answers are optional.", answerPlaceholder: "Your answer…", note: "These are open coaching reflections, not a scored psychological test.",
    signedOut: "Fill it out without signing in. Google is only needed to save privately.",
    signedIn: "Private questionnaire · visible only to you.",
    login: "Sign in to save privately", signInError: "Google sign-in is currently unavailable. You can still copy your answers.",
    loading: "Checking your private account…", unavailable: "Private saving is unavailable. You can keep filling in and copy your answers.",
    consent: "Save my coaching answers encrypted in my Holistic House account. They are not sent to a coach, messenger or CRM.",
    temporary: "If you sign in, a temporary copy stays in this browser tab during Google login (up to 15 minutes).",
    draft: "Save private draft", complete: "Complete my questionnaire",
    needsRequired: "Complete the three essential questions: your request, desired outcome and one priority question.",
    saved: "Private draft saved. Your coach has not received it.",
    completed: "Your questionnaire is saved as complete — it has not been sent to a coach.",
    saveError: "Could not save your answers. Please retry or copy them.",
    conflict: "This questionnaire changed in another tab. Reload your saved version before editing.",
    copy: "Copy for personal use", copied: "Copied for personal use. Keep private materials in your Cabinet.",
    copyFailed: "Automatic copying was blocked. Select the text below and copy it manually.",
    preview: "Your personal copy", questions: "Questions for the coach",
    downloaded: "Export answers", downloadName: "my-coaching-questions.txt",
    delete: "Delete saved questionnaire", deleteConfirm: "Delete your saved coaching answers permanently from your account?",
    deleted: "Saved questionnaire deleted.", deleteError: "Could not delete. Please try again.",
    unsaved: "Not saved yet", upToDate: "All changes saved", dirty: "You have changes not yet saved.",
    saveRequired: "Sign in before using private save. Copying remains available without an account.",
    returnToServices: "Explore sessions", contact: "Contact Holistic House",
    contactNote: "Copying does not submit a request or book a session. Do not send answers, drawings or test results through messengers or email. Use Contact only to agree a secure handoff, without private materials.",
    chooseSaved: "Load my saved version", chooseLocal: "Keep answers from before sign-in",
    accountConflict: "You already have a saved questionnaire. Choose which version to work with; nothing is overwritten automatically.",
    privacy: "Your draft is visible only to you until you deliberately copy or share it. Do not include medical emergencies here; seek qualified urgent help instead.",
  },
  ru: {
    sendEyebrow: "ЗАВЕРШЕНИЕ · ОТПРАВКА ЗАЯВКИ",
    sendTitle: "Отправить анкету",
    sendPaidTitle: "Записаться на личную коучинговую сессию",
    sendLead: "Выберите формат. Андрей получит ответы только после отправки.",
    sendOption: "Формат ответа",
    moreQuestions: "Добавить подробности · ещё {n} вопросов",
    lessQuestions: "Скрыть дополнительные вопросы",
    phoneInstead: "Оставить телефон вместо email",
    sendFree: "Бесплатно · €0",
    sendShort: "30 мин · €50",
    sendFull: "60 мин · €100",
    sendEmail: "Email для ответа",
    sendPhone: "Телефон",
    sendConsent: "Согласен(на) передать ответы и контакт Андрею для одного личного ответа. Без рассылок.",
    sendButton: "Отправить ответы",
    sendError: "Ответьте на три основных вопроса, укажите email или телефон и подтвердите согласие на отправку.",
    sendFailure: "Не удалось подтвердить получение заявки. Попробуйте повторить: ответы сохранились на экране.",
    sendSuccess: "Ваша анкета и контакт получены. Номер заявки:",
    sendUpgrade: "Хотите обсудить вопрос лично? Запросите 30 минут (€50) или 60 минут (€100).",
    sendNext: "Андрей ответит лично. Запись и оплата пока не подтверждены.",
    saveOptional: "ДОПОЛНИТЕЛЬНО · ПРИВАТНАЯ КОПИЯ",
    eyebrow: "АВТОРСКАЯ КОУЧИНГ-АНКЕТА · HOLISTIC HOUSE",
    title: "Вопросы и ответы",
    lead: "Один пункт — один вопрос. Отвечайте в своём темпе.",
    labelTopic: "К какой теме относится ваш запрос?",
    yourName: "Как к вам обращаться? (необязательно)",
    location: "Город и страна (необязательно)",
    addQuestion: "Добавить вопрос", ownQuestions: "Что вы хотели бы спросить у коуча?",
    ownHint: "Перечислите конкретные вопросы. ОДИН самый важный укажите в отдельном поле выше.",
    questionPlaceholder: "Напишите свой вопрос",
    optional: "Необязательно", required: "Нужно для завершения", requiredLegend: "* Обязательные вопросы; остальные по желанию.", answerPlaceholder: "Ваш ответ…", note: "Это коучинговая рефлексия, а не психологический тест с баллами.",
    signedOut: "Заполняйте без входа. Google нужен только для приватного сохранения.",
    signedIn: "Приватная анкета · ответы видны только вам.",
    login: "Войти и сохранить приватно", signInError: "Вход через Google пока недоступен. Вы можете скопировать ответы.",
    loading: "Проверяем ваш личный кабинет…", unavailable: "Приватное сохранение недоступно. Можно заполнить анкету и скопировать ответы.",
    consent: "Сохранить ответы в зашифрованном виде в моём кабинете Holistic House. Коучу, в мессенджер и CRM они не отправляются.",
    temporary: "При входе через Google временная копия сохраняется только в этой вкладке браузера (до 15 минут).",
    draft: "Сохранить черновик", complete: "Завершить мою анкету",
    needsRequired: "Заполните три основных вопроса: ваш запрос, желаемый результат и один главный вопрос.",
    saved: "Черновик сохранён приватно. Коучу он не отправлен.",
    completed: "Анкета завершена и сохранена. Коучу она ещё не отправлена.",
    saveError: "Не удалось сохранить ответы. Повторите попытку или скопируйте их.",
    conflict: "Анкета изменилась в другой вкладке. Загрузите сохранённую версию перед изменениями.",
    copy: "Личная копия ответов", copied: "Создана личная копия. Храните частные материалы в кабинете.",
    copyFailed: "Браузер запретил автоматическое копирование. Скопируйте текст ниже вручную.",
    preview: "Ваша личная копия", questions: "Вопросы коучу",
    downloaded: "Экспортировать ответы", downloadName: "moya-coaching-anketa.txt",
    delete: "Удалить сохранённую анкету", deleteConfirm: "Безвозвратно удалить ваши сохранённые ответы из кабинета?",
    deleted: "Сохранённая анкета удалена.", deleteError: "Не удалось удалить. Повторите попытку.",
    unsaved: "Пока не сохранено", upToDate: "Все изменения сохранены", dirty: "Есть несохранённые изменения.",
    saveRequired: "Для приватного сохранения войдите в аккаунт. Без входа можно скопировать ответы.",
    returnToServices: "Посмотреть сессии", contact: "Написать в Holistic House",
    contactNote: "Копирование не отправляет заявку и не бронирует сессию. Не отправляйте ответы, рисунки и результаты тестов через мессенджеры или email. Через «Контакты» согласуйте защищённую передачу без частных материалов.",
    chooseSaved: "Загрузить из кабинета", chooseLocal: "Оставить ответы до входа",
    accountConflict: "В кабинете уже есть анкета. Выберите версию, с которой продолжите; автоматически ничего не перезапишется.",
    privacy: "Черновик видите только вы, пока сами не решите им поделиться. При неотложных состояниях обращайтесь за квалифицированной помощью.",
  },
  es: {
    sendEyebrow: "ÚLTIMO PASO · ENVÍA TU SOLICITUD",
    sendTitle: "Enviar tu cuestionario",
    sendPaidTitle: "Solicitar una sesión personal de coaching",
    sendLead: "Elige el formato. Andrey recibirá tus respuestas solo cuando pulses Enviar.",
    sendOption: "Formato de respuesta",
    moreQuestions: "Añadir detalles · {n} preguntas opcionales",
    lessQuestions: "Ocultar preguntas opcionales",
    phoneInstead: "¿Prefieres dejar tu teléfono?",
    sendFree: "Gratis · €0",
    sendShort: "30 min · €50",
    sendFull: "60 min · €100",
    sendEmail: "Email para responder",
    sendPhone: "Teléfono",
    sendConsent: "Acepto enviar estas respuestas y mi contacto a Andrey para una respuesta personal. Sin publicidad.",
    sendButton: "Enviar respuestas",
    sendError: "Completa las tres preguntas esenciales, indica email o teléfono y acepta enviar tus respuestas.",
    sendFailure: "No se pudo confirmar el envío. Vuelve a intentarlo; tus respuestas siguen aquí.",
    sendSuccess: "Hemos recibido tu cuestionario y contacto. Referencia:",
    sendUpgrade: "¿Prefieres una sesión en vivo? Solicita 30 minutos (€50) o 60 minutos (€100).",
    sendNext: "Andrey responderá personalmente. Esto no confirma cita ni pago.",
    saveOptional: "OPCIONAL · GUARDAR COPIA PRIVADA",
    eyebrow: "FORMULARIO DE COACHING DEL AUTOR · HOLISTIC HOUSE",
    title: "Tus preguntas de coaching",
    lead: "Una pregunta por apartado. Responde a tu ritmo.",
    labelTopic: "¿De qué trata tu consulta?",
    yourName: "¿Cómo podemos llamarte? (opcional)",
    location: "Ciudad y país (opcional)",
    addQuestion: "Añadir otra pregunta", ownQuestions: "¿Qué deseas preguntar al coach?",
    ownHint: "Escribe preguntas concretas. Elige UNA pregunta prioritaria en el campo anterior.",
    questionPlaceholder: "Escribe tu pregunta aquí",
    optional: "Opcional", required: "Necesario para completar", requiredLegend: "* Preguntas esenciales; las demás son opcionales.", answerPlaceholder: "Tu respuesta…", note: "Son reflexiones de coaching, no una prueba psicológica puntuable.",
    signedOut: "Puedes responder sin iniciar sesión. Google solo es necesario para guardar.",
    signedIn: "Formulario privado · solo tú puedes ver las respuestas.",
    login: "Iniciar sesión para guardar", signInError: "Google no está disponible. Aún puedes copiar tus respuestas.",
    loading: "Comprobando tu cuenta privada…", unavailable: "No se puede guardar ahora. Puedes completar y copiar tus respuestas.",
    consent: "Guardar mis respuestas cifradas en mi cuenta de Holistic House. No se enviarán al coach, mensajería o CRM.",
    temporary: "Al iniciar sesión, una copia temporal queda solo en esta pestaña (máximo 15 minutos).",
    draft: "Guardar borrador privado", complete: "Completar mi formulario",
    needsRequired: "Completa las tres preguntas esenciales: situación, resultado deseado y una pregunta prioritaria.",
    saved: "Borrador guardado en privado. No se ha enviado al coach.",
    completed: "Formulario completado y guardado. No se ha enviado al coach.",
    saveError: "No se pudo guardar. Inténtalo de nuevo o copia tus respuestas.",
    conflict: "El formulario cambió en otra pestaña. Carga la versión guardada antes de editar.",
    copy: "Copiar para uso personal", copied: "Copia personal creada. Conserva los materiales privados en tu área privada.",
    copyFailed: "El navegador impidió copiar automáticamente. Selecciona y copia el texto de abajo.",
    preview: "Tu copia personal", questions: "Preguntas para el coach",
    downloaded: "Exportar respuestas", downloadName: "mis-preguntas-coaching.txt",
    delete: "Eliminar formulario guardado", deleteConfirm: "¿Eliminar definitivamente tus respuestas guardadas?",
    deleted: "Formulario guardado eliminado.", deleteError: "No se pudo eliminar. Inténtalo de nuevo.",
    unsaved: "No guardado", upToDate: "Todos los cambios guardados", dirty: "Hay cambios sin guardar.",
    saveRequired: "Inicia sesión para guardar en privado. Puedes copiar sin una cuenta.",
    returnToServices: "Explorar sesiones", contact: "Contactar Holistic House",
    contactNote: "Copiar no envía una solicitud ni reserva una cita. No envíes respuestas, dibujos ni resultados por mensajería o correo. Usa Contacto solo para acordar una entrega segura, sin materiales privados.",
    chooseSaved: "Cargar mi versión guardada", chooseLocal: "Conservar respuestas previas",
    accountConflict: "Ya tienes un formulario guardado. Elige con cuál seguir; no se sobrescribe automáticamente.",
    privacy: "Tu borrador es solo tuyo hasta que decidas compartirlo. Ante una urgencia médica, busca ayuda profesional.",
  },
} as const;

function normalise(value: Draft | null | undefined): Draft {
  if (!value) return blank();
  return {
    topic: COACHING_TOPICS.some(item => item.id === value.topic) ? value.topic : "personal",
    name: typeof value.name === "string" ? value.name : "",
    city: typeof value.city === "string" ? value.city : "",
    answers: value.answers && typeof value.answers === "object" && !Array.isArray(value.answers) ? value.answers : {},
    questions: Array.isArray(value.questions) && value.questions.length ? value.questions.slice(0, 8).map(value => typeof value === "string" ? value : "") : [""],
    status: value.status === "complete" ? "complete" : "draft",
  };
}
function hasSomeAnswers(draft: Draft) {
  return Boolean(draft.name || draft.city || Object.values(draft.answers).some(Boolean) || draft.questions.some(Boolean));
}
function formatAnswers(draft: Draft, locale: PublicLocale) {
  const lines = ["Holistic House — " + copy[locale].title, "", copy[locale].labelTopic + " " +
    (COACHING_TOPICS.find(topic => topic.id === draft.topic)?.label[locale] || ""), ""];
  if (draft.name.trim()) lines.push(copy[locale].yourName + ": " + draft.name.trim(), "");
  if (draft.city.trim()) lines.push(copy[locale].location + ": " + draft.city.trim(), "");
  for (const field of COACHING_FIELDS) {
    const value = draft.answers[field.id]?.trim();
    if (value) lines.push(field.label[locale], value, "");
  }
  const questions = draft.questions.map(question => question.trim()).filter(Boolean);
  if (questions.length) lines.push(copy[locale].ownQuestions, ...questions.map((question, index) => String(index + 1) + ". " + question), "");
  return lines.join("\n");
}

export function CoachingIntakeForm({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [draft, setDraft] = useState<Draft>(blank);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [auth, setAuth] = useState<"checking" | "guest" | "signed" | "error">("checking");
  const [consent, setConsent] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [collision, setCollision] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fallbackCopy, setFallbackCopy] = useState(false);
  const [replyContact, setReplyContact] = useState({ email: "", phone: "" });
  const [showPhone, setShowPhone] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [offerChoice, setOfferChoice] = useState<"free" | "short" | "full">("free");
  const [sendConsent, setSendConsent] = useState(false);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadReceipt, setLeadReceipt] = useState("");
  const leadAttempt = useRef<{ id: string; body: string } | null>(null);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const fullText = useMemo(() => formatAnswers(draft, locale), [draft, locale]);
  const missing = COACHING_FIELDS.filter(field => field.required && !draft.answers[field.id]?.trim()).length;
  const visibleFields = COACHING_FIELDS.filter(field => showMore || field.required);
  const filled = visibleFields.filter(field => Boolean(draft.answers[field.id]?.trim())).length;
  const total = visibleFields.length;
  const optionalCount = COACHING_FIELDS.filter(field => !field.required).length;

  useEffect(() => {
    let active = true;
    let restored: Draft | null = null;
    // Only a public, allowlisted topic may cross this page link.
    setDraft(previous => hasSomeAnswers(previous) ? previous
      : { ...previous, topic: coachingIntakeEntryTopic(window.location.search) });
    try {
      const value = sessionStorage.getItem(key);
      sessionStorage.removeItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        if (parsed.version === COACHING_INTAKE_VERSION && Number(parsed.expires) > Date.now()) {
          restored = normalise(parsed.draft);
          setDraft(restored);
          setDirty(hasSomeAnswers(restored));
        }
      }
      const staged = parseDiagnosticStart(sessionStorage.getItem(DIAGNOSTIC_START_KEY), locale);
      if (staged) {
        setReplyContact({ email: staged.email, phone: staged.phone });
        if (staged.phone) setShowPhone(true);
        if (!restored) {
          restored = normalise({
            ...blank(), name: staged.name, topic: staged.topic,
            answers: staged.question ? { request: staged.question } : {},
          });
          setDraft(restored);
          setDirty(hasSomeAnswers(restored));
        }
      }
    } catch {
      // The private account remains the source of truth if browser storage is blocked.
    }
    appFetch("coaching-intake").then((result: Saved) => {
      if (!active) return;
      setSaved(result);
      setAuth("signed");
      setConsent(Boolean(result.intake));
      if (result.intake && restored && hasSomeAnswers(restored)) {
        setCollision(true);
      } else if (result.intake) {
        setDraft(normalise(result.intake));
        setDirty(false);
      }
    }).catch((reason: { status?: number }) => {
      if (!active) return;
      setAuth(reason?.status === 401 ? "guest" : "error");
    });
    const onSignOut = (event: MessageEvent) => {
      if (event.data === "signed-out") {
        setSaved(null); setAuth("guest"); setDraft(blank()); setConsent(false); setDirty(false);
        setCollision(false); setNotice(""); setError("");
      }
    };
    let channel: BroadcastChannel | null = null;
    try { channel = new BroadcastChannel("hh-app-session"); channel.onmessage = onSignOut; } catch { /* unavailable */ }
    return () => { active = false; channel?.close(); };
  }, []);

  function edit(next: (draft: Draft) => Draft) {
    if (collision || busy) return;
    setDraft(previous => ({ ...next(previous), status: "draft" }));
    setDirty(true); setNotice(""); setError(""); setFallbackCopy(false);
  }
  function fieldChange(id: string, value: string) {
    edit(previous => ({ ...previous, answers: { ...previous.answers, [id]: value } }));
  }
  async function signIn() {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await appFetch("auth/start", { locale, continueTo: "coaching-intake" });
      if (!result?.redirectUrl) throw new Error("SIGN_IN_UNAVAILABLE");
      try {
        sessionStorage.setItem(key, JSON.stringify({ version: COACHING_INTAKE_VERSION, expires: Date.now() + 15 * 60 * 1000, draft }));
      } catch { /* browser storage may be disabled; no private data sent in OAuth URL */ }
      window.location.assign(result.redirectUrl);
    } catch {
      setError(t.signInError);
      setBusy(false);
    }
  }
  async function save(status: "draft" | "complete") {
    if (collision || busy) return;
    if (status === "complete" && missing) { setError(t.needsRequired); return; }
    if (!saved?.accountId) { setError(t.saveRequired); return; }
    if (!consent) { setError(t.consent); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result: Saved = await appFetch("coaching-intake", {
        action: "save", revision: saved.revision, consent: true,
        topic: draft.topic, name: draft.name, city: draft.city,
        answers: draft.answers, questions: draft.questions, status,
      }, "POST", { accountId: saved.accountId });
      setSaved(result);
      setDraft(normalise(result.intake));
      setDirty(false);
      setNotice(status === "complete" ? t.completed : t.saved);
    } catch (reason: unknown) {
      const code = (reason as { code?: string })?.code;
      setError(code === "COACHING_REVISION_CONFLICT" ? t.conflict :
        code === "COACHING_REQUIRED_ANSWERS" ? t.needsRequired : t.saveError);
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!saved?.intake || !saved.accountId || busy || !window.confirm(t.deleteConfirm)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result: Saved = await appFetch("coaching-intake", {
        action: "delete", revision: saved.revision, confirmed: true,
      }, "POST", { accountId: saved.accountId });
      setSaved(result); setDraft(blank()); setDirty(false); setConsent(false);
      setNotice(t.deleted);
    } catch { setError(t.deleteError); } finally { setBusy(false); }
  }
  async function submitDiagnostic() {
    if (leadBusy || leadReceipt || busy || collision) return;
    if (missing || !sendConsent || (!replyContact.email.trim() && !replyContact.phone.trim())) {
      setLeadError(t.sendError); return;
    }
    setLeadBusy(true); setLeadError("");
    try {
      if (!leadAttempt.current) {
        const id = window.crypto.randomUUID();
        leadAttempt.current = { id, body: JSON.stringify({
          operationId: id, locale, offer: offerChoice,
          topic: draft.topic, name: draft.name, city: draft.city,
          answers: draft.answers, questions: draft.questions,
          contact: { displayName: draft.name, email: replyContact.email.trim(), phone: replyContact.phone.trim() },
          contactConsent: true, website: "",
        }) };
      }
      const response = await fetch("/api/coaching-diagnostic", {
        method: "POST", credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: leadAttempt.current.body,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true || !/^HH-[A-F0-9]{12}$/.test(result.referenceCode || "")) {
        // A rejected payload was never saved, so edits must get a fresh idempotency key.
        if (response.status === 400) leadAttempt.current = null;
        throw new Error("COACHING_ENQUIRY_NOT_CONFIRMED");
      }
      setLeadReceipt(result.referenceCode);
      try { sessionStorage.removeItem(DIAGNOSTIC_START_KEY); } catch { /* optional */ }
    } catch {
      // Retain the exact idempotency key and frozen payload across retries.
      // A lost response must not create a second coach request.
      setLeadError(t.sendFailure);
    } finally { setLeadBusy(false); }
  }

  async function copyAnswers() {
    try {
      await navigator.clipboard.writeText(fullText);
      setNotice(t.copied); setError(""); setFallbackCopy(false);
    } catch {
      setFallbackCopy(true); setNotice(""); setError(t.copyFailed);
      window.requestAnimationFrame(() => fallbackRef.current?.select());
    }
  }
  function downloadAnswers() {
    const url = URL.createObjectURL(new Blob([fullText], { type: "text/plain;charset=utf-8" }));
    const element = document.createElement("a");
    element.href = url; element.download = t.downloadName; document.body.appendChild(element);
    element.click(); element.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function loadSaved() {
    setDraft(normalise(saved?.intake)); setCollision(false); setDirty(false); setNotice(""); setError("");
  }
  function keepLocal() {
    setCollision(false); setDirty(true); setNotice(""); setError("");
  }

  return <section className={styles.form} aria-labelledby="coaching-form-title" data-coaching-intake lang={locale}>
    <header className={styles.intro}>
      <div className={styles.introCopy}>
        <h2 id="coaching-form-title">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
        <p className={styles.education}><ShieldCheck size={15} aria-hidden="true" />{t.note}</p>
      </div>
      <div className={styles.stats} role="status" aria-live="polite">
        <span className={styles.count}><strong>{filled}</strong> / {total}</span>
        <span>{locale === "ru" ? "ответов" : locale === "es" ? "respuestas" : "answered"}</span>
        <div className={styles.progress} role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={total} aria-label={locale === "ru" ? "Заполнено вопросов" : locale === "es" ? "Preguntas respondidas" : "Questions answered"}><span style={{ width: String(Math.round(filled / total * 100)) + "%" }} /></div>
      </div>
    </header>

    {auth !== "guest" ? <div className={styles.authBar}>
      <LockKeyhole size={19} aria-hidden="true" />
      <div><p>{auth === "signed" ? t.signedIn : auth === "guest" ? t.signedOut : auth === "checking" ? t.loading : t.unavailable}</p>
        {auth === "guest" ? <small>{t.temporary}</small> : null}
      </div>
      {auth === "guest" ? <button type="button" disabled={busy} onClick={() => void signIn()} className={styles.login}>{t.login}<ArrowRight size={16} aria-hidden="true" /></button> : null}
    </div> : <p className={styles.guestHint}><LockKeyhole size={14} aria-hidden="true" />{t.signedOut}</p>}

    {collision ? <div role="alert" className={styles.conflict}>
      <p>{t.accountConflict}</p>
      <div><button type="button" onClick={loadSaved}>{t.chooseSaved}</button><button type="button" onClick={keepLocal}>{t.chooseLocal}</button></div>
    </div> : null}

    <div className={styles.basic}>
      <label>{t.labelTopic}
        <select value={draft.topic} disabled={collision || busy} onChange={event => edit(previous => ({ ...previous, topic: event.target.value }))}>
          {COACHING_TOPICS.map(topic => <option key={topic.id} value={topic.id}>{topic.label[locale]}</option>)}
        </select>
      </label>
      {showMore ? <label>{t.yourName}
        <input value={draft.name} disabled={collision || busy} onChange={event => edit(previous => ({ ...previous, name: event.target.value }))} maxLength={120} autoComplete="nickname" />
      </label> : null}
      {showMore ? <label>{t.location}
        <input value={draft.city} disabled={collision || busy} onChange={event => edit(previous => ({ ...previous, city: event.target.value }))} maxLength={150} autoComplete="address-level2" />
      </label> : null}
    </div>

    <p className={styles.requiredLegend}>{t.requiredLegend}</p>
    <button type="button" className={styles.moreToggle} aria-expanded={showMore}
      onClick={() => setShowMore(value => !value)} disabled={collision || busy}>
      {showMore ? t.lessQuestions : t.moreQuestions.replace("{n}", String(optionalCount))}
      <span aria-hidden="true">{showMore ? "−" : "+"}</span>
    </button>
    {COACHING_GROUPS.filter(group => showMore || COACHING_FIELDS.some(field => field.group === group.id && field.required)).map((group, groupIndex) => <section key={group.id} className={styles.group} aria-labelledby={"coaching-" + group.id}>
      <div className={styles.groupHeading}><span className={styles.number}>{String(groupIndex + 1).padStart(2, "0")}</span>
        <div><h3 id={"coaching-" + group.id}>{group.title[locale]}</h3><p>{group.hint[locale]}</p></div>
        <span className={styles.groupCount}>{COACHING_FIELDS.filter(field => field.group === group.id && (showMore || field.required) && draft.answers[field.id]?.trim()).length}/{COACHING_FIELDS.filter(field => field.group === group.id && (showMore || field.required)).length}</span>
      </div>
      <ol className={styles.fields} start={COACHING_FIELDS.findIndex(item => item.group === group.id) + 1}>
        {COACHING_FIELDS.filter(field => field.group === group.id && (showMore || field.required)).map(field => <li key={field.id} className={styles.fieldRow} data-coaching-question={field.id}>
          <label htmlFor={"coaching-field-" + field.id} className={styles.questionLabel}>
            <span className={styles.ordinal} aria-hidden="true">{String(COACHING_FIELDS.findIndex(item => item.id === field.id) + 1).padStart(2, "0")}</span>
            <span>{field.label[locale]} {field.required ? <em title={t.required}>*</em> : null}</span>
          </label>
          <textarea
            id={"coaching-field-" + field.id}
            value={draft.answers[field.id] || ""} disabled={collision || busy}
            onChange={event => fieldChange(field.id, event.target.value)}
            rows={2} maxLength={field.max}
            placeholder={t.answerPlaceholder}
            aria-required={field.required}
          />
        </li>)}
      </ol>
      {showMore && group.id === "session" ? <div className={styles.ownQuestions}>
        <div className={styles.ownHeader}><div><h4>{t.ownQuestions}</h4><p>{t.ownHint}</p></div>
          <button type="button" disabled={collision || busy || draft.questions.length >= 8} onClick={() => edit(previous => ({ ...previous, questions: [...previous.questions, ""] }))}>
            <Plus size={16} aria-hidden="true" />{t.addQuestion}
          </button>
        </div>
        {draft.questions.map((question, index) => <div className={styles.questionRow} key={index} data-extra-question={index + 1}>
          <label htmlFor={"coaching-question-" + index}>{index + 1}</label>
          <textarea id={"coaching-question-" + index} rows={2} maxLength={600} value={question} disabled={collision || busy}
            placeholder={t.questionPlaceholder} onChange={event => edit(previous => ({ ...previous, questions: previous.questions.map((item, i) => i === index ? event.target.value : item) }))} />
          <button type="button" className={styles.removeQuestion} aria-label={locale === "ru" ? "Удалить вопрос" : locale === "es" ? "Eliminar pregunta" : "Remove question"} disabled={collision || busy || draft.questions.length <= 1} onClick={() => edit(previous => ({ ...previous, questions: previous.questions.filter((_, i) => i !== index) }))}><Trash2 size={17} /></button>
        </div>)}
      </div> : null}
    </section>)}

    <section className={styles.finish} aria-label={locale === "ru" ? "Сохранение анкеты" : locale === "es" ? "Guardar formulario" : "Save questionnaire"}>
      <div className={styles.requestBox} data-coaching-request>
        <p className={styles.requestEyebrow}>{t.sendEyebrow}</p>
        <h3>{offerChoice === "free" ? t.sendTitle : t.sendPaidTitle}</h3>
        <p className={styles.requestLead}>{t.sendLead}</p>
        {leadReceipt ? <div className={styles.requestSuccess} data-coaching-enquiry-saved role="status">
          <Check size={18} aria-hidden="true" /><div><strong>{t.sendSuccess} {leadReceipt}</strong><p>{t.sendNext}</p></div>
          {offerChoice === "free" ? <Link className={styles.requestUpgrade} href={"/" + locale + "/holistic-support#personal-insights-master"} prefetch={false}>
            {t.sendUpgrade}<ArrowRight size={17} aria-hidden="true" />
          </Link> : null}
        </div> : <>
          <fieldset className={styles.choiceFieldset} disabled={leadBusy || busy || collision}>
            <legend>{t.sendOption}</legend>
            <div className={styles.choiceGrid}>
              {(["free", "short", "full"] as const).map(option => <label key={option} data-selected={offerChoice === option}>
                <input type="radio" name="coaching-service-request" checked={offerChoice === option}
                  onChange={() => { setOfferChoice(option); setLeadError(""); }} />
                <span>{option === "free" ? t.sendFree : option === "short" ? t.sendShort : t.sendFull}</span>
              </label>)}
            </div>
          </fieldset>
          <div className={styles.replyFields}>
            <label>{t.sendEmail}<input type="email" autoComplete="email" maxLength={254}
              disabled={leadBusy || busy || collision} value={replyContact.email}
              onChange={event => { setReplyContact(value => ({ ...value, email: event.target.value })); setLeadError(""); }} /></label>
            {(showPhone || replyContact.phone) ? <label>{t.sendPhone}<input type="tel" autoComplete="tel" maxLength={28}
              disabled={leadBusy || busy || collision} value={replyContact.phone}
              onChange={event => { setReplyContact(value => ({ ...value, phone: event.target.value })); setLeadError(""); }} /></label> : null}
          </div>
          {!showPhone && !replyContact.phone ? <button type="button" className={styles.phoneToggle} onClick={() => setShowPhone(true)}>{t.phoneInstead}</button> : null}
          <label className={styles.sendConsent}>
            <input type="checkbox" checked={sendConsent} disabled={leadBusy || busy || collision}
              onChange={event => setSendConsent(event.target.checked)} />
            <span>{t.sendConsent}</span>
          </label>
          {leadError ? <p className={styles.requestError} role="alert">{leadError}</p> : null}
          <button className={styles.sendButton} type="button" disabled={leadBusy || busy || collision || missing > 0 ||
            !sendConsent || (!replyContact.email.trim() && !replyContact.phone.trim())} onClick={() => void submitDiagnostic()}>
            {leadBusy ? "…" : t.sendButton}<ArrowRight size={17} aria-hidden="true" />
          </button>
          <p className={styles.requestFootnote}>{t.sendNext}</p>
        </>}
      </div>
      <p className={styles.requestEyebrow}>{t.saveOptional}</p>
      <div className={styles.saveStatus}><ShieldCheck size={19} aria-hidden="true" />{dirty ? t.dirty : saved?.intake ? t.upToDate : t.unsaved}</div>
      {auth === "signed" ? <label className={styles.consent}>
        <input type="checkbox" checked={consent} disabled={busy || collision} onChange={event => setConsent(event.target.checked)} />
        <span>{t.consent}</span>
      </label> : null}
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {notice ? <p className={styles.success} role="status"><Check size={16} aria-hidden="true" />{notice}</p> : null}
      <div className={styles.actions}>
        {auth === "signed"
          ? <>
            <button type="button" disabled={busy || collision || !consent} className={styles.saveDraft} onClick={() => void save("draft")}>{t.draft}</button>
            <button type="button" disabled={busy || collision || !consent || missing > 0} className={styles.primary} onClick={() => void save("complete")}>{t.complete}<ArrowRight size={17} aria-hidden="true" /></button>
          </>
          : <button type="button" className={styles.saveDraft} disabled={busy} onClick={() => void signIn()}>{t.login}</button>}
        <button type="button" className={styles.copy} onClick={() => void copyAnswers()}><ClipboardCopy size={17} aria-hidden="true" />{t.copy}</button>
        <button type="button" className={styles.export} onClick={downloadAnswers}>{t.downloaded}</button>
      </div>
      {fallbackCopy ? <label className={styles.fallback}>{t.preview}<textarea ref={fallbackRef} readOnly rows={7} value={fullText} onFocus={event => event.target.select()} /></label> : null}
      <div className={styles.links}><Link href={"/" + locale + "/services"} prefetch={false}>{t.returnToServices}<ArrowRight size={15} aria-hidden="true" /></Link>
        <Link href={"/" + locale + "/contact"} prefetch={false}>{t.contact}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      <p className={styles.small}>{t.contactNote}</p>
      <p className={styles.small}>{t.privacy}</p>
      {saved?.intake && auth === "signed" ? <button className={styles.delete} type="button" disabled={busy || collision} onClick={() => void remove()}><Trash2 size={15} aria-hidden="true" />{t.delete}</button> : null}
    </section>
  </section>;
}
