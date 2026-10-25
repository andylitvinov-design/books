"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { DIAGNOSTIC_START_KEY } from "@/lib/coaching/diagnostic-enquiry.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-diagnosis-short-form.module.css";

const copy = {
  en: {
    kicker: "FREE · WRITTEN SITUATION REVIEW",
    title: "Start your free diagnosis",
    phone: "Your phone number",
    button: "Start free diagnosis",
    next: "Next: briefly describe your situation, then answer the coaching questions.",
    privacy: "Your number stays in this tab until you choose to send your questionnaire.",
    error: "Enter a valid phone number (8–15 digits).",
  },
  ru: {
    kicker: "БЕСПЛАТНО · ПИСЬМЕННЫЙ РАЗБОР",
    title: "Начать бесплатную диагностику",
    phone: "Номер телефона",
    button: "Начать бесплатную диагностику",
    next: "Дальше: коротко опишите ситуацию и ответьте на коучинговые вопросы.",
    privacy: "Телефон остаётся в этой вкладке до отправки заполненной анкеты.",
    error: "Укажите корректный номер телефона (8–15 цифр).",
  },
  es: {
    kicker: "GRATIS · REVISIÓN ESCRITA",
    title: "Comienza tu diagnóstico gratis",
    phone: "Número de teléfono",
    button: "Empezar diagnóstico gratis",
    next: "Después: describe brevemente tu situación y responde las preguntas de coaching.",
    privacy: "Tu número permanece en esta pestaña hasta que decidas enviar el cuestionario.",
    error: "Introduce un número válido de 8 a 15 dígitos.",
  },
} as const;

export function FreeDiagnosisShortForm({
  locale, phone, onPhoneChange,
}: { locale: PublicLocale; phone: string; onPhoneChange: (value: string) => void }) {
  const t = copy[locale];
  const [error, setError] = useState("");

  function continueIntake(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = phone.trim();
    const digits = value.replace(/\D/g, "");
    if (!/^\+?[0-9 ().-]{8,28}$/.test(value) || digits.length < 8 || digits.length > 15) {
      setError(t.error);
      return;
    }
    try {
      sessionStorage.setItem(DIAGNOSTIC_START_KEY, JSON.stringify({
        createdAt: Date.now(), locale, name: "", email: "", phone: value, topic: "personal", question: "",
      }));
    } catch {
      // The coaching intake offers another contact entry before explicit submission.
    }
    window.location.assign("/" + locale + "/coaching/intake");
  }

  return (
    <section className={styles.card} data-free-diagnosis-short-form lang={locale}>
      <div className={styles.heading}>
        <span className={styles.icon}><Sparkles size={19} aria-hidden="true" /></span>
        <div>
          <p className={styles.kicker}>{t.kicker}</p>
          <h3>{t.title}</h3>
        </div>
      </div>
      <form className={styles.form} onSubmit={continueIntake}>
        <label>
          <span>{t.phone}</span>
          <input type="tel" name="phone" inputMode="tel" autoComplete="tel"
            required maxLength={28} value={phone} placeholder="+1 416 555 0123"
            aria-invalid={Boolean(error)}
            onChange={event => { onPhoneChange(event.target.value); setError(""); }} />
        </label>
        <button type="submit" className={styles.action}>
          {t.button}<ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <p className={styles.next}>{t.next}</p>
      <p className={styles.privacy}><LockKeyhole size={13} aria-hidden="true" />{t.privacy}</p>
    </section>
  );
}
