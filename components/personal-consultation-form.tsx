"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/data/remedies";

const copy = {
  en: {
    name: "Name", contact: "How can I reply to you?", contactHint: "Email, Telegram, WhatsApp or another contact",
    request: "What would you like to work with?", requestHint: "A few sentences are enough.",
    submit: "Request a personal consultation",
    note: "The button opens WhatsApp with your request prepared. Review it and tap Send.",
    opened: "Your request is prepared, not sent. Continue in WhatsApp and tap Send.",
    telegram: "Prefer Telegram? Message Andy",
  },
  ru: {
    name: "Имя", contact: "Как с вами связаться?", contactHint: "Email, Telegram, WhatsApp или другой контакт",
    request: "С чем вы хотели бы поработать?", requestHint: "Достаточно нескольких предложений.",
    submit: "Оставить заявку на личную консультацию",
    note: "Кнопка откроет WhatsApp с готовым текстом заявки. Проверьте сообщение и нажмите «Отправить».",
    opened: "Заявка подготовлена, но ещё не отправлена. Перейдите в WhatsApp и нажмите «Отправить».",
    telegram: "Удобнее Telegram? Написать Andy",
  },
  es: {
    name: "Nombre", contact: "¿Cómo puedo responderte?", contactHint: "Correo electrónico, Telegram, WhatsApp u otro contacto",
    request: "¿Qué te gustaría trabajar?", requestHint: "Bastan unas pocas frases.",
    submit: "Solicitar una consulta personal",
    note: "El botón abre WhatsApp con tu solicitud preparada. Revisa el mensaje y pulsa Enviar.",
    opened: "Tu solicitud está preparada, pero aún no se ha enviado. Continúa en WhatsApp y pulsa Enviar.",
    telegram: "¿Prefieres Telegram? Escribe a Andy",
  },
} as const;

export function PersonalConsultationForm({ locale }: { locale: Locale | "es" }) {
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
      ? ["Solicitud de consulta personal — Holistic House", "", `Nombre: ${name}`, contact ? `Contacto preferido: ${contact}` : "", "", "Lo que me gustaría explorar:", request].filter(Boolean).join("\n")
      : locale === "ru"
        ? ["Заявка на личную консультацию — Holistic House", "", `Имя: ${name}`, contact ? `Контакт: ${contact}` : "", "", "Запрос:", request].filter(Boolean).join("\n")
        : ["Personal consultation request — Holistic House", "", `Name: ${name}`, contact ? `Preferred contact: ${contact}` : "", "", "What I would like to explore:", request].filter(Boolean).join("\n");

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
