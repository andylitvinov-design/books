"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageCircle, Send } from "lucide-react";
import { whatsappEnquiryUrl, telegramEnquiryUrlFromWhatsApp } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import { RECEIPT_SESSION_KEY } from "@/lib/practitioners/enquiry-receipt.mjs";
import styles from "./compact-lead-capture.module.css";

const copy = {
  en: {
    contact: "Your email or phone",
    placeholder: "Email or +1…",
    consent: "I agree to use my contact only for a reply to this request. No marketing.",
    action: "Send request",
    sending: "Sending…",
    notice: "Free to enquire · No booking or payment · Please do not enter health details.",
    invalid: "Enter a valid email or international phone starting with +.",
    error: "Request not saved. Please retry or contact Andrey directly.",
    direct: "Contact Andrey",
    saved: "Request received",
    next: "Andrey will reply about the next step. Nothing has been booked or charged.",
    reference: "Reference",
    messengerRequest: "I would like the free written situation review. Please send the questionnaire and drawing instructions.",
    messengerConsent: "By choosing a messenger, you agree to one personal reply about this enquiry. No marketing or automatic booking.",
    messengerPrompt: "Leave your email or phone, then choose where to write:",
    messengerSaved: "Contact recorded for a personal reply. Review and send your message in the messenger.",
    messengerSaving: "Saving…",
    messengerError: "Please enter your contact first. We cannot read it from WhatsApp or Telegram.",
  },
  ru: {
    contact: "Ваш email или телефон",
    placeholder: "Email или +1…",
    consent: "Согласен(-на) использовать контакт только для ответа на заявку, без рассылок.",
    action: "Отправить заявку",
    sending: "Отправляем…",
    notice: "Запрос бесплатный · Без записи и оплаты · Не пишите сведения о здоровье.",
    invalid: "Укажите email или номер с международным кодом +.",
    error: "Заявка не сохранена. Повторите попытку или напишите Андрею.",
    direct: "Написать Андрею",
    saved: "Заявка получена",
    next: "Андрей ответит и подскажет следующий шаг. Запись и оплата не оформлены.",
    reference: "Номер",
    messengerRequest: "Хочу получить бесплатный письменный разбор ситуации. Пришлите инструкцию к анкете и рисунку от руки.",
    messengerConsent: "Выбирая мессенджер, вы соглашаетесь на один личный ответ по этому запросу. Без рассылок и автоматической записи.",
    messengerPrompt: "Укажите email или телефон и выберите, куда написать:",
    messengerSaved: "Контакт сохранён для личного ответа. Проверьте и отправьте сообщение в мессенджере.",
    messengerSaving: "Сохраняем…",
    messengerError: "Сначала укажите контакт. Сайт не может получить его из WhatsApp или Telegram.",
  },
  es: {
    contact: "Tu correo o teléfono",
    placeholder: "Correo o +1…",
    consent: "Acepto usar mi contacto solo para responder a esta solicitud. Sin publicidad.",
    action: "Enviar solicitud",
    sending: "Enviando…",
    notice: "Consulta gratuita · Sin reserva ni pago · No incluyas datos de salud.",
    invalid: "Introduce un correo válido o un teléfono internacional con +.",
    error: "No se guardó la solicitud. Inténtalo otra vez o escribe a Andrey.",
    direct: "Contactar con Andrey",
    saved: "Solicitud recibida",
    next: "Andrey responderá sobre el siguiente paso. No se ha reservado ni cobrado nada.",
    reference: "Referencia",
    messengerRequest: "Quiero solicitar una revisión escrita gratuita. Envíame las instrucciones del cuestionario y del dibujo a mano.",
    messengerConsent: "Al elegir un mensajero, aceptas una respuesta personal a esta solicitud. Sin publicidad ni reserva automática.",
    messengerPrompt: "Escribe tu correo o teléfono y elige dónde contactar:",
    messengerSaved: "Contacto guardado para una respuesta personal. Revisa y envía el mensaje en el mensajero.",
    messengerSaving: "Guardando…",
    messengerError: "Primero escribe tu contacto. No podemos obtenerlo de WhatsApp o Telegram.",
  },
} as const;

function parseContact(raw: string): { email: string; phone: string } | null {
  const value = raw.trim();
  if (value.includes("@")) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254
      ? { email: value, phone: "" } : null;
  }
  const phone = value.replace(/[\s().-]/g, "");
  return /^\+[1-9][0-9]{7,14}$/.test(phone) ? { email: "", phone } : null;
}

