"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, ChevronDown, MessageCircle, Send } from "lucide-react";
import { StaticPortrait } from "@/components/static-portrait";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramEnquiryUrlFromWhatsApp, whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import styles from "./home-free-diagnosis-banner.module.css";

const SERVICE_TITLE = "Free drawing-based situation review";
type Channel = "whatsapp" | "telegram";

const copy = {
  en: {
    eyebrow: "FREE · PERSONAL REVIEW",
    title: "Free situation assessment",
    description: "Explore one question with a short questionnaire and a hand-drawn ME · GOAL · PROBLEM sketch.",
    benefits: ["Personal written review", "A clearer next step", "No fee or video call"],
    order: "Request for free", close: "Hide contact options", details: "How it works",
    note: "A symbolic review, not a medical diagnosis. A request is not a confirmed appointment.",
    requestTitle: "How would you like to write to Andrey?",
    requestHint: "Leave one contact for a reply, then choose WhatsApp or Telegram.",
    contact: "Your email or phone", placeholder: "Email or +1…",
    consent: "I agree to a personal reply about this request only. No marketing.",
    invalid: "Enter a valid email or international phone, starting with +.",
    consentRequired: "Please agree to a reply about this request.",
    saving: "Saving…",
    error: "Your request could not be saved. No messenger chat was opened; please try again.",
    saved: "Request saved", reference: "Reference",
    privacy: "Your contact is saved securely before opening the messenger. Sending the chat is still your choice; a chat identity, appointment or payment is not automatically confirmed.",
    requestText: "Please send instructions for the free written situation review, questionnaire and hand drawing.",
  },
  ru: {
    eyebrow: "БЕСПЛАТНО · ЛИЧНЫЙ РАЗБОР",
    title: "Бесплатная диагностика ситуации",
    description: "Один важный вопрос, короткая анкета и рисунок «Я · Цель · Проблема».",
    benefits: ["Личный письменный разбор", "Яснее следующий шаг", "Без оплаты и созвона"],
    order: "Заказать бесплатно", close: "Скрыть способы связи", details: "Как это работает",
    note: "Символический разбор, не медицинский диагноз. Заявка не означает подтверждённую запись.",
    requestTitle: "Куда удобно написать Андрею?",
    requestHint: "Оставьте один контакт для ответа и выберите WhatsApp или Telegram.",
    contact: "Ваш email или телефон", placeholder: "Email или +1…",
    consent: "Согласен(-на) на личный ответ по этой заявке, без рекламных рассылок.",
    invalid: "Укажите действующий email или телефон с международным кодом +.",
    consentRequired: "Подтвердите согласие на ответ по заявке.",
    saving: "Сохраняем…",
    error: "Не удалось сохранить заявку. Чат не открыт; попробуйте ещё раз.",
    saved: "Заявка сохранена", reference: "Номер",
    privacy: "Контакт сохраняется защищённо до перехода в мессенджер. Сообщение вы отправляете сами; личность в чате, запись и оплата не подтверждаются автоматически.",
    requestText: "Пришлите, пожалуйста, инструкцию к бесплатному письменному разбору, анкете и рисунку от руки.",
  },
  es: {
    eyebrow: "GRATIS · REVISIÓN PERSONAL",
    title: "Evaluación gratuita de tu situación",
    description: "Una pregunta importante, un formulario breve y un dibujo YO · META · PROBLEMA.",
    benefits: ["Informe personal escrito", "Un próximo paso más claro", "Sin pago ni videollamada"],
    order: "Solicitar gratis", close: "Ocultar opciones de contacto", details: "Cómo funciona",
    note: "Reflexión simbólica, no diagnóstico médico. La solicitud no confirma una cita.",
    requestTitle: "¿Dónde prefieres escribir a Andrey?",
    requestHint: "Deja un contacto para la respuesta y elige WhatsApp o Telegram.",
    contact: "Tu correo o teléfono", placeholder: "Correo o +1…",
    consent: "Acepto recibir una respuesta personal sobre esta solicitud. Sin publicidad.",
    invalid: "Introduce un correo válido o teléfono internacional con +.",
    consentRequired: "Confirma tu consentimiento para recibir una respuesta.",
    saving: "Guardando…",
    error: "No se pudo guardar la solicitud. No se abrió el chat; inténtalo otra vez.",
    saved: "Solicitud guardada", reference: "Referencia",
    privacy: "Guardamos el contacto de forma segura antes de abrir el chat. Tú decides si envías el mensaje; no se confirma automáticamente la identidad, reserva ni pago.",
    requestText: "Envíame las instrucciones para la revisión escrita gratuita, el cuestionario y el dibujo a mano.",
  },
} as const;

function parseReplyContact(raw: string): { email: string; phone: string } | null {
  const value = raw.trim();
  if (value.includes("@")) {
    return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ? { email: value, phone: "" } : null;
  }
  const phone = value.replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(phone) ? { email: "", phone } : null;
}

function channelUrl(locale: PublicLocale, referenceCode: string, channel: Channel) {
  const whatsapp = whatsappEnquiryUrl({
    locale, service: SERVICE_TITLE,
    request: copy[locale].requestText + " " + copy[locale].reference + ": " + referenceCode,
    pagePath: "/" + locale + "/services/free-situation-review",
  });
  return channel === "whatsapp" ? whatsapp : telegramEnquiryUrlFromWhatsApp(whatsapp);
}

