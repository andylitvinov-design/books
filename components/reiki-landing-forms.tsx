"use client";

import { useState, type FormEvent } from "react";
import type { PublicLocale } from "@/lib/public-locales";

type Kind = "first-level" | "consultation";
const copy = {
  en: {
    freeEyebrow: "A gift to begin your journey", freeTitle: "Your first Reiki Yggdrasil level — free",
    freeLead: "Curious about the practice? Tell me a little about yourself in two quick answers and request complimentary access to Level 1.",
    consultEyebrow: "A personal invitation", consultTitle: "A free conversation about your situation",
    consultLead: "Not sure which practice or direction is right for you? Share what's on your mind and request a personal introductory conversation. No obligation.",
    name: "Your name", contact: "How can I reply?", contactHint: "Email, WhatsApp or Telegram",
    why: "What draws you to Reiki Yggdrasil?", experience: "Have you practised Reiki before?",
    whyOptions: ["Meditation and self-discovery", "Runes and ancient symbolism", "Learning a new practice", "Exploring the training programme"],
    experienceOptions: ["I am completely new", "I have tried some practices", "I have Reiki experience"],
    situation: "What would you like to explore together?", situationHint: "A few sentences about your question are enough.",
    submitFree: "Request my free Level 1", submitConsult: "Request free consultation",
    note: "Your answers stay in your browser until you choose to send them in WhatsApp. No request is sent automatically.",
    ready: "Your message is prepared. Open WhatsApp and press Send to complete your request.",
    open: "Open my prepared WhatsApp message", choose: "Select an answer",
  },
  ru: {
    freeEyebrow: "Подарок для начала пути", freeTitle: "Первая ступень Рейки Иггдрасиль — бесплатно",
    freeLead: "Хотите познакомиться с практикой? Ответьте всего на два вопроса и отправьте заявку на бесплатный доступ к первой ступени.",
    consultEyebrow: "Личное приглашение", consultTitle: "Бесплатная беседа — разбор вашей ситуации",
    consultLead: "Не знаете, с чего начать? Расскажите о своём запросе и оставьте заявку на личную вводную консультацию без обязательств.",
    name: "Ваше имя", contact: "Как с вами связаться?", contactHint: "Email, WhatsApp или Telegram",
    why: "Что вас привлекает в Рейки Иггдрасиль?", experience: "Есть ли у вас опыт Рейки?",
    whyOptions: ["Медитация и самопознание", "Руны и древние символы", "Освоение новой практики", "Интерес к программе обучения"],
    experienceOptions: ["Я только начинаю", "Пробовал(а) отдельные практики", "У меня уже есть опыт Рейки"],
    situation: "Какой вопрос вы хотели бы обсудить?", situationHint: "Нескольких предложений достаточно.",
    submitFree: "Получить первую ступень бесплатно", submitConsult: "Записаться на бесплатную консультацию",
    note: "Ваши ответы не отправляются автоматически. Сначала откроется черновик сообщения WhatsApp, который нужно отправить вручную.",
    ready: "Сообщение готово. Откройте WhatsApp и нажмите «Отправить».",
    open: "Открыть подготовленное сообщение", choose: "Выберите ответ",
  },
  es: {
    freeEyebrow: "Un regalo para comenzar", freeTitle: "Tu primer nivel de Reiki Yggdrasil — gratis",
    freeLead: "Responde dos preguntas breves y solicita acceso gratuito al Nivel 1.",
    consultEyebrow: "Una invitación personal", consultTitle: "Una conversación inicial gratuita",
    consultLead: "Cuéntame tu situación y solicita una conversación introductoria, sin compromiso.",
    name: "Tu nombre", contact: "¿Cómo puedo responder?", contactHint: "Correo, WhatsApp o Telegram",
    why: "¿Qué te atrae de Reiki Yggdrasil?", experience: "¿Has practicado Reiki antes?",
    whyOptions: ["Meditación y autoconocimiento", "Runas y simbolismo antiguo", "Aprender una práctica", "Explorar el programa de formación"],
    experienceOptions: ["Estoy empezando", "He probado algunas prácticas", "Tengo experiencia en Reiki"],
    situation: "¿Qué te gustaría explorar juntos?", situationHint: "Bastan unas pocas frases.",
    submitFree: "Solicitar mi Nivel 1 gratis", submitConsult: "Solicitar consulta gratuita",
    note: "Nada se envía automáticamente. WhatsApp abre un borrador que debes enviar tú mismo.",
    ready: "Tu mensaje está preparado. Abre WhatsApp y pulsa Enviar.",
    open: "Abrir el mensaje preparado", choose: "Elige una respuesta",
  },
} as const;

