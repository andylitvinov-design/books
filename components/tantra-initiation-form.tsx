"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUpRight, Check, Download, FileText, Heart, MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp-enquiry";
import styles from "./tantra-free-initiation.module.css";

type Intent = "free" | "personal" | "pdf" | "answers";
const intents: Intent[] = ["free", "personal", "pdf", "answers"];
const fileLimit = 8 * 1024 * 1024;
const acceptedFile = /\.(pdf|doc|docx|txt|rtf|jpe?g|png)$/i;

const copy = {
  en: {
    select: "I would like to…",
    tabs: ["Free initiation", "Personal initiation", "Download PDF", "Send my answers"],
    helps: [
      "Request a free introductory Level 1 initiation after studying the course and its seven questions.",
      "Ask for a private €50 / 30-minute Level 1 initiation with Andrey.",
      "Download the Tantra Reiki guide immediately — no signup needed.",
      "Type your seven answers below or select a document to share with Andrey.",
    ],
    name: "Your name", contact: "Email or preferred contact",
    nameHint: "How may Andrey address you?", contactHint: "Email / Telegram / WhatsApp",
    answerLabel: "Your seven answers", answerHint: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n6. ...\n7. ...",
    file: "Or attach your answers", fileHelp: "PDF, DOC, DOCX, TXT, RTF or images · up to 8 MB",
    buttons: ["Continue in WhatsApp", "Request a personal session", "Download PDF guide", "Share my answers"],
    note: "Your request is prepared in WhatsApp but is not sent until you tap Send. Files are not uploaded to this website.",
    telegram: "Or write to Andrey on Telegram",
    sender: ["Free Level 1 Tantra Reiki initiation", "Personal Tantra Reiki Level 1 (€50 / 30 min)", "Tantra Reiki PDF guide", "My seven Tantra Reiki answers"],
    errorAnswers: "Please enter at least one answer or select a document.",
    errorSize: "Please select a file smaller than 8 MB.",
    errorType: "Please choose a PDF, DOC, DOCX, TXT, RTF, JPG or PNG file.",
    errorCancel: "Sharing was cancelled. Your answers were not sent.",
    errorShare: "File sharing is not available. Use WhatsApp and attach the file manually.",
    afterWhatsApp: "WhatsApp opened. Review the prepared message and press Send to submit it.",
    afterShare: "The sharing menu closed. Please verify that your message was actually sent.",
    manualFile: "WhatsApp opened. Add your selected file as an attachment before sending; the site cannot attach it automatically.",
    longText: "The answers are too long for a WhatsApp link. Copy the full message below and paste it into your chat.",
    copyButton: "Copy full message", copied: "Copied. Paste the message into WhatsApp or Telegram.",
    copyError: "Automatic copying is unavailable; select and copy the text below.",
    page: "https://holistichouse.vercel.app/en/academy/reiki/tantra-reiki/free-initiation",
  },
  ru: {
    select: "Я хочу…",
    tabs: ["Бесплатную инициацию", "Личную инициацию", "Скачать PDF", "Отправить ответы"],
    helps: [
      "Запросить бесплатную вводную инициацию первой ступени после изучения материалов и семи вопросов.",
      "Записаться на личную инициацию первой ступени: €50 / 30 минут.",
      "Скачать методичку Тантра Рейки сразу, без регистрации.",
      "Напишите семь ответов или прикрепите файл с телефона для отправки Андрею.",
    ],
    name: "Ваше имя", contact: "Контакт для ответа",
    nameHint: "Как к вам обращаться?", contactHint: "Email / Telegram / WhatsApp",
    answerLabel: "Ваши семь ответов", answerHint: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n6. ...\n7. ...",
    file: "Или прикрепите файл с ответами", fileHelp: "PDF, DOC, DOCX, TXT, RTF или фото · до 8 МБ",
    buttons: ["Продолжить в WhatsApp", "Запросить личную инициацию", "Скачать PDF бесплатно", "Отправить ответы"],
    note: "Заявка откроется в WhatsApp, но отправится только после вашего подтверждения. Сайт не загружает и не хранит выбранный файл.",
    telegram: "Или написать Андрею в Telegram",
    sender: ["Бесплатная инициация Тантра Рейки — первая ступень", "Личная инициация Тантра Рейки — первая ступень (€50 / 30 минут)", "PDF-методичка Тантра Рейки", "Мои 7 ответов по Тантра Рейки"],
    errorAnswers: "Напишите хотя бы один ответ или выберите файл.",
    errorSize: "Выберите файл размером до 8 МБ.",
    errorType: "Выберите PDF, DOC, DOCX, TXT, RTF, JPG или PNG.",
    errorCancel: "Отправка отменена. Ничего не отправлено.",
    errorShare: "Меню отправки недоступно. Прикрепите файл вручную в WhatsApp.",
    afterWhatsApp: "WhatsApp открыт. Проверьте сообщение и нажмите «Отправить».",
    afterShare: "Меню отправки закрыто. Проверьте, что ответы действительно отправлены.",
    manualFile: "WhatsApp открыт. Перед отправкой вручную прикрепите выбранный файл: сайт не может сделать это автоматически.",
    longText: "Ответы слишком длинные для ссылки WhatsApp. Скопируйте полный текст ниже и вставьте в чат.",
    copyButton: "Скопировать сообщение", copied: "Скопировано. Вставьте сообщение в WhatsApp или Telegram.",
    copyError: "Не удалось скопировать автоматически. Выделите текст ниже и скопируйте его.",
    page: "https://holistichouse.vercel.app/ru/academy/reiki/tantra-reiki/free-initiation",
  },
  es: {
    select: "Quiero…",
    tabs: ["Iniciación gratis", "Iniciación personal", "Descargar PDF", "Enviar respuestas"],
    helps: [
      "Solicitar una iniciación introductoria gratuita de Nivel 1 tras estudiar los materiales.",
      "Solicitar una iniciación personal de Nivel 1 con Andrey: €50 / 30 minutos.",
      "Descargar la guía de Tantra Reiki inmediatamente, sin registrarte.",
      "Escribe las siete respuestas o selecciona un documento para compartir con Andrey.",
    ],
    name: "Tu nombre", contact: "Correo o contacto",
    nameHint: "¿Cómo te llamas?", contactHint: "Email / Telegram / WhatsApp",
    answerLabel: "Tus siete respuestas", answerHint: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n6. ...\n7. ...",
    file: "O adjunta tus respuestas", fileHelp: "PDF, DOC, DOCX, TXT, RTF o imágenes · hasta 8 MB",
    buttons: ["Continuar en WhatsApp", "Solicitar iniciación personal", "Descargar la guía PDF", "Compartir respuestas"],
    note: "Tu solicitud se abrirá en WhatsApp, pero no se enviará hasta que pulses Enviar. La página no guarda archivos.",
    telegram: "O escribir a Andrey en Telegram",
    sender: ["Iniciación gratuita Tantra Reiki Nivel 1", "Iniciación personal Tantra Reiki Nivel 1 (€50 / 30 min)", "Guía PDF Tantra Reiki", "Mis siete respuestas de Tantra Reiki"],
    errorAnswers: "Escribe alguna respuesta o selecciona un archivo.",
    errorSize: "El archivo debe pesar menos de 8 MB.",
    errorType: "Selecciona PDF, DOC, DOCX, TXT, RTF, JPG o PNG.",
    errorCancel: "Se canceló el envío. No se envió nada.",
    errorShare: "Compartir no está disponible. Adjunta el archivo manualmente en WhatsApp.",
    afterWhatsApp: "Se abrió WhatsApp. Revisa el mensaje y pulsa Enviar.",
    afterShare: "Se cerró el menú. Comprueba que se enviaron las respuestas.",
    manualFile: "Se abrió WhatsApp. Adjunta tu documento antes de enviar; la página no puede adjuntarlo.",
    longText: "Las respuestas son demasiado largas para un enlace. Copia el texto completo y pégalo en el chat.",
    copyButton: "Copiar mensaje", copied: "Copiado. Pega el mensaje en WhatsApp o Telegram.",
    copyError: "Selecciona y copia el texto de abajo.",
    page: "https://holistichouse.vercel.app/es/academy/reiki/tantra-reiki/free-initiation",
  },
} as const;