/** Compact in-card handoff: CRM commit first, optional external chat second. */
export function HomeFreeDiagnosisBanner({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<Channel | null>(null);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const operationId = useRef<string | null>(null);
  const formId = useId();
  const contactId = useId();

  async function chooseChannel(channel: Channel) {
    if (busy || reference) return;
    const contact = parseReplyContact(address);
    if (!contact) { setError(t.invalid); return; }
    if (!consent) { setError(t.consentRequired); return; }

    // Synchronous placeholder preserves the iPhone user gesture during API save.
    const handoffWindow = window.open("about:blank", "_blank");
    if (handoffWindow) handoffWindow.opener = null;
    const currentId = operationId.current || window.crypto.randomUUID();
    operationId.current = currentId;
    setBusy(channel);
    setError("");
    try {
      const response = await fetch("/api/service-enquiries", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: currentId, serviceTitle: SERVICE_TITLE,
          sourcePath: "/" + locale + "/services/free-situation-review", locale,
          contact: { displayName: "", email: contact.email, phone: contact.phone },
          contactConsent: true, website: "",
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true ||
        !/^HH-[A-F0-9]{12}$/.test(result.referenceCode || "")) {
        if (response.status === 409) operationId.current = null;
        throw new Error("NOT_SAVED");
      }
      setReference(result.referenceCode);
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY,
          JSON.stringify({ referenceCode: result.referenceCode, createdAt: Date.now() }));
      } catch { /* Only optional display receipt storage; CRM already committed. */ }
      const destination = channelUrl(locale, result.referenceCode, channel);
      if (handoffWindow && !handoffWindow.closed) handoffWindow.location.replace(destination);
      else window.location.assign(destination);
    } catch {
      try { handoffWindow?.close(); } catch { /* No navigation after save failure. */ }
      setError(t.error);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={styles.root} id="home-free-diagnosis" data-home-free-diagnosis-banner lang={locale}
      aria-label={t.title}>
      <div className={styles.panel}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className={styles.description}>{t.description}</p>
        </div>
        <div className={styles.photo} aria-hidden="true">
          <StaticPortrait src="/images/holistic-house/andy-about.png" alt="" width={240} height={240}
            className={styles.portrait} sizes="(max-width: 760px) 90px, 140px" loading="lazy" />
        </div>
        <ul className={styles.benefits}>
          {t.benefits.map(benefit => <li key={benefit}><Check size={14} aria-hidden="true" />{benefit}</li>)}
        </ul>
        <div className={styles.actions}>
          <button className={styles.order} type="button" onClick={() => { setOpen(value => !value); setError(""); }}
            aria-expanded={open} aria-controls={formId} data-home-diagnosis-order>
            {open ? t.close : t.order}
            {open ? <ChevronDown size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}
          </button>
          <Link className={styles.details} href={"/" + locale + "/services/free-situation-review"} prefetch={false}>
            {t.details}
          </Link>
        </div>
        <p className={styles.note}>{t.note}</p>
        <div id={formId} className={styles.request} hidden={!open} data-home-diagnosis-request>
          <div className={styles.requestHeading}>
            <strong>{t.requestTitle}</strong><span>{t.requestHint}</span>
          </div>
          {reference ? (
            <div className={styles.saved} role="status" data-lead-saved>
              <CheckCircle2 size={19} aria-hidden="true" />
              <span><strong>{t.saved}</strong> · {t.reference}: {reference}</span>
            </div>
          ) : (
            <div className={styles.contactFields}>
              <label className={styles.contactLabel} htmlFor={contactId}>{t.contact}</label>
              <input id={contactId} type="text" inputMode="text" autoComplete="email"
                maxLength={254} value={address} disabled={busy !== null}
                placeholder={t.placeholder} aria-invalid={Boolean(error)}
                onChange={event => {
                  setAddress(event.target.value); operationId.current = null; setError("");
                }} />
              <label className={styles.consent}>
                <input type="checkbox" checked={consent} disabled={busy !== null}
                  onChange={event => {
                    setConsent(event.target.checked); operationId.current = null; setError("");
                  }} />
                <span>{t.consent}</span>
              </label>
            </div>
          )}
          <div className={styles.channels}>
            {reference ? (
              <>
                <a href={channelUrl(locale, reference, "whatsapp")} target="_blank" rel="noopener noreferrer"
                  className={styles.whatsapp} data-home-diagnosis-channel="whatsapp">
                  <MessageCircle size={18} aria-hidden="true" />WhatsApp
                </a>
                <a href={channelUrl(locale, reference, "telegram")} target="_blank" rel="noopener noreferrer"
                  className={styles.telegram} data-home-diagnosis-channel="telegram">
                  <Send size={18} aria-hidden="true" />Telegram
                </a>
              </>
            ) : (
              <>
                <button type="button" className={styles.whatsapp} disabled={busy !== null}
                  onClick={() => { void chooseChannel("whatsapp"); }} data-home-diagnosis-channel="whatsapp">
                  <MessageCircle size={18} aria-hidden="true" />{busy === "whatsapp" ? t.saving : "WhatsApp"}
                </button>
                <button type="button" className={styles.telegram} disabled={busy !== null}
                  onClick={() => { void chooseChannel("telegram"); }} data-home-diagnosis-channel="telegram">
                  <Send size={18} aria-hidden="true" />{busy === "telegram" ? t.saving : "Telegram"}
                </button>
              </>
            )}
          </div>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <p className={styles.privacy}>{t.privacy}</p>
        </div>
      </div>
    </section>
  );
}
