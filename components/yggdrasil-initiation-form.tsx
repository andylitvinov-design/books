"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { PublicLocale } from "@/lib/public-locales";
import { WHATSAPP_NUMBER } from "@/lib/whatsapp-enquiry";
import styles from "./yggdrasil-free-initiation.module.css";

type Intent = "free" | "personal" | "pdf" | "answers";
const intents: Intent[] = ["free", "personal", "pdf", "answers"];
const maxFileBytes = 8 * 1024 * 1024;

const text = {
  en: {
    options: ["Free Level 1", "Personal initiation", "Download PDF", "Send my answers"],
    choose: "I would like to…",
    freeHelp: "Ask for the free teacher-led Level 1 introduction. Your seven answers can be sent now or once prepared.",
    personalHelp: "Request a personal 60-minute Level 1 initiation (€100 per level). Andrey will confirm the date and format.",
    pdfHelp: "Get the full study and pricing PDF immediately. No registration or contact details are required.",
    answersHelp: "Type your responses or attach a document from your phone. Share it directly with Andrey; no file is stored by this page.",
    name: "Your name", contact: "Email or preferred contact", namePlaceholder: "Your name",
    contactPlaceholder: "Email / Telegram / WhatsApp", answers: "Your seven answers (optional if you attach a file)",
    answersPlaceholder: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n6. ...\n7. ...",
    file: "Attach a document with your answers", fileHint: "PDF, DOC, DOCX, TXT or images · up to 8 MB",
    download: "Download free PDF", submit: "Continue in WhatsApp", share: "Share answers / file",
    note: "For requests, WhatsApp opens with your details. Nothing is submitted or booked until you send it yourself. With a file, your phone opens its sharing menu.",
    required: "Please write your answers or select a file.", tooBig: "Please select a file smaller than 8 MB.",
    wrongType: "Use PDF, DOC, DOCX, TXT, RTF, JPG or PNG.", aborted: "File sharing was cancelled; nothing was sent.",
    shareFailure: "The share menu was unavailable. Please use the manual option below.",
    afterWhatsApp: "WhatsApp opened. Please review and press Send; no request is confirmed yet.",
    afterShare: "The sharing menu closed. Check your chosen messenger to make sure the answers were sent.",
    attachManually: "WhatsApp opened, but the browser cannot attach files automatically. Please attach your document manually before sending.",
    longCopy: "Your answers are too long for a reliable WhatsApp link. Copy the full text below, then paste it into the chat.",
    copy: "Copy full message", copied: "Message copied. Paste it into WhatsApp or Telegram.",
    fallback: "Your message is ready to copy if sharing is unavailable.",
    telegram: "Or contact Andrey on Telegram",
    senderFree: "Free introductory Reiki Yggdrasil Level 1 initiation",
    senderPersonal: "Personal Reiki Yggdrasil Level 1 initiation (€100 / 60 min)",
    senderPdf: "Reiki Yggdrasil study PDF",
    senderAnswers: "My seven Reiki Yggdrasil answers",
    attachmentLabel: "Document attached to the share request",
    page: "https://holistichouse.vercel.app/en/academy/reiki/yggdrasil/free-initiation",
  },
  ru: {
    options: ["Бесплатно", "Личная инициация", "Скачать PDF", "Отправить ответы"],
    choose: "Я хочу…",
    freeHelp: "Запросить бесплатную вводную 1-ю ступень с преподавателем. Семь ответов можно отправить сразу или после подготовки.",
    personalHelp: "Записаться на личную инициацию первой ступени: €100 / 60 минут / ступень. Андрей подтвердит дату и формат.",
    pdfHelp: "Скачать описание системы и стоимость в PDF сразу, без регистрации и ввода контактов.",
    answersHelp: "Напишите ответы или прикрепите документ с телефона. Отправка непосредственно Андрею через мессенджер, файл на сайте не сохраняется.",
    name: "Ваше имя", contact: "Email или контакт для ответа", namePlaceholder: "Как к вам обращаться",
    contactPlaceholder: "Email / Telegram / WhatsApp", answers: "Ваши семь ответов (необязательно при наличии файла)",
    answersPlaceholder: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n6. ...\n7. ...",
    file: "Прикрепить файл с ответами", fileHint: "PDF, DOC, DOCX, TXT или фото · до 8 МБ",
    download: "Скачать PDF бесплатно", submit: "Продолжить в WhatsApp", share: "Отправить ответы / файл",
    note: "Заявка откроется в WhatsApp с вашими данными — она не отправится и не станет записью без вашего подтверждения. Для файла телефон откроет меню «Поделиться».",
    required: "Напишите ответы или выберите файл.", tooBig: "Выберите файл меньше 8 МБ.",
    wrongType: "Поддерживаются PDF, DOC, DOCX, TXT, RTF, JPG, PNG.", aborted: "Отправка файла отменена. Ничего не отправлено.",
    shareFailure: "Меню отправки недоступно. Используйте ручную отправку ниже.",
    afterWhatsApp: "WhatsApp открыт. Проверьте сообщение и нажмите «Отправить». Запись ещё не подтверждена.",
    afterShare: "Меню отправки закрыто. Проверьте в выбранном мессенджере, что ответы действительно отправлены.",
    attachManually: "WhatsApp открыт, но браузер не прикрепляет файл автоматически. Добавьте документ в чат вручную перед отправкой.",
    longCopy: "Текст ответов слишком длинный для надёжной ссылки WhatsApp. Скопируйте текст ниже и вставьте его в чат.",
    copy: "Скопировать сообщение", copied: "Сообщение скопировано. Вставьте его в WhatsApp или Telegram.",
    fallback: "Если отправка недоступна, можно скопировать подготовленное сообщение.",
    telegram: "Или написать Андрею в Telegram",
    senderFree: "Бесплатная вводная инициация 1-й ступени Рейки Иггдрасиль",
    senderPersonal: "Личная инициация 1-й ступени Рейки Иггдрасиль (€100 / 60 минут)",
    senderPdf: "PDF-описание Рейки Иггдрасиль",
    senderAnswers: "Мои семь ответов по Рейки Иггдрасиль",
    attachmentLabel: "Файл приложен к запросу на отправку",
    page: "https://holistichouse.vercel.app/ru/academy/reiki/yggdrasil/free-initiation",
  },
  es: {
    options: ["Nivel 1 gratis", "Iniciación personal", "Descargar PDF", "Enviar respuestas"],
    choose: "Quiero…",
    freeHelp: "Solicita la introducción gratuita de Nivel 1 con profesor. Puedes enviar las siete respuestas ahora o después.",
    personalHelp: "Solicita una sesión individual de 60 minutos (€100 por nivel). Andrey confirma disponibilidad y fecha.",
    pdfHelp: "Descarga el PDF con el programa y los precios sin registrarte.",
    answersHelp: "Escribe tus respuestas o adjunta un archivo del teléfono. Compártelo con Andrey; la página no guarda archivos.",
    name: "Tu nombre", contact: "Correo o contacto", namePlaceholder: "Tu nombre",
    contactPlaceholder: "Correo / Telegram / WhatsApp", answers: "Tus siete respuestas (opcional si adjuntas un archivo)",
    answersPlaceholder: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n6. ...\n7. ...",
    file: "Adjuntar archivo con respuestas", fileHint: "PDF, DOC, DOCX, TXT o imágenes · máximo 8 MB",
    download: "Descargar PDF gratis", submit: "Continuar en WhatsApp", share: "Compartir respuestas / archivo",
    note: "WhatsApp abre tu solicitud, pero no se envía ni reserva hasta que pulses Enviar. Con un archivo, el teléfono abre su menú Compartir.",
    required: "Escribe tus respuestas o elige un archivo.", tooBig: "El archivo debe ocupar menos de 8 MB.",
    wrongType: "Formatos: PDF, DOC, DOCX, TXT, RTF, JPG, PNG.", aborted: "Se canceló el envío. No se compartió nada.",
    shareFailure: "No se pudo abrir Compartir. Usa la opción manual.",
    afterWhatsApp: "Se abrió WhatsApp. Revisa y envía el mensaje; la inscripción aún no está confirmada.",
    afterShare: "Se cerró el menú. Comprueba en tu mensajería que se hayan enviado las respuestas.",
    attachManually: "Se abrió WhatsApp, pero debes adjuntar el archivo manualmente antes de enviarlo.",
    longCopy: "Tus respuestas son demasiado largas para un enlace de WhatsApp. Copia el texto completo y pégalo en el chat.",
    copy: "Copiar mensaje completo", copied: "Mensaje copiado. Pégalo en WhatsApp o Telegram.",
    fallback: "Si Compartir no funciona, copia el mensaje preparado.",
    telegram: "O escribe a Andrey en Telegram",
    senderFree: "Introducción gratuita a Reiki Yggdrasil Nivel 1",
    senderPersonal: "Iniciación personal Reiki Yggdrasil Nivel 1 (€100 / 60 min)",
    senderPdf: "Guía PDF Reiki Yggdrasil",
    senderAnswers: "Mis siete respuestas sobre Reiki Yggdrasil",
    attachmentLabel: "Archivo incluido en la solicitud de compartir",
    page: "https://holistichouse.vercel.app/es/academy/reiki/yggdrasil/free-initiation",
  },
} as const;