function ReikiInquiryForm({ locale, kind, course }: { locale: PublicLocale; kind: Kind; course: string }) {
  const c = copy[locale];
  const [preparedUrl, setPreparedUrl] = useState("");
  const isFree = kind === "first-level";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim().slice(0, 100);
    const contact = String(data.get("contact") || "").trim().slice(0, 160);
    const title = isFree ? c.freeTitle : c.consultTitle;
    const answers = isFree
      ? [c.why + ": " + String(data.get("motivation") || ""), c.experience + ": " + String(data.get("experience") || "")]
      : [c.situation + ": " + String(data.get("situation") || "").trim().slice(0, 1200)];
    if (!name || !contact || answers.some((value) => value.endsWith(": "))) return;
    const message = [
      "Holistic House — " + title, "Course: " + course, "Language: " + locale, "",
      c.name + ": " + name, c.contact + ": " + contact, "", ...answers,
    ].join("\n");
    const url = "https://wa.me/14376066502?text=" + encodeURIComponent(message);
    setPreparedUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <form className={"reiki-offer-card " + (isFree ? "reiki-offer-card--gift" : "reiki-offer-card--consult")} onSubmit={submit} onInput={() => setPreparedUrl("")} data-reiki-form={kind}>
      <header>
        <span className="reiki-offer-card__eyebrow">{isFree ? c.freeEyebrow : c.consultEyebrow}</span>
        <h3>{isFree ? c.freeTitle : c.consultTitle}</h3>
        <p>{isFree ? c.freeLead : c.consultLead}</p>
      </header>
      <div className="reiki-offer-card__fields">
        <label><span>{c.name}</span><input name="name" autoComplete="name" required maxLength={100} placeholder={c.name} /></label>
        <label><span>{c.contact}</span><input name="contact" required maxLength={160} placeholder={c.contactHint} /></label>
        {isFree ? (
          <>
            <label><span>1. {c.why}</span><select name="motivation" required defaultValue=""><option value="" disabled>{c.choose}</option>{c.whyOptions.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></label>
            <label><span>2. {c.experience}</span><select name="experience" required defaultValue=""><option value="" disabled>{c.choose}</option>{c.experienceOptions.map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select></label>
          </>
        ) : (
          <label><span>{c.situation}</span><textarea name="situation" required maxLength={1200} rows={3} placeholder={c.situationHint} /></label>
        )}
      </div>
      <button className="reiki-offer-card__submit" type="submit">{isFree ? c.submitFree : c.submitConsult} <span aria-hidden="true">→</span></button>
      <p className="reiki-offer-card__note" role="status">{preparedUrl ? c.ready : c.note}</p>
      {preparedUrl ? <a className="reiki-offer-card__resume" href={preparedUrl} target="_blank" rel="noopener noreferrer">{c.open} ↗</a> : null}
    </form>
  );
}

export function YggdrasilLeadForms({ locale }: { locale: PublicLocale }) {
  return (
    <section className="reiki-landing-forms" id="reiki-free-level-one" aria-label={locale === "ru" ? "Бесплатная первая ступень и консультация" : locale === "es" ? "Primer nivel gratis y consulta" : "Free Reiki Level 1 and personal consultation"}>
      <ReikiInquiryForm locale={locale} kind="first-level" course="Reiki Yggdrasil" />
      <div id="reiki-free-consultation"><ReikiInquiryForm locale={locale} kind="consultation" course="Reiki Yggdrasil" /></div>
    </section>
  );
}

export function ReikiConsultationForm({ locale, course }: { locale: PublicLocale; course: string }) {
  return (
    <section className="reiki-standalone-consultation" id="reiki-free-consultation" aria-label={copy[locale].consultTitle}>
      <ReikiInquiryForm locale={locale} kind="consultation" course={course} />
    </section>
  );
}
