"use client";

import { useState, type FormEvent } from "react";
import { ReikiConsultationForm } from "@/components/reiki-landing-forms";
import type { PublicLocale } from "@/lib/public-locales";

const text = {
  en: {
    eyebrow: "Two ways to begin",
    title: "Take your next step",
    intro: "Explore your personal question in a free conversation, or enquire about the Tantra Reiki Master Course.",
    masterEyebrow: "Tantra Reiki · nine-level path",
    masterTitle: "Apply for the Tantra Reiki Master Course",
    masterLead: "Interested in the complete training? Tell me about your background and what you want to explore. I’ll confirm the current schedule, availability and entry requirements personally.",
    name: "Your name", contact: "How can I reach you?", contactHint: "Email, WhatsApp or Telegram",
    experience: "Your experience with Reiki", goal: "What attracts you to this training?",
    experienceOptions: ["I'm new to Tantra Reiki", "I've explored Levels 1–3", "I've explored Levels 4–6", "I've explored Levels 7–9", "I have experience in other Reiki traditions"],
    choose: "Choose your experience", goalHint: "A few sentences are enough",
    send: "Enquire about the Master Course",
    note: "The application is not a confirmed place. Your details are only prepared in WhatsApp; press Send there to submit.",
    ready: "Your message is ready. Open WhatsApp and press Send to complete your enquiry.",
    reopen: "Open my prepared application",
  },
  ru: {
    eyebrow: "Два пути для начала",
    title: "Сделайте следующий шаг",
    intro: "Начните с бесплатной личной беседы или оставьте заявку на полный мастер-курс Тантра Рейки.",
    masterEyebrow: "Тантра Рейки · девять ступеней",
    masterTitle: "Записаться на мастер-курс Тантра Рейки",
    masterLead: "Хотите пройти полный курс? Расскажите об опыте и ваших целях. Я лично уточню программу, наличие мест, даты и условия участия.",
    name: "Ваше имя", contact: "Как с вами связаться?", contactHint: "Email, WhatsApp или Telegram",
    experience: "Ваш опыт практик Рейки", goal: "Что вас привлекает в этом обучении?",
    experienceOptions: ["Я начинаю с нуля", "Знаком(а) со ступенями 1–3", "Знаком(а) со ступенями 4–6", "Знаком(а) со ступенями 7–9", "Есть опыт других направлений Рейки"],
    choose: "Выберите ваш опыт", goalHint: "Достаточно нескольких предложений",
    send: "Отправить заявку на мастер-курс",
    note: "Заявка не означает подтверждённое место. Откроется подготовленное сообщение WhatsApp, где нужно нажать «Отправить».",
    ready: "Сообщение готово. Откройте WhatsApp и нажмите «Отправить», чтобы завершить заявку.",
    reopen: "Открыть подготовленную заявку",
  },
  es: {
    eyebrow: "Dos maneras de comenzar",
    title: "Da el siguiente paso",
    intro: "Habla de tu situación en una consulta gratuita o solicita información sobre el curso de maestría Tantra Reiki.",
    masterEyebrow: "Tantra Reiki · nueve etapas",
    masterTitle: "Solicitar acceso al curso de maestría Tantra Reiki",
    masterLead: "Cuéntame tu experiencia e intereses. Confirmaré personalmente las fechas, la disponibilidad y los requisitos del curso.",
    name: "Tu nombre", contact: "¿Cómo te contacto?", contactHint: "Correo, WhatsApp o Telegram",
    experience: "Tu experiencia con Reiki", goal: "¿Qué te interesa de este curso?",
    experienceOptions: ["Estoy empezando", "Conozco los niveles 1–3", "Conozco los niveles 4–6", "Conozco los niveles 7–9", "Tengo experiencia con otros sistemas Reiki"],
    choose: "Selecciona tu experiencia", goalHint: "Unas frases son suficientes",
    send: "Solicitar información del curso de maestría",
    note: "Esta solicitud no garantiza una plaza. WhatsApp abrirá un mensaje que deberás enviar personalmente.",
    ready: "Tu mensaje está listo. Envíalo desde WhatsApp para completar la solicitud.",
    reopen: "Abrir mi solicitud preparada",
  },
} as const;

function MasterCourseForm({locale}:{locale:PublicLocale}) {
  const c = text[locale];
  const [prepared, setPrepared] = useState("");
  const submit = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name") || "").trim().slice(0, 100);
    const contact = String(values.get("contact") || "").trim().slice(0, 160);
    const experience = String(values.get("experience") || "").trim().slice(0, 130);
    const goal = String(values.get("goal") || "").trim().slice(0, 1200);
    if (!name || !contact || !experience || !goal) return;
    const message = [
      "Holistic House — Tantra Reiki Master Course application",
      "Language: " + locale, "",
      c.name + ": " + name,
      c.contact + ": " + contact,
      c.experience + ": " + experience,
      c.goal + ": " + goal,
    ].join("\n");
    const url = "https://wa.me/14376066502?text=" + encodeURIComponent(message);
    setPrepared(url);
    window.open(url, "_blank", "noopener,noreferrer");
  };
  return (
    <form id="tantra-master-course" className="reiki-offer-card reiki-offer-card--master" data-reiki-form="master-course" onSubmit={submit} onInput={() => setPrepared("")}>
      <header>
        <span className="reiki-offer-card__eyebrow">{c.masterEyebrow}</span>
        <h3>{c.masterTitle}</h3>
        <p>{c.masterLead}</p>
      </header>
      <div className="reiki-offer-card__fields">
        <label><span>{c.name}</span><input name="name" autoComplete="name" maxLength={100} placeholder={c.name} required /></label>
        <label><span>{c.contact}</span><input name="contact" maxLength={160} placeholder={c.contactHint} required /></label>
        <label><span>{c.experience}</span><select name="experience" required defaultValue=""><option value="" disabled>{c.choose}</option>{c.experienceOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
        <label><span>{c.goal}</span><textarea name="goal" rows={3} maxLength={1200} required placeholder={c.goalHint} /></label>
      </div>
      <button className="reiki-offer-card__submit" type="submit">{c.send} <span aria-hidden="true">→</span></button>
      <p className="reiki-offer-card__note" role="status">{prepared ? c.ready : c.note}</p>
      {prepared ? <a className="reiki-offer-card__resume" href={prepared} target="_blank" rel="noopener noreferrer">{c.reopen} ↗</a> : null}
    </form>
  );
}

export function TantraReikiLeadForms({locale}:{locale:PublicLocale}) {
  const c = text[locale];
  return (
    <section className="tantra-next-steps" id="tantra-next-steps" aria-labelledby="tantra-next-steps-title">
      <div className="tantra-next-steps__heading">
        <p className="homeopathy-kicker">{c.eyebrow}</p>
        <h2 id="tantra-next-steps-title">{c.title}</h2>
        <p>{c.intro}</p>
      </div>
      <div className="tantra-next-steps__grid">
        <ReikiConsultationForm locale={locale} course="Tantra Reiki" />
        <MasterCourseForm locale={locale} />
      </div>
    </section>
  );
}