/** One clear final action; a CRM lead only exists after the API confirms a DB commit. */
export function CompactLeadCapture({
  locale, serviceTitle, title, lead, id, disclaimer, sourcePath, variant,
}: {
  locale: PublicLocale;
  serviceTitle: string;
  title: string;
  lead: string;
  id?: string;
  disclaimer?: string;
  /** Trustworthy service route for a form embedded on /, which is not an allowed enquiry source. */
  sourcePath?: string;
  variant?: "inline" | "messenger";
}) {
  const t = copy[locale];
  const pathname = usePathname();
  const [address, setAddress] = useState("");
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "telegram" | null>(null);
  const messengerMode = variant === "messenger";
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const operationId = useRef<string | null>(null);

  async function saveRequest(requireCheckbox: boolean): Promise<string | null> {
    if ((requireCheckbox && !consent) || sending || reference) return null;
    const contact = parseContact(address);
    if (!contact) { setError(t.invalid); return null; }
    setSending(true);
    setError("");
    try {
      operationId.current ||= window.crypto.randomUUID();
      const response = await fetch("/api/service-enquiries", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operationId: operationId.current,
          serviceTitle,
          sourcePath: sourcePath || pathname || "/" + locale + "/services",
          locale,
          contact: { displayName: "", ...contact },
          // Tapping the channel is affirmative, reply-only consent next to the buttons.
          contactConsent: true,
          website: "",
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.saved !== true ||
          !/^HH-[A-F0-9]{12}$/.test(result.referenceCode || "")) {
        if (response.status === 409) operationId.current = null;
        throw new Error("ENQUIRY_NOT_SAVED");
      }
      setReference(result.referenceCode);
      try {
        window.sessionStorage.setItem(RECEIPT_SESSION_KEY,
          JSON.stringify({ referenceCode: result.referenceCode, createdAt: Date.now() }));
      } catch { /* Receipt storage is optional; a committed enquiry remains saved. */ }
      return result.referenceCode;
    } catch {
      setError(t.error);
      return null;
    } finally {
      setSending(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveRequest(true);
  }

  // Only the non-sensitive service and generated reference travel to the messenger.
  // The visitor must still press Send there; a handoff is not a confirmed chat.
  function messengerUrl(channel: "whatsapp" | "telegram", code: string) {
    const url = new URL(whatsappEnquiryUrl({
      locale, service: serviceTitle, request: t.messengerRequest,
      pagePath: sourcePath || pathname || "/" + locale + "/services",
    }));
    url.searchParams.set("text", (url.searchParams.get("text") || "") + "\n\n" + t.reference + ": " + code);
    return channel === "whatsapp" ? url.toString() : telegramEnquiryUrlFromWhatsApp(url.toString());
  }

  async function openMessenger(channel: "whatsapp" | "telegram") {
    if (sending) return;
    setActiveChannel(channel);
    const code = reference || await saveRequest(false);
    if (!code) { setActiveChannel(null); return; }
    // Same-tab navigation works after an awaited POST and avoids popup blockers on iPhone.
    window.location.assign(messengerUrl(channel, code));
  }

  return (
    <section id={id} className={[styles.section, variant === "inline" ? styles.inline : "", messengerMode ? styles.messengerInline : ""].filter(Boolean).join(" ")}
      data-compact-last-slide={variant === "inline" || messengerMode ? undefined : ""}
      data-inline-offer-form={variant === "inline" ? "" : undefined}
      data-messenger-lead-capture={messengerMode ? "" : undefined} data-service-lead-capture
      lang={locale} aria-label={title}>
      <div className={styles.head}>
        <h2>{title}</h2>
        <p>{lead}</p>
      </div>
      {reference ? (
        <div className={styles.receipt} role="status" data-lead-saved>
          <CheckCircle2 size={25} aria-hidden="true" />
          <strong>{t.saved}</strong>
          <p>{messengerMode ? t.messengerSaved : t.next}</p>
          <small>{t.reference}: {reference}</small>
          {messengerMode ? (
            <div className={styles.messengerChannels} role="group" aria-label={t.messengerPrompt}>
              <a href={messengerUrl("whatsapp", reference)} target="_blank" rel="noopener noreferrer"
                data-messenger-saved-channel="whatsapp"><MessageCircle size={17} aria-hidden="true" />WhatsApp</a>
              <a href={messengerUrl("telegram", reference)} target="_blank" rel="noopener noreferrer"
                data-messenger-saved-channel="telegram"><Send size={17} aria-hidden="true" />Telegram</a>
            </div>
          ) : null}
        </div>
      ) : messengerMode ? (
        <div className={styles.messengerForm} data-compact-messenger-form aria-busy={sending}>
          <label className={styles.field}>
            <span>{t.contact}</span>
            <input type="text" name="contact" inputMode="text" autoComplete="off"
              value={address} maxLength={254} placeholder={t.placeholder} disabled={sending}
              onChange={event => { setAddress(event.target.value); operationId.current = null; setError(""); }} />
          </label>
          <p className={styles.messengerPrompt}>{t.messengerPrompt}</p>
          <div className={styles.messengerChannels} role="group" aria-label={t.messengerPrompt}>
            <button type="button" disabled={sending} data-messenger-intake="whatsapp"
              onClick={() => { void openMessenger("whatsapp"); }}>
              <MessageCircle size={18} aria-hidden="true" />
              {sending && activeChannel === "whatsapp" ? t.messengerSaving : "WhatsApp"}
            </button>
            <button type="button" disabled={sending} data-messenger-intake="telegram"
              onClick={() => { void openMessenger("telegram"); }}>
              <Send size={18} aria-hidden="true" />
              {sending && activeChannel === "telegram" ? t.messengerSaving : "Telegram"}
            </button>
          </div>
          <p className={styles.messengerConsent}>{t.messengerConsent}</p>
          {error ? <p className={styles.error} role="alert">{error} {t.messengerError}</p> : null}
        </div>
      ) : (
        <form className={styles.form} onSubmit={event => { void submit(event); }} data-compact-lead-form>
          <div className={styles.fieldRow}>
            <label className={styles.field}>
              <span>{t.contact}</span>
              <input type="text" name="contact" inputMode="email" autoComplete="off"
                value={address} maxLength={254} required placeholder={t.placeholder}
                onChange={event => { setAddress(event.target.value); operationId.current = null; setError(""); }} />
            </label>
            <button className={styles.submit} type="submit" disabled={!consent || sending}>
              {sending ? t.sending : t.action}<ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <label className={styles.consent}>
            <input type="checkbox" required checked={consent}
              onChange={event => { setConsent(event.target.checked); operationId.current = null; setError(""); }} />
            <span>{t.consent}</span>
          </label>
          <p className={styles.notice}>{t.notice}</p>
          {error ? <p className={styles.error} role="alert">{error}{" "}
            <Link href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.direct}</Link>
          </p> : null}
        </form>
      )}
      {disclaimer ? <p className={styles.disclaimer}>{disclaimer}</p> : null}
    </section>
  );
}