function whatsapp(message: string) {
  return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
}

export function YggdrasilInitiationForm({ locale }: { locale: PublicLocale }) {
  const t = text[locale];
  const [mode, setMode] = useState<Intent>("free");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [answers, setAnswers] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState("");
  const pdfUrl = "/api/academy/reiki-guide?course=yggdrasil&locale=" + locale;

  useEffect(() => {
    const synchronize = () => {
      const hash = window.location.hash;
      if (hash === "#apply-personal") setMode("personal");
      if (hash === "#apply-free" || hash === "#request-free-initiation") setMode("free");
      if (hash === "#apply-pdf") setMode("pdf");
      if (hash === "#apply-answers") setMode("answers");
    };
    synchronize();
    window.addEventListener("hashchange", synchronize);
    return () => window.removeEventListener("hashchange", synchronize);
  }, []);

  const switchMode = (selected: Intent) => {
    setMode(selected);
    setError("");
    setNotice("");
    setDraft("");
  };

  function buildMessage() {
    const topic = mode === "personal" ? t.senderPersonal : mode === "answers" ? t.senderAnswers : t.senderFree;
    return [
      "Holistic House · Reiki Yggdrasil",
      topic,
      t.name + ": " + name.trim(),
      t.contact + ": " + contact.trim(),
      mode === "answers" && answers.trim() ? t.answers + ":\n" + answers.trim() : "",
      mode === "answers" && attachment ? t.attachmentLabel + ": " + attachment.name : "",
      t.page,
    ].filter(Boolean).join("\n");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setDraft("");
    if (mode === "pdf") {
      window.location.href = pdfUrl;
      return;
    }
    if (mode === "answers" && !answers.trim() && !attachment) {
      setError(t.required);
      return;
    }
    const message = buildMessage();
    if (mode === "answers" && attachment) {
      if (typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [attachment] })) {
        try {
          await navigator.share({ title: "Reiki Yggdrasil", text: message, files: [attachment] });
          setNotice(t.afterShare);
        } catch (cause) {
          setError(cause instanceof Error && cause.name === "AbortError" ? t.aborted : t.shareFailure);
          setDraft(message);
        }
        return;
      }
      // No public upload endpoint exists for these files. Do not pretend that
      // picking a file saves it on the site or silently send it to a third party.
      setDraft(message);
      setNotice(t.attachManually);
      window.open(whatsapp(message.replace(attachment.name, "[attach the chosen document in chat]")), "_blank", "noopener,noreferrer");
      return;
    }
    if (mode === "answers" && message.length > 1450) {
      setDraft(message);
      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ title: "Reiki Yggdrasil", text: message });
          setNotice(t.afterShare);
          return;
        } catch (cause) {
          if (cause instanceof Error && cause.name === "AbortError") {
            setError(t.aborted);
            return;
          }
        }
      }
      setNotice(t.longCopy);
      window.open(whatsapp([t.senderAnswers, t.name + ": " + name.trim(), t.contact + ": " + contact.trim(), t.page].join("\n")), "_blank", "noopener,noreferrer");
      return;
    }
    window.open(whatsapp(message), "_blank", "noopener,noreferrer");
    setNotice(t.afterWhatsApp);
  }

  async function copyDraft() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setNotice(t.copied);
    } catch {
      setNotice(t.fallback);
    }
  }

  const isPdf = mode === "pdf";
  const isAnswers = mode === "answers";
  return (
    <form className={styles.applicationForm} onSubmit={submit} data-yggdrasil-form>
      <span id="apply-free" className={styles.anchor} aria-hidden="true" />
      <span id="apply-personal" className={styles.anchor} aria-hidden="true" />
      <span id="apply-pdf" className={styles.anchor} aria-hidden="true" />
      <span id="apply-answers" className={styles.anchor} aria-hidden="true" />
      <p className={styles.formQuestion}>{t.choose}</p>
      <div className={styles.formOptions} role="group" aria-label={t.choose}>
        {intents.map((intent, index) => (
          <button className={styles.formOption} type="button" key={intent} aria-pressed={mode === intent}
            data-selected={mode === intent} data-intent={intent} onClick={() => switchMode(intent)}>
            <span className={styles.formOptionIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span>{t.options[index]}</span>
          </button>
        ))}
      </div>
      <p className={styles.modeExplanation}>{mode === "free" ? t.freeHelp : mode === "personal" ? t.personalHelp : isPdf ? t.pdfHelp : t.answersHelp}</p>
      {!isPdf ? (
        <div className={styles.formFields}>
          <label>{t.name}
            <input type="text" name="name" autoComplete="name" maxLength={90} value={name}
              onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} required />
          </label>
          <label>{t.contact}
            <input type="text" name="contact" autoComplete="email" maxLength={150} value={contact}
              onChange={(e) => setContact(e.target.value)} placeholder={t.contactPlaceholder} required />
          </label>
          {isAnswers ? (
            <>
              <label className={styles.fullField}>{t.answers}
                <textarea rows={5} maxLength={10000} value={answers}
                  onChange={(e) => setAnswers(e.target.value)} placeholder={t.answersPlaceholder} />
              </label>
              <label className={styles.fullField}>{t.file}
                <input type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.jpg,.jpeg,.png" onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setError("");
                  if (!file) { setAttachment(null); return; }
                  if (!/\.(pdf|doc|docx|txt|rtf|jpe?g|png)$/i.test(file.name)) {
                    setAttachment(null); e.target.value = ""; setError(t.wrongType); return;
                  }
                  if (file.size > maxFileBytes) {
                    setAttachment(null); e.target.value = ""; setError(t.tooBig); return;
                  }
                  setAttachment(file);
                }} />
                <small>{t.fileHint}</small>
              </label>
            </>
          ) : null}
        </div>
      ) : null}
      {isPdf ? (
        <a className={styles.formSubmit} href={pdfUrl} download>{t.download}<span aria-hidden="true">↓</span></a>
      ) : (
        <button className={styles.formSubmit} type="submit">
          {isAnswers ? t.share : t.submit}<span aria-hidden="true">↗</span>
        </button>
      )}
      {error ? <p className={styles.formError} role="alert">{error}</p> : null}
      {notice ? <p className={styles.formNotice} role="status">{notice}</p> : null}
      {draft ? (
        <div className={styles.formDraft}>
          <p>{t.fallback}</p>
          <textarea aria-label={t.copy} value={draft} readOnly rows={5} />
          <button type="button" onClick={copyDraft}>{t.copy}</button>
        </div>
      ) : null}
      <p className={styles.formNote}>{t.note}</p>
      <a className={styles.telegramLink} href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.telegram} ↗</a>
    </form>
  );
}
