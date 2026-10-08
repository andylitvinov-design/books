"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/data/remedies";
import styles from "@/app/[locale]/services/offerings.module.css";

const copy = {
  ru: {
    title: "Запросить бесплатную диагностику ситуации",
    intro: "Опишите коротко вашу ситуацию. Я прочту ваш запрос, и мы сможем обсудить, где возникает затруднение и какое направление работы может подойти.",
    topic: "Что хотите разобрать?",
    topicOptions: [
      { value: "goal", label: "Цель или важное решение" },
      { value: "business", label: "Бизнес / работа" },
      { value: "personal", label: "Личная проблема" },
    ],
    name: "Как к вам обращаться?",
    namePlaceholder: "Имя (необязательно)",
    situation: "Где сейчас ощущается точка ступора?",
    situationPlaceholder: "Что происходит и что не удаётся сдвинуть?",
    outcome: "Куда хотите прийти?",
    outcomePlaceholder: "Ваш желаемый результат (необязательно)",
    submit: "Подготовить запрос в WhatsApp",
    pending: "Откроется WhatsApp с вашим сообщением. Проверьте его и нажмите «Отправить» — до этого ничего не отправляется.",
    resumed: "Запрос подготовлен, но ещё не отправлен. Если WhatsApp не открылся, перейдите по ссылке.",
    resume: "Открыть подготовленный запрос",
    telegram: "Или написать напрямую в Telegram",
    emailTip: "Это разбор личной, жизненной или деловой ситуации, а не медицинский диагноз. Продолжение и платные услуги — только по вашему решению.",
    messageTitle: "Запрос на бесплатную диагностику ситуации — Holistic House",
    labels: { goal: "Цель / решение", business: "Бизнес / работа", personal: "Личная проблема" },
  },
  en: {
    title: "Request your free situation assessment",
    intro: "Tell me briefly what is happening. I can review your question and discuss where you feel stuck, possible growth areas and which kind of personal work may suit you.",
    topic: "What would you like to explore?",
    topicOptions: [
      { value: "goal", label: "A goal or important decision" },
      { value: "business", label: "Business / work" },
      { value: "personal", label: "A personal difficulty" },
    ],
    name: "How should I address you?",
    namePlaceholder: "First name (optional)",
    situation: "Where do you feel stuck?",
    situationPlaceholder: "What is happening and what is not moving forward?",
    outcome: "What would you like instead?",
    outcomePlaceholder: "Your desired outcome (optional)",
    submit: "Prepare request in WhatsApp",
    pending: "WhatsApp will open with your message. Review it and tap Send — nothing is sent before you confirm.",
    resumed: "Your request is prepared but not sent. If WhatsApp did not open, use the link.",
    resume: "Open prepared request",
    telegram: "Or write directly on Telegram",
    emailTip: "This explores a personal or business situation, not a medical diagnosis. There is no obligation to book paid work.",
    messageTitle: "Free situation assessment request — Holistic House",
    labels: { goal: "Goal / decision", business: "Business / work", personal: "Personal difficulty" },
  },
} as const;

export function FreeSituationReviewForm({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [readyUrl, setReadyUrl] = useState("");
  const [interactive, setInteractive] = useState(false);
  useEffect(() => setInteractive(true), []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const topic = String(form.get("topic") || "goal") as keyof typeof t.labels;
    const name = String(form.get("name") || "").trim().slice(0, 100);
    const situation = String(form.get("situation") || "").trim().slice(0, 900);
    const outcome = String(form.get("outcome") || "").trim().slice(0, 500);
    if (!situation) return;
    const message = [
      t.messageTitle,
      "",
      t.topic + ": " + (t.labels[topic] || t.labels.goal),
      name ? t.name + " " + name : "",
      t.situation + " " + situation,
      outcome ? t.outcome + " " + outcome : "",
    ].filter(Boolean).join("\n");
    const url = "https://wa.me/14376066502?text=" + encodeURIComponent(message);
    setReadyUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <form className={styles.form} onSubmit={submit} onInput={() => setReadyUrl("")} aria-labelledby="review-form-title">
      <h2 id="review-form-title">{t.title}</h2>
      <p>{t.intro}</p>
      <label>
        <span>{t.topic}</span>
        <select name="topic" required defaultValue="goal">
          {t.topicOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>{t.name}</span>
        <input name="name" autoComplete="given-name" maxLength={100} placeholder={t.namePlaceholder}/>
      </label>
      <label>
        <span>{t.situation}</span>
        <textarea name="situation" required rows={4} maxLength={900} placeholder={t.situationPlaceholder}/>
      </label>
      <label>
        <span>{t.outcome}</span>
        <textarea name="outcome" rows={2} maxLength={500} placeholder={t.outcomePlaceholder}/>
      </label>
      <button type="submit" disabled={!interactive} aria-busy={!interactive}>{t.submit}<span aria-hidden="true">→</span></button>
      <p className={styles.formNote} role="status">{readyUrl ? t.resumed : t.pending}</p>
      {readyUrl && <a href={readyUrl} target="_blank" rel="noopener noreferrer">{t.resume}</a>}
      <a href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer">{t.telegram}</a>
      <p className={styles.disclaimer}>{t.emailTip}</p>
    </form>
  );
}
