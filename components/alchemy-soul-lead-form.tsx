"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowUpRight, MessageCircle, ShieldCheck } from "lucide-react";

import type { Locale } from "@/data/remedies";
import styles from "./alchemy-soul-landing.module.css";

type Duration = "60" | "30";
type Placement = "hero" | "final";

const copy = {
  ru: {
    titleHero: "Расскажите, что вас беспокоит",
    titleFinal: "Начнём с вашего запроса",
    leadHero: "Опишите ситуацию в нескольких предложениях. Я отвечу лично и помогу выбрать подходящий формат.",
    leadFinal: "Не нужно заранее разбираться в методах. Напишите, что сейчас важно — обсудим первый шаг.",
    name: "Ваше имя",
    namePlaceholder: "Как к вам обращаться",
    contact: "Как с вами связаться",
    contactPlaceholder: "Telegram, WhatsApp или e-mail",
    topic: "Ваш запрос",
    topicPlaceholder: "Что повторяется, не получается или удерживает вас на месте?",
    duration: "Предпочтительный формат",
    hour: "Личная сессия · 60 минут · €100",
    half: "Экспресс-сессия · 30 минут · €50",
    action: "Отправить запрос в WhatsApp",
    note: "Откроется WhatsApp с подготовленным сообщением. Оно отправится только после вашего подтверждения; заявка не означает запись или оплату.",
    safety: "Не указывайте здесь диагнозы или конфиденциальные медицинские данные.",
    subject: "Заявка с сайта Holistic House — Алхимия души",
    durationField: "Формат",
    nameField: "Имя",
    contactField: "Контакт для ответа",
    topicField: "Запрос",
    referral: "Услуга: Алхимия души",
    alternate: "Или напишите в Telegram",
  },
  en: {
    titleHero: "Tell me what is on your mind",
    titleFinal: "Start with your situation",
    leadHero: "Describe what is happening in a few sentences. I will respond personally and help you choose a suitable format.",
    leadFinal: "You do not need to choose the method yourself. Share what feels important and we can discuss a first step.",
    name: "Your name",
    namePlaceholder: "How should I address you?",
    contact: "Preferred contact",
    contactPlaceholder: "Telegram, WhatsApp or email",
    topic: "Your question",
    topicPlaceholder: "What feels stuck, repeated or difficult to move forward?",
    duration: "Preferred format",
    hour: "Personal session · 60 minutes · €100",
    half: "Express session · 30 minutes · €50",
    action: "Prepare WhatsApp enquiry",
    note: "WhatsApp opens with a prepared message. Nothing is sent until you confirm. An enquiry is not a booking or payment.",
    safety: "Please do not share diagnoses or confidential medical information in this form.",
    subject: "Holistic House enquiry — Alchemy of the Soul",
    durationField: "Format",
    nameField: "Name",
    contactField: "Contact",
    topicField: "Question",
    referral: "Service: Alchemy of the Soul",
    alternate: "Or message me on Telegram",
  },
} as const;

export function AlchemySoulLeadForm({ locale, placement }: { locale: Locale; placement: Placement }) {
  const t = copy[locale];
  const fieldId = useId();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState<Duration>("60");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;

    const message = [
      t.subject,
      t.referral,
      t.nameField + ": " + name.trim(),
      t.contactField + ": " + contact.trim(),
      t.durationField + ": " + (duration === "60" ? t.hour : t.half),
      t.topicField + ": " + topic.trim(),
    ].join("\n");
    // No hidden client database: the visitor reviews and sends the enquiry in WhatsApp.
    window.location.assign("https://wa.me/14376066502?text=" + encodeURIComponent(message));
  }

  return (
    <form
      className={styles.leadForm}
      id={placement === "hero" ? "alchemy-request" : "alchemy-request-bottom"}
      onSubmit={handleSubmit}
      data-alchemy-lead-form={placement}
    >
      <div className={styles.leadFormHeader}>
        <span className={styles.leadFormIcon} aria-hidden="true"><MessageCircle size={21} /></span>
        <div>
          <h2>{placement === "hero" ? t.titleHero : t.titleFinal}</h2>
          <p>{placement === "hero" ? t.leadHero : t.leadFinal}</p>
        </div>
      </div>
      <div className={styles.formFields}>
        <label htmlFor={fieldId + "-name"}>{t.name}
          <input
            id={fieldId + "-name"}
            type="text"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.namePlaceholder}
            autoComplete="name"
            maxLength={90}
            required
          />
        </label>
        <label htmlFor={fieldId + "-contact"}>{t.contact}
          <input
            id={fieldId + "-contact"}
            type="text"
            name="contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder={t.contactPlaceholder}
            autoComplete="off"
            maxLength={120}
            required
          />
        </label>
        <label className={styles.formFullWidth} htmlFor={fieldId + "-topic"}>{t.topic}
          <textarea
            id={fieldId + "-topic"}
            name="topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder={t.topicPlaceholder}
            rows={3}
            minLength={10}
            maxLength={1100}
            required
          />
        </label>
        <label className={styles.formFullWidth} htmlFor={fieldId + "-duration"}>{t.duration}
          <select
            id={fieldId + "-duration"}
            name="duration"
            value={duration}
            onChange={(event) => setDuration(event.target.value as Duration)}
          >
            <option value="60">{t.hour}</option>
            <option value="30">{t.half}</option>
          </select>
        </label>
      </div>
      <button className={styles.formSubmit} type="submit">
        {t.action}<ArrowUpRight size={19} aria-hidden="true" />
      </button>
      <p className={styles.formNote}>{t.note}</p>
      <p className={styles.formSafety}><ShieldCheck size={14} aria-hidden="true" />{t.safety}</p>
      <a className={styles.formTelegram} href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">
        {t.alternate}<ArrowUpRight size={15} aria-hidden="true" />
      </a>
    </form>
  );
}
