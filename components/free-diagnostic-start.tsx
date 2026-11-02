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
    title: "Deja tu contacto y tu tema",
    intro: "Cuéntanos brevemente qué te preocupa. Después completa el cuestionario de coaching de Andrey.",
    name: "Tu nombre (opcional)", contact: "Email o teléfono", topic: "Tema",
    question: "¿Qué deseas aclarar? (opcional)",
    placeholder: "Bastan una o dos frases", action: "Continuar al cuestionario",
    privacy: "Los datos quedan en esta pestaña hasta que envíes expresamente el formulario. No hay reserva.",
    error: "Indica un email o teléfono válido (8–15 dígitos).",
  },
} as const;

const concise = {
  en: { intro: "Only your phone is needed to begin. Next you will briefly describe your question, then answer the coaching questionnaire.", phone: "Phone number", action: "Start free diagnosis", error: "Enter a phone number with 8–15 digits." },
  ru: { intro: "Для начала нужен только телефон. Затем вы кратко опишете запрос и ответите на вопросы коучинговой анкеты.", phone: "Номер телефона", action: "Начать бесплатную диагностику", error: "Укажите номер телефона: 8–15 цифр." },
  es: { intro: "Solo necesitas dejar tu teléfono. Después describirás tu pregunta y completarás el cuestionario.", phone: "Teléfono", action: "Comenzar diagnóstico gratis", error: "Introduce un teléfono de 8 a 15 dígitos." },
} as const;

export function FreeDiagnosticStart({ locale, compact = false, id = "free-diagnostic-start", contactValue, onContactChange }: {
  locale: PublicLocale; compact?: boolean; id?: string; contactValue?: string; onContactChange?: (value: string) => void;
}) {
  const t = copy[locale];
  const [name, setName] = useState("");
  const [localContact, setLocalContact] = useState("");
  const contact = contactValue ?? localContact;
  const setContact = (value: string) => {
    if (onContactChange) onContactChange(value);
    else setLocalContact(value);
  };
  const [topic, setTopic] = useState("personal");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  function continueIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = contact.trim();
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254 ? value : "";
    const phone = !email && /^\+?[0-9 ().-]{8,28}$/.test(value) &&
      value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15 ? value : "";
    if ((compact && !phone) || (!email && !phone)) { setError(compact ? concise[locale].error : t.error); return; }
    try {
      sessionStorage.setItem(DIAGNOSTIC_START_KEY, JSON.stringify({
        createdAt: Date.now(), locale, name: name.trim(), email, phone, topic, question: question.trim(),
      }));
    } catch {
      // The questionnaire still permits entering contact details at the final consent screen.
    }
    window.location.assign("/" + locale + "/coaching/intake");
  }
  if (compact) {
    const short = concise[locale];
    return <section id={id} className={[styles.card, styles.compact].join(" ")}
      data-free-diagnostic-start data-free-diagnostic-phone-only lang={locale}>
      <p className={styles.kicker}>{t.kicker}</p>
      <p className={styles.compactIntro}>{short.intro}</p>
      <form className={styles.compactForm} onSubmit={continueIntake}>
        <label>{short.phone}
          <input type="tel" inputMode="tel" autoComplete="tel" required maxLength={28}
            value={contact} placeholder="+1 416…"
            onChange={event => { setContact(event.target.value); setError(""); }} />
        </label>
        {error ? <p role="alert" className={styles.error}>{error}</p> : null}
        <button type="submit" className={styles.action}>{short.action}<ArrowRight size={18} aria-hidden="true" /></button>
      </form>
      <p className={styles.privacy}><LockKeyhole size={15} aria-hidden="true" />{t.privacy}</p>
    </section>;
  }

  return <section id={id} className={styles.card} data-free-diagnostic-start lang={locale}>
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