function whatsappUrl(text: string) {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(text);
}

export function TantraInitiationForm({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const pdfHref = "/api/academy/reiki-guide?course=tantra&locale=" + locale;
  const [intent, setIntent] = useState<Intent>("free");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [answers, setAnswers] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (hash === "#apply-free") setIntent("free");
      else if (hash === "#apply-personal") setIntent("personal");
      else if (hash === "#apply-pdf") setIntent("pdf");
      else if (hash === "#apply-answers") setIntent("answers");
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const isAnswers = intent === "answers";
  const isPdf = intent === "pdf";

  const choose = (value: Intent) => {
    setIntent(value);
    setError("");
    setNotice("");
    setDraft("");
  };

  function buildMessage() {
    const index = intents.indexOf(intent);
    return [
      "Holistic House · Tantra Reiki",
      t.sender[index],
      t.name + ": " + name.trim(),
      t.contact + ": " + contact.trim(),
      isAnswers && answers.trim() ? t.answerLabel + ":\n" + answers.trim() : "",
      isAnswers && file ? t.file + ": " + file.name : "",
      t.page,
    ].filter(Boolean).join("\n");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setNotice(""); setDraft("");
    if (isPdf) { window.location.assign(pdfHref); return; }
    if (isAnswers && !answers.trim() && !file) { setError(t.errorAnswers); return; }
    const message = buildMessage();

    if (isAnswers && file) {
      if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ title: "Tantra Reiki", text: message, files: [file] });
          setNotice(t.afterShare);
        } catch (cause) {
          setDraft(message);
          setError(cause instanceof Error && cause.name === "AbortError" ? t.errorCancel : t.errorShare);
        }
        return;
      }
      setDraft(message);
      setNotice(t.manualFile);
      window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
      return;
    }

    if (isAnswers && message.length > 1450) {
      setDraft(message);
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Tantra Reiki", text: message });
          setNotice(t.afterShare);
          return;
        } catch (cause) {
          if (cause instanceof Error && cause.name === "AbortError") {
            setError(t.errorCancel);
            return;
          }
        }
      }
      setNotice(t.longText);
      window.open(whatsappUrl([t.sender[3], t.name + ": " + name.trim(), t.contact + ": " + contact.trim(), t.page].join("\n")), "_blank", "noopener,noreferrer");
      return;
    }

    window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
    setNotice(t.afterWhatsApp);
  }

  async function copyMessage() {
    if (!draft) return;
    try { await navigator.clipboard.writeText(draft); setNotice(t.copied); }
    catch { setNotice(t.copyError); }
  }

  return (
    <form className={styles.form} onSubmit={submit} data-tantra-initiation-form>
      <span id="apply-free" className={styles.anchor} aria-hidden="true"/>
      <span id="apply-personal" className={styles.anchor} aria-hidden="true"/>
      <span id="apply-pdf" className={styles.anchor} aria-hidden="true"/>
      <span id="apply-answers" className={styles.anchor} aria-hidden="true"/>
      <h3 className={styles.formTitle}>{t.select}</h3>
      <div className={styles.formTabs} role="group" aria-label={t.select}>
        {intents.map((value, index) => {
          const Icon = [Heart, MessageCircle, Download, FileText][index];
          return <button key={value} type="button" className={styles.formTab} data-active={intent === value} aria-pressed={intent === value} onClick={() => choose(value)}>
            <Icon size={20} aria-hidden="true"/><span>{t.tabs[index]}</span>
          </button>;
        })}
      </div>
      <p className={styles.formHelp}>{t.helps[intents.indexOf(intent)]}</p>
      {!isPdf ? <div className={styles.formFields}>
        <label>{t.name}<input required type="text" autoComplete="name" maxLength={90} placeholder={t.nameHint} value={name} onChange={(e) => setName(e.target.value)}/></label>
        <label>{t.contact}<input required type="text" maxLength={150} placeholder={t.contactHint} value={contact} onChange={(e) => setContact(e.target.value)}/></label>
        {isAnswers ? <>
          <label className={styles.formFull}>{t.answerLabel}<textarea maxLength={10000} rows={7} placeholder={t.answerHint} value={answers} onChange={(e) => setAnswers(e.target.value)}/></label>
          <label className={styles.formFull}>{t.file}<input type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png" onChange={(e) => {
            const selected = e.target.files?.[0] ?? null;
            setError("");
            if (!selected) { setFile(null); return; }
            if (!acceptedFile.test(selected.name)) { setFile(null); e.target.value = ""; setError(t.errorType); return; }
            if (selected.size > fileLimit) { setFile(null); e.target.value = ""; setError(t.errorSize); return; }
            setFile(selected);
          }}/><small>{t.fileHelp}</small></label>
        </> : null}
      </div> : null}
      {isPdf
        ? <a href={pdfHref} className={styles.formSubmit}><ArrowDown size={18} aria-hidden="true"/>{t.buttons[2]}</a>
        : <button type="submit" className={styles.formSubmit}><Send size={18} aria-hidden="true"/>{t.buttons[intents.indexOf(intent)]}<ArrowUpRight size={17} aria-hidden="true"/></button>}
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      {notice ? <p className={styles.formNotice} role="status"><Check size={17} aria-hidden="true"/>{notice}</p> : null}
      {draft ? <div className={styles.formDraft}><textarea readOnly aria-label={t.copyButton} value={draft} rows={5}/><button type="button" onClick={copyMessage}>{t.copyButton}</button></div> : null}
      <p className={styles.formPrivacy}>{t.note}</p>
      <a className={styles.formTelegram} href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.telegram} <ArrowUpRight size={15} aria-hidden="true"/></a>
    </form>
  );
}
