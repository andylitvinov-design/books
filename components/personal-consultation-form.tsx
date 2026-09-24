"use client";

import { FormEvent, useState } from "react";

import type { Locale } from "@/data/remedies";

const copy = {
  en: {
    name: "Name",
    contact: "How can I reply to you?",
    contactHint: "Email, Telegram, WhatsApp or another contact",
    request: "What would you like to work with?",
    requestHint: "A few sentences are enough.",
    submit: "Request a personal consultation",
    note: "The button opens WhatsApp with your request prepared. Review it and tap Send.",
    opened: "WhatsApp opened with your request. Send the prepared message to complete it.",
    telegram: "Prefer Telegram? Message Andy",
  },
  ru: {
    name: "Имя",
    contact: "Как с вами связаться?",
    contactHint: "Email, Telegram, WhatsApp или другой контакт",
    request: "С чем вы хотели бы поработать?",
    requestHint: "Достаточно нескольких предложений.",
    submit: "Оставить заявку на личную консультацию",
    note: "Кнопка откроет WhatsApp с готовым текстом заявки. Проверьте сообщение и нажмите «Отправить».",
    opened: "WhatsApp открыт с готовой заявкой. Отправьте сообщение, чтобы завершить заявку.",
    telegram: "Удобнее Telegram? Написать Andy",
  },
} as const;

export function PersonalConsultationForm({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [opened, setOpened] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const contact = String(form.get("contact") ?? "").trim();
    const request = String(form.get("request") ?? "").trim();

    if (!name || !request) return;

    const message = locale === "ru"
      ? [
          "Заявка на личную консультацию — Holistic House",
          "",
          `Имя: ${name}`,
          contact ? `Контакт: ${contact}` : "",
          "",
          "Запрос:",
          request,
        ].filter(Boolean).join("\n")
      : [
          "Personal consultation request — Holistic House",
          "",
          `Name: ${name}`,
          contact ? `Preferred contact: ${contact}` : "",
          "",
          "What I would like to explore:",
          request,
        ].filter(Boolean).join("\n");

    window.open(
      `https://wa.me/14376066502?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
    setOpened(true);
  }

  return (
    <form className="personal-consultation-form" onSubmit={submit}>
      <label>
        <span>{text.name}</span>
        <input autoComplete="name" name="name" required />
      </label>

      <label>
        <span>{text.contact}</span>
        <input autoComplete="email" name="contact" placeholder={text.contactHint} />
      </label>

      <label className="personal-consultation-form__wide">
        <span>{text.request}</span>
        <textarea name="request" placeholder={text.requestHint} required rows={5} />
      </label>

      <div className="personal-consultation-form__actions">
        <button type="submit">{text.submit}<span aria-hidden="true">→</span></button>
        <a href="https://t.me/AndyTherapist" rel="noreferrer" target="_blank">{text.telegram}</a>
      </div>

      <p className="personal-consultation-form__note" role="status">
        {opened ? text.opened : text.note}
      </p>
    </form>
  );
}
