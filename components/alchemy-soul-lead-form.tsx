"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowUpRight, MessageCircle, ShieldCheck } from "lucide-react";
import type { Locale } from "@/data/remedies";
import styles from "./alchemy-soul-landing.module.css";

type Format = "60" | "30" | "month";
type Topic = "relationships" | "stress" | "business" | "direction" | "other";

const copy = {
  ru: {
    name: "Как к вам обращаться? (необязательно)",
    namePlaceholder: "Ваше имя",
    format: "Формат",
    topics: "Тема",
    formatNames: {
      "60": "Личная сессия · 60 минут · €100",
      "30": "Экспресс · 30 минут · €50",
      month: "4 недели сопровождения · обсудить условия",
    },
    topicNames: {
      relationships: "Отношения",
      stress: "Стресс и внутренние блоки",
      business: "Работа и деньги",
      direction: "Цели и смысл",
      other: "Другая тема",
    },
    action: "Подготовить запрос в WhatsApp",
    note: "Откроется черновик сообщения. Ничего не отправляется без вашего подтверждения, запись и оплата не автоматические.",
    privacy: "Не вводите здесь диагнозы или медицинские сведения — подробности обсудим лично.",
    telegram: "Или напишите мне в Telegram",
    greeting: "Здравствуйте! Хочу обсудить услугу «Алхимия души / Психогомеопатия».",
    formatField: "Формат",
    topicField: "Тема",
    nameField: "Имя",
    question: "Подскажите, пожалуйста, свободное время и следующие шаги.",
  },
  en: {
    name: "Your name (optional)",
    namePlaceholder: "How should I address you?",
    format: "Session format",
    topics: "Topic",
    formatNames: {
      "60": "Personal session · 60 min · €100",
      "30": "Express review · 30 min · €50",
      month: "Four-week support · discuss details",
    },
    topicNames: {
      relationships: "Relationships",
      stress: "Stress and inner blocks",
      business: "Work and money",
      direction: "Goals and meaning",
      other: "Another topic",
    },
    action: "Prepare WhatsApp enquiry",
    note: "WhatsApp opens a draft. You decide whether to send it; nothing is booked or charged automatically.",
    privacy: "Please don't enter diagnoses or confidential health details here. We can discuss your question directly.",
    telegram: "Or message me on Telegram",
    greeting: "Hello! I would like to ask about Alchemy of the Soul / Psycho-homeopathy.",
    formatField: "Format",
    topicField: "Topic",
    nameField: "Name",
    question: "Please let me know availability and the next steps.",
  },
} as const;

/** One simple, intentional handoff; do not capture clinical data or send automatically. */
export function AlchemySoulLeadForm({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const formId = useId();
  const [format, setFormat] = useState<Format>("60");
  const [topic, setTopic] = useState<Topic>("relationships");
  const [name, setName] = useState("");

  function prepareEnquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    const message = [
      t.greeting,
      t.formatField + ": " + t.formatNames[format],
      t.topicField + ": " + t.topicNames[topic],
      ...(name.trim() ? [t.nameField + ": " + name.trim()] : []),
      t.question,
    ].join("\n");
    // The visitor must confirm Send in WhatsApp. No form POST or server database.
    window.location.assign("https://wa.me/14376066502?text=" + encodeURIComponent(message));
  }

  return (
    <form className={styles.leadForm} data-alchemy-lead-form="single" onSubmit={prepareEnquiry}>
      <label htmlFor={formId + "-format"}>{t.format}
        <select id={formId + "-format"} value={format} onChange={(value) => setFormat(value.target.value as Format)}>
          <option value="60">{t.formatNames["60"]}</option>
          <option value="30">{t.formatNames["30"]}</option>
          <option value="month">{t.formatNames.month}</option>
        </select>
      </label>
      <label htmlFor={formId + "-topic"}>{t.topics}
        <select id={formId + "-topic"} value={topic} onChange={(value) => setTopic(value.target.value as Topic)}>
          {(["relationships", "stress", "business", "direction", "other"] as const).map(key => (
            <option value={key} key={key}>{t.topicNames[key]}</option>
          ))}
        </select>
      </label>
      <label htmlFor={formId + "-name"}>{t.name}
        <input id={formId + "-name"} name="name" autoComplete="given-name" maxLength={70} placeholder={t.namePlaceholder} value={name} onChange={(value) => setName(value.target.value)} />
      </label>
      <button type="submit" className={styles.formSubmit}><MessageCircle size={19} aria-hidden="true" />{t.action}<ArrowUpRight size={17} aria-hidden="true" /></button>
      <p className={styles.formNote}>{t.note}</p>
      <p className={styles.formPrivacy}><ShieldCheck size={14} aria-hidden="true" />{t.privacy}</p>
      <a className={styles.telegramLink} href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.telegram}<ArrowUpRight size={15} aria-hidden="true" /></a>
    </form>
  );
}
