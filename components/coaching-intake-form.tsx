"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ClipboardCopy, LockKeyhole, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { appFetch } from "@/lib/app/client-fetch";
import { COACHING_FIELDS, COACHING_GROUPS, COACHING_INTAKE_VERSION, COACHING_TOPICS } from "@/lib/coaching/intake-model";
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
    eyebrow: "AUTHOR'S COACHING QUESTIONNAIRE · HOLISTIC HOUSE",
    title: "Your question. Your next step.",
    lead: "Explore your situation, define your goal and prepare the questions you want to discuss with a coach. One page, at your own pace.",
    labelTopic: "What is your request about?",
    yourName: "How should we address you? (optional)",
    location: "City and country (optional)",
    addQuestion: "Add another question", ownQuestions: "What would you like to ask the coach?",
    ownHint: "List concrete questions you want to discuss. Choose ONE priority question in the field above.",
    questionPlaceholder: "Write your question here",
    optional: "Optional", required: "Essential to complete", note: "These are open coaching reflections, not a scored psychological test.",
    signedOut: "You can fill the questionnaire without signing in. To keep your answers between visits, sign in with Google and save a private draft.",
    signedIn: "Signed in · Only you can access this saved questionnaire.",
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
    copy: "Copy my answers", copied: "Copied. Nothing has been sent — choose where to share them.",
    copyFailed: "Automatic copying was blocked. Select the text below and copy it manually.",
    preview: "Text to share, only if you choose", questions: "Questions for the coach",
    downloaded: "Export answers", downloadName: "my-coaching-questions.txt",
    delete: "Delete saved questionnaire", deleteConfirm: "Delete your saved coaching answers permanently from your account?",
    deleted: "Saved questionnaire deleted.", deleteError: "Could not delete. Please try again.",
    unsaved: "Not saved yet", upToDate: "All changes saved", dirty: "You have changes not yet saved.",
    saveRequired: "Sign in before using private save. Copying remains available without an account.",
    returnToServices: "Explore sessions", contact: "Contact Holistic House",
    contactNote: "Copying does not submit a request or book a session. Use Contact to ask for a reply; share your answers only with your permission.",
    chooseSaved: "Load my saved version", chooseLocal: "Keep answers from before sign-in",
    accountConflict: "You already have a saved questionnaire. Choose which version to work with; nothing is overwritten automatically.",
    privacy: "Your draft is visible only to you until you deliberately copy or share it. Do not include medical emergencies here; seek qualified urgent help instead.",
  },
  ru: {
    eyebrow: "АВТОРСКАЯ КОУЧИНГ-АНКЕТА · HOLISTIC HOUSE",
    title: "Ваш вопрос. Ваш следующий шаг.",
    lead: "Опишите ситуацию, сформулируйте цель и подготовьте вопросы для коуча. Одна страница, без спешки.",
    labelTopic: "К какой теме относится ваш запрос?",
    yourName: "Как к вам обращаться? (необязательно)",
    location: "Город и страна (необязательно)",
    addQuestion: "Добавить вопрос", ownQuestions: "Что вы хотели бы спросить у коуча?",
    ownHint: "Перечислите конкретные вопросы. ОДИН самый важный укажите в отдельном поле выше.",
    questionPlaceholder: "Напишите свой вопрос",
    optional: "Необязательно", required: "Нужно для завершения", note: "Это коучинговая рефлексия, а не психологический тест с баллами.",
    signedOut: "Анкету можно заполнить без входа. Для сохранения между посещениями войдите через Google и сохраните приватный черновик.",
    signedIn: "Вы вошли · Сохранённую анкету можете видеть только вы.",
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
    copy: "Скопировать ответы", copied: "Скопировано. Ничего не отправлено — вы сами выбираете, кому передать.",
    copyFailed: "Браузер запретил автоматическое копирование. Скопируйте текст ниже вручную.",
    preview: "Текст для передачи по вашему выбору", questions: "Вопросы коучу",
    downloaded: "Экспортировать ответы", downloadName: "moya-coaching-anketa.txt",
    delete: "Удалить сохранённую анкету", deleteConfirm: "Безвозвратно удалить ваши сохранённые ответы из кабинета?",
    deleted: "Сохранённая анкета удалена.", deleteError: "Не удалось удалить. Повторите попытку.",
    unsaved: "Пока не сохранено", upToDate: "Все изменения сохранены", dirty: "Есть несохранённые изменения.",
    saveRequired: "Для приватного сохранения войдите в аккаунт. Без входа можно скопировать ответы.",
    returnToServices: "Посмотреть сессии", contact: "Написать в Holistic House",
    contactNote: "Копирование не отправляет заявку и не бронирует сессию. Для ответа коуча используйте раздел «Контакты»; делитесь ответами только по своему желанию.",
    chooseSaved: "Загрузить из кабинета", chooseLocal: "Оставить ответы до входа",
    accountConflict: "В кабинете уже есть анкета. Выберите версию, с которой продолжите; автоматически ничего не перезапишется.",
    privacy: "Черновик видите только вы, пока сами не решите им поделиться. При неотложных состояниях обращайтесь за квалифицированной помощью.",
  },
  es: {
    eyebrow: "FORMULARIO DE COACHING DEL AUTOR · HOLISTIC HOUSE",
    title: "Tu pregunta. Tu próximo paso.",
    lead: "Explora tu situación, define una meta y prepara tus preguntas para el coach. Todo en una página y a tu ritmo.",
    labelTopic: "¿De qué trata tu consulta?",
    yourName: "¿Cómo podemos llamarte? (opcional)",
    location: "Ciudad y país (opcional)",
    addQuestion: "Añadir otra pregunta", ownQuestions: "¿Qué deseas preguntar al coach?",
    ownHint: "Escribe preguntas concretas. Elige UNA pregunta prioritaria en el campo anterior.",
    questionPlaceholder: "Escribe tu pregunta aquí",
    optional: "Opcional", required: "Necesario para completar", note: "Son reflexiones de coaching, no una prueba psicológica puntuable.",
    signedOut: "Puedes completar el formulario sin iniciar sesión. Para guardarlo entre visitas, inicia sesión con Google y guarda un borrador privado.",
    signedIn: "Sesión iniciada · Solo tú puedes acceder a este formulario guardado.",
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
    copy: "Copiar mis respuestas", copied: "Copiado. No se ha enviado nada; tú eliges qué compartir.",
    copyFailed: "El navegador impidió copiar automáticamente. Selecciona y copia el texto de abajo.",
    preview: "Texto para compartir solo si lo decides", questions: "Preguntas para el coach",
    downloaded: "Exportar respuestas", downloadName: "mis-preguntas-coaching.txt",
    delete: "Eliminar formulario guardado", deleteConfirm: "¿Eliminar definitivamente tus respuestas guardadas?",
    deleted: "Formulario guardado eliminado.", deleteError: "No se pudo eliminar. Inténtalo de nuevo.",
    unsaved: "No guardado", upToDate: "Todos los cambios guardados", dirty: "Hay cambios sin guardar.",
    saveRequired: "Inicia sesión para guardar en privado. Puedes copiar sin una cuenta.",
    returnToServices: "Explorar sesiones", contact: "Contactar Holistic House",
    contactNote: "Copiar no envía una solicitud ni reserva una cita. Usa Contacto para pedir respuesta; comparte tus respuestas solo si quieres.",
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
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const fullText = useMemo(() => formatAnswers(draft, locale), [draft, locale]);
  const missing = COACHING_FIELDS.filter(field => field.required && !draft.answers[field.id]?.trim()).length;
  const filled = COACHING_FIELDS.filter(field => Boolean(draft.answers[field.id]?.trim())).length;
  const total = COACHING_FIELDS.length;

  useEffect(() => {
    let active = true;
    let restored: Draft | null = null;
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
      <div>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="coaching-form-title">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
        <p className={styles.education}><ShieldCheck size={17} aria-hidden="true" />{t.note}</p>
      </div>
      <div className={styles.stats} role="status" aria-live="polite">
        <strong>{filled} / {total}</strong>
        <span>{locale === "ru" ? "ответов" : locale === "es" ? "respuestas" : "answered"}</span>
        <div className={styles.progress} role="progressbar" aria-valuenow={filled} aria-valuemin={0} aria-valuemax={total} aria-label={locale === "ru" ? "Заполнено вопросов" : locale === "es" ? "Preguntas respondidas" : "Questions answered"}><span style={{ width: String(Math.round(filled / total * 100)) + "%" }} /></div>
      </div>
    </header>

    <div className={styles.authBar}>
      <LockKeyhole size={19} aria-hidden="true" />
      <div><p>{auth === "signed" ? t.signedIn : auth === "guest" ? t.signedOut : auth === "checking" ? t.loading : t.unavailable}</p>
        {auth === "guest" ? <small>{t.temporary}</small> : null}
      </div>
      {auth === "guest" ? <button type="button" disabled={busy} onClick={() => void signIn()} className={styles.login}>{t.login}<ArrowRight size={16} aria-hidden="true" /></button> : null}
    </div>

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
      <label>{t.yourName}
        <input value={draft.name} disabled={collision || busy} onChange={event => edit(previous => ({ ...previous, name: event.target.value }))} maxLength={120} autoComplete="nickname" />
      </label>
      <label>{t.location}
        <input value={draft.city} disabled={collision || busy} onChange={event => edit(previous => ({ ...previous, city: event.target.value }))} maxLength={150} autoComplete="address-level2" />
      </label>
    </div>

    {COACHING_GROUPS.map((group, groupIndex) => <section key={group.id} className={styles.group} aria-labelledby={"coaching-" + group.id}>
      <div className={styles.groupHeading}><span className={styles.number}>{String(groupIndex + 1).padStart(2, "0")}</span>
        <div><h3 id={"coaching-" + group.id}>{group.title[locale]}</h3><p>{group.hint[locale]}</p></div>
      </div>
      <div className={styles.fields}>
        {COACHING_FIELDS.filter(field => field.group === group.id).map((field, index) => <label key={field.id} className={styles.field}>
          <span>{field.label[locale]} {field.required ? <em title={t.required}>*</em> : <small>{t.optional}</small>}</span>
          <textarea
            value={draft.answers[field.id] || ""} disabled={collision || busy}
            onChange={event => fieldChange(field.id, event.target.value)}
            rows={field.id === "request" || field.id === "priorityQuestion" ? 3 : 2}
            maxLength={field.max}
            placeholder={index === 0 ? (locale === "ru" ? "Ваш ответ…" : locale === "es" ? "Tu respuesta…" : "Your answer…") : undefined}
            aria-required={field.required}
          />
        </label>)}
      </div>
      {group.id === "session" ? <div className={styles.ownQuestions}>
        <div className={styles.ownHeader}><div><h4>{t.ownQuestions}</h4><p>{t.ownHint}</p></div>
          <button type="button" disabled={collision || busy || draft.questions.length >= 8} onClick={() => edit(previous => ({ ...previous, questions: [...previous.questions, ""] }))}>
            <Plus size={16} aria-hidden="true" />{t.addQuestion}
          </button>
        </div>
        {draft.questions.map((question, index) => <div className={styles.questionRow} key={index}>
          <label htmlFor={"coaching-question-" + index}>{index + 1}</label>
          <textarea id={"coaching-question-" + index} rows={2} maxLength={600} value={question} disabled={collision || busy}
            placeholder={t.questionPlaceholder} onChange={event => edit(previous => ({ ...previous, questions: previous.questions.map((item, i) => i === index ? event.target.value : item) }))} />
          <button type="button" className={styles.removeQuestion} aria-label={locale === "ru" ? "Удалить вопрос" : locale === "es" ? "Eliminar pregunta" : "Remove question"} disabled={collision || busy || draft.questions.length <= 1} onClick={() => edit(previous => ({ ...previous, questions: previous.questions.filter((_, i) => i !== index) }))}><Trash2 size={17} /></button>
        </div>)}
      </div> : null}
    </section>)}

    <section className={styles.finish} aria-label={locale === "ru" ? "Сохранение анкеты" : locale === "es" ? "Guardar formulario" : "Save questionnaire"}>
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
