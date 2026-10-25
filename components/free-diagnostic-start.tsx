"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { COACHING_TOPICS } from "@/lib/coaching/intake-model";
import { DIAGNOSTIC_START_KEY } from "@/lib/coaching/diagnostic-enquiry.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-diagnostic-start.module.css";

const copy = {
  en: {
    kicker: "STEP 1 OF 2 · FREE WRITTEN DIAGNOSTIC",
    miniPhone: "Phone number", miniStart: "Start free diagnosis",
    miniNote: "Your number stays in this browser tab. Nothing is sent until you finish the questions and agree.",
    title: "Tell us how to reach you",
    intro: "Choose your topic and describe your situation briefly. Next, answer Andrey's coaching questions.",
    name: "Your name (optional)", contact: "Email or phone", topic: "Your topic",
    question: "What would you like clarity about? (optional)",
    placeholder: "One or two sentences are enough", action: "Continue to coaching questionnaire",
    privacy: "These details stay in this browser tab until you explicitly send your completed questionnaire. No call is booked.",
    error: "Enter a valid email address or phone number (8–15 digits).",
  },
  ru: {
    kicker: "ШАГ 1 ИЗ 2 · БЕСПЛАТНЫЙ ПИСЬМЕННЫЙ РАЗБОР",
    miniPhone: "Номер телефона", miniStart: "Начать бесплатную диагностику",
    miniNote: "Номер пока остаётся в этой вкладке. Запрос отправится только после анкеты и вашего согласия.",
    title: "Оставьте контакты и тему",
    intro: "Уточните, что вас интересует. Затем заполните авторскую коучинговую анкету Андрея.",
    name: "Ваше имя (необязательно)", contact: "Email или телефон", topic: "Тема запроса",
    question: "Что хотите прояснить? (необязательно)",
    placeholder: "Достаточно одного-двух предложений", action: "Перейти к коучинговой анкете",
    privacy: "Контакты остаются в этой вкладке до вашей явной отправки анкеты. Запись на сессию не производится.",
    error: "Укажите корректный email или телефон (8–15 цифр).",
  },
  es: {
    kicker: "PASO 1 DE 2 · EVALUACIÓN ESCRITA GRATIS",
    miniPhone: "Número de teléfono", miniStart: "Iniciar diagnóstico gratuito",
    miniNote: "Tu número queda en esta pestaña. Solo se envía al completar las preguntas y dar tu consentimiento.",
    title: "Deja tu contacto y tu tema",
    intro: "Cuéntanos brevemente qué te preocupa. Después completa el cuestionario de coaching de Andrey.",
    name: "Tu nombre (opcional)", contact: "Email o teléfono", topic: "Tema",
    question: "¿Qué deseas aclarar? (opcional)",
    placeholder: "Bastan una o dos frases", action: "Continuar al cuestionario",
    privacy: "Los datos quedan en esta pestaña hasta que envíes expresamente el formulario. No hay reserva.",
    error: "Indica un email o teléfono válido (8–15 dígitos).",
  },
} as const;

export function FreeDiagnosticStart({ locale, variant }: { locale: PublicLocale; variant?: "coaching" }) {
  const compact = variant === "coaching";
  const t = copy[locale];
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [topic, setTopic] = useState("personal");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  function continueIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = contact.trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254 ? value : "";
    const phone = !email && /^\+?[0-9 ().-]{8,28}$/.test(value) &&
      value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15 ? value : "";
    const e164 = value.replace(/[\s().-]/g, "");
    if ((compact && !/^\+[1-9][0-9]{7,14}$/.test(e164)) || (!compact && !email && !phone)) {
      setError(compact ? (locale === "ru" ? "Введите номер с кодом страны, например +1 416…" : locale === "es" ? "Incluye el prefijo de país, por ejemplo +1 416…" : "Include your country code, e.g. +1 416…") : t.error); return;
    }
    try {
      sessionStorage.setItem(DIAGNOSTIC_START_KEY, JSON.stringify({
        createdAt: Date.now(), locale, name: compact ? "" : name.trim(), email: compact ? "" : email,
        phone: compact ? e164 : phone, topic: compact ? "personal" : topic, question: compact ? "" : question.trim(),
      }));
    } catch {
      // The questionnaire still permits entering contact details at the final consent screen.
    }
    window.location.assign("/" + locale + "/coaching/intake" + (compact ? "?guided=1" : ""));
  }
  if (compact) return <section className={styles.mini} data-coaching-phone-start data-free-diagnostic-start lang={locale}>
    <form onSubmit={continueIntake} className={styles.miniForm}>
      <label>{t.miniPhone}
        <input required type="tel" inputMode="tel" autoComplete="tel" maxLength={28}
          value={contact} onChange={event => { setContact(event.target.value); setError(""); }}
          placeholder="+1 416 555 0123" aria-invalid={Boolean(error)} />
      </label>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.action} data-free-coaching-start>{t.miniStart}<ArrowRight size={18} aria-hidden="true" /></button>
    </form>
    <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true" />{t.miniNote}</p>
  </section>;
  return <section id="free-diagnostic-start" className={styles.card} data-free-diagnostic-start lang={locale}>
    <div className={styles.heading}>
      <span className={styles.icon}><Sparkles size={21} aria-hidden="true" /></span>
      <div><p className={styles.kicker}>{t.kicker}</p><h3>{t.title}</h3><p>{t.intro}</p></div>
    </div>
    <form onSubmit={continueIntake} className={styles.form}>
      <label>{t.name}<input maxLength={120} autoComplete="name" value={name}
        onChange={event => setName(event.target.value)} /></label>
      <label>{t.contact}<input required maxLength={254} autoComplete="email" value={contact}
        onChange={event => { setContact(event.target.value); setError(""); }} placeholder="you@example.com / +1 416…" /></label>
      <label>{t.topic}<select value={topic} onChange={event => setTopic(event.target.value)}>
        {COACHING_TOPICS.map(item => <option key={item.id} value={item.id}>{item.label[locale]}</option>)}
      </select></label>
      <label className={styles.wide}>{t.question}<textarea rows={2} maxLength={400} value={question}
        placeholder={t.placeholder} onChange={event => setQuestion(event.target.value)} /></label>
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      <button type="submit" className={styles.action}>{t.action}<ArrowRight size={18} aria-hidden="true" /></button>
    </form>
    <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true" />{t.privacy}</p>
  </section>;
}
