"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/data/remedies";

const copy = {
  en: {
    name: "Name", contact: "How can I reply to you?", contactHint: "Email, Telegram, WhatsApp or another contact",
    request: "What would you like to work with?", requestHint: "A few sentences are enough.",
    submit: "Continue in WhatsApp",
    note: "Nothing is sent automatically. WhatsApp opens with your note prepared for you to review.",
    opened: "Your note is ready but not sent. Continue in WhatsApp when you want to send it.",
    telegram: "Or write in Telegram · @AndyTherapist",
  },
  ru: {
    name: "Имя", contact: "Как с вами связаться?", contactHint: "Email, Telegram, WhatsApp или другой контакт",
    request: "С чем вы хотели бы поработать?", requestHint: "Достаточно нескольких предложений.",
    submit: "Продолжить в WhatsApp",
    note: "Ничего не отправляется автоматически. WhatsApp откроется с подготовленным сообщением — вы сможете его проверить.",
    opened: "Заявка подготовлена, но ещё не отправлена. Перейдите в WhatsApp, когда захотите её отправить.",
    telegram: "Или написать в Telegram · @AndyTherapist",
  },
  es: {
    name: "Nombre", contact: "¿Cómo puedo responderte?", contactHint: "Correo electrónico, Telegram, WhatsApp u otro contacto",
    request: "¿Qué te gustaría trabajar?", requestHint: "Bastan unas pocas frases.",
    submit: "Continuar en WhatsApp",
    note: "No se envía nada automáticamente. WhatsApp se abre con tu mensaje preparado para que lo revises.",
    opened: "Tu mensaje está listo, pero no se ha enviado. Continúa en WhatsApp cuando quieras enviarlo.",
    telegram: "O escribe por Telegram · @AndyTherapist",
  },
} as const;

export function PersonalConsultationForm({ locale, service }: { locale: Locale | "es"; service?: string }) {
  const text = copy[locale];
  const [preparedUrl, setPreparedUrl] = useState("");
  const [interactive, setInteractive] = useState(false);
  useEffect(() => { setInteractive(true); }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();
    const request = String(form.get("request") ?? "").trim();
    if (!name || !request) {
      const field = event.currentTarget.elements.namedItem(!name ? "name" : "request") as HTMLInputElement | HTMLTextAreaElement;
      field.setCustomValidity(locale === "ru" ? "Пожалуйста, заполните поле." : locale === "es" ? "Completa este campo." : "Please complete this field.");
      field.reportValidity();
      return;
    }

    const message = locale === "es"
      ? ["Solicitud de consulta personal — Holistic House", service ? `Servicio: ${service}` : "", "", `Nombre: ${name}`, contact ? `Contacto preferido: ${contact}` : "", "", "Lo que me gustaría explorar:", request].filter(Boolean).join("\n")
      : locale === "ru"
        ? ["Заявка на личную консультацию — Holistic House", service ? `Услуга: ${service}` : "", "", `Имя: ${name}`, contact ? `Контакт: ${contact}` : "", "", "Запрос:", request].filter(Boolean).join("\n")
        : ["Personal consultation request — Holistic House", service ? `Service: ${service}` : "", "", `Name: ${name}`, contact ? `Preferred contact: ${contact}` : "", "", "What I would like to explore:", request].filter(Boolean).join("\n");

    const url = `https://wa.me/14376066502?text=${encodeURIComponent(message)}`;
    setPreparedUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <form className="personal-consultation-form" method="post" onSubmit={submit} onInput={() => { if (preparedUrl) setPreparedUrl(""); }} lang={locale}>
      <label><span>{text.name}</span><input autoComplete="name" name="name" required onInvalid={(event) => { if (locale === "es") event.currentTarget.setCustomValidity("Escribe tu nombre."); }} onInput={(event) => event.currentTarget.setCustomValidity("")} /></label>
      <label><span>{text.contact}</span><input autoComplete="email" name="contact" placeholder={text.contactHint} /></label>
      <label className="personal-consultation-form__wide"><span>{text.request}</span><textarea name="request" placeholder={text.requestHint} required rows={5} onInvalid={(event) => { if (locale === "es") event.currentTarget.setCustomValidity("Cuéntame qué te gustaría trabajar."); }} onInput={(event) => event.currentTarget.setCustomValidity("")} /></label>
      <div className="personal-consultation-form__actions">
        <button type="submit" disabled={!interactive} aria-busy={!interactive}>{text.submit}<span aria-hidden="true">→</span></button>
        <a href="https://t.me/AndyTherapist" rel="noreferrer" target="_blank">{text.telegram}</a>
      </div>
      <p className="personal-consultation-form__note" role="status">{preparedUrl ? text.opened : text.note}</p>
      {preparedUrl && <a className="personal-consultation-form__resume" href={preparedUrl} target="_blank" rel="noopener noreferrer">{locale === "ru" ? "Открыть готовую заявку в WhatsApp" : locale === "es" ? "Abrir la solicitud preparada en WhatsApp" : "Open prepared request in WhatsApp"}</a>}
    </form>
  );
}
