"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/data/remedies";
import styles from "@/app/[locale]/services/offerings.module.css";

const copy = {
  ru: {
    title: "Запросить бесплатную консультацию",
    intro: "Выберите тему и, если хотите, напишите пару слов о запросе. Нажатие на кнопку подготовит сообщение в WhatsApp, которое вы отправите сами. Регистрация не нужна.",
    topic: "Что хотите разобрать?",
    topicOptions: [
      { value: "goal", label: "Цель или важное решение" },
      { value: "business", label: "Бизнес / работа" },
      { value: "personal", label: "Личная проблема" },
      { value: "wellbeing", label: "Самочувствие, ресурс, психогомеопатия" },
    ],
    name: "Как к вам обращаться?",
    namePlaceholder: "Имя (необязательно)",
    situation: "Пара слов о ситуации (необязательно)",
    situationPlaceholder: "Можете оставить поле пустым и рассказать лично. Не указывайте медицинские или другие чувствительные сведения.",
    outcome: "Куда хотите прийти?",
    outcomePlaceholder: "Ваш желаемый результат (необязательно)",
    submit: "Подготовить запрос в WhatsApp",
    pending: "После нажатия откроется WhatsApp с подготовленным сообщением. Ваша заявка НЕ отправляется автоматически: проверьте сообщение и нажмите «Отправить» в WhatsApp.",
    resumed: "Запрос подготовлен, но ещё не отправлен. Если WhatsApp не открылся, перейдите по ссылке.",
    resume: "Открыть подготовленный запрос",
    telegram: "Или написать напрямую в Telegram",
    emailTip: "Это разбор личной, жизненной или деловой ситуации, а не медицинский диагноз. Продолжение и платные услуги — только по вашему решению.",
    messageTitle: "Запрос на бесплатную вводную консультацию — Holistic House",
    labels: { goal: "Цель / решение", business: "Бизнес / работа", personal: "Личная проблема", wellbeing: "Самочувствие / психогомеопатия" },
  },
  en: {
    title: "Request your free personal consultation",
    intro: "Choose a topic and, if you wish, add a short note. The button prepares a WhatsApp message for you to review and send yourself. No account required.",
    topic: "What would you like to explore?",
    topicOptions: [
      { value: "goal", label: "A goal or important decision" },
      { value: "business", label: "Business / work" },
      { value: "personal", label: "A personal difficulty" },
      { value: "wellbeing", label: "Wellbeing, energy or psychohomeopathy" },
    ],
    name: "How should I address you?",
    namePlaceholder: "First name (optional)",
    situation: "A few words about your situation (optional)",
    situationPlaceholder: "You can leave this blank and explain in person. Please avoid medical or other sensitive details.",
    outcome: "What would you like instead?",
    outcomePlaceholder: "Your desired outcome (optional)",
    submit: "Prepare request in WhatsApp",
    pending: "WhatsApp opens with your prepared message. This does NOT automatically submit a request; review it and tap Send in WhatsApp.",
    resumed: "Your request is prepared but not sent. If WhatsApp did not open, use the link.",
    resume: "Open prepared request",
    telegram: "Or write directly on Telegram",
    emailTip: "This explores a personal or business situation, not a medical diagnosis. There is no obligation to book paid work.",
    messageTitle: "Free introductory consultation request — Holistic House",
    labels: { goal: "Goal / decision", business: "Business / work", personal: "Personal difficulty", wellbeing: "Wellbeing / psychohomeopathy" },
  },
  es: {
    title: "Solicita una consulta inicial gratuita",
    intro: "Cuéntame brevemente tu situación. Leeré tu mensaje y podremos acordar una conversación introductoria gratuita para explorar qué te detiene y cuál podría ser el siguiente paso.",
    topic: "¿Qué te gustaría explorar?",
    topicOptions: [
      { value: "goal", label: "Un objetivo o una decisión importante" },
      { value: "business", label: "Negocio o trabajo" },
      { value: "personal", label: "Una dificultad personal" },
      { value: "wellbeing", label: "Bienestar, energía o psicohomeopatía" },
    ],
    name: "¿Cómo te llamas?",
    namePlaceholder: "Nombre (opcional)",
    situation: "¿En qué punto sientes que estás bloqueado/a?",
    situationPlaceholder: "¿Qué está ocurriendo y qué te cuesta cambiar?",
    outcome: "¿Qué te gustaría conseguir?",
    outcomePlaceholder: "Resultado deseado (opcional)",
    submit: "Preparar solicitud en WhatsApp",
    pending: "Se abrirá WhatsApp con tu mensaje. Revísalo y pulsa Enviar; no se envía nada sin tu confirmación.",
    resumed: "Tu mensaje está preparado, pero aún no enviado. Puedes abrirlo desde el enlace.",
    resume: "Abrir solicitud preparada",
    telegram: "O escríbeme directamente por Telegram",
    emailTip: "Esta conversación no es un diagnóstico médico. No existe obligación de contratar sesiones de pago.",
    messageTitle: "Solicitud de consulta introductoria gratuita — Holistic House",
    labels: { goal: "Objetivo o decisión", business: "Negocio o trabajo", personal: "Dificultad personal", wellbeing: "Bienestar o psicohomeopatía" },
  },
} as const;

export function FreeSituationReviewForm({ locale }: { locale: Locale | "es" }) {
  const t = copy[locale];
  const [readyUrl, setReadyUrl] = useState("");
  const [interactive, setInteractive] = useState(false);
  const [topic, setTopic] = useState<keyof typeof t.labels>("goal");
  useEffect(() => {
    const requestedTopic = new URLSearchParams(window.location.search).get("topic");
    if (requestedTopic === "wellbeing" || requestedTopic === "personal" || requestedTopic === "business" || requestedTopic === "goal") setTopic(requestedTopic);
    setInteractive(true);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const topic = String(form.get("topic") || "goal") as keyof typeof t.labels;
    const name = String(form.get("name") || "").trim().slice(0, 100);
    const situation = String(form.get("situation") || "").trim().slice(0, 900);
    const outcome = String(form.get("outcome") || "").trim().slice(0, 500);
    const message = [
      t.messageTitle,
      "",
      t.topic + ": " + (t.labels[topic] || t.labels.goal),
      name ? t.name + " " + name : "",
      situation ? t.situation + " " + situation : "",
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
        <select name="topic" required value={topic} onChange={(event) => setTopic(event.target.value as keyof typeof t.labels)}>
          {t.topicOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label>
        <span>{t.name}</span>
        <input name="name" autoComplete="given-name" maxLength={100} placeholder={t.namePlaceholder}/>
      </label>
      <label>
        <span>{t.situation}</span>
        <textarea name="situation" rows={3} maxLength={900} placeholder={t.situationPlaceholder}/>
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
