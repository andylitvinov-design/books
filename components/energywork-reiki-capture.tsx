"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, Check, MessageCircle } from "lucide-react";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./energywork-reiki-capture.module.css";

export type ReikiSystem = "yggdrasil" | "tantra" | "kundalini";
type Choice = "free" | "personal" | "pdf";

const choices: Choice[] = ["free", "personal", "pdf"];
const systems: Record<ReikiSystem, { name: string; detail: string }> = {
  yggdrasil: { name: "Reiki Yggdrasil", detail: "€100 / 60 min" },
  tantra: { name: "Tantra Reiki", detail: "€50 / 30 min" },
  kundalini: { name: "Kundalini Reiki", detail: "" },
};

const copy: Record<PublicLocale, {
  prompt: string; options: readonly [string,string,string];
  actions: readonly [string,string,string]; messages: readonly [string,string];
  hints: readonly [string,string,string]; note: string; label: string;
}> = {
  en: {
    prompt: "Choose your next step",
    options: ["Free Level 1","Personal initiation","PDF materials"],
    actions: ["Request free Level 1","Request a personal initiation","Download course PDF"],
    messages: [
      "Hello Andrey! I would like to request the FREE introductory Level 1 initiation. Please share the study requirements and available teacher-led format.",
      "Hello Andrey! I would like to arrange a PERSONAL Level 1 initiation. Please confirm the current price, availability and preparation.",
    ],
    hints: [
      "Free introductory offer, subject to personal confirmation.",
      "A dedicated one-to-one session, confirmed with Andrey.",
      "Download the study guide now. No registration.",
    ],
    note: "No name, email or file uploads. WhatsApp opens a prepared message you send yourself. An initiation is not booked automatically.",
    label: "Start Reiki training",
  },
  ru: {
    prompt: "Выберите, как начать",
    options: ["1-я ступень бесплатно","Личная инициация","PDF-материалы"],
    actions: ["Получить 1-ю ступень бесплатно","Заказать личную инициацию","Скачать PDF-материалы"],
    messages: [
      "Здравствуйте, Андрей! Хочу запросить БЕСПЛАТНУЮ вводную инициацию 1-й ступени. Подскажите подготовку и доступный формат с преподавателем.",
      "Здравствуйте, Андрей! Хочу заказать ЛИЧНУЮ инициацию 1-й ступени. Подскажите актуальную стоимость, время и подготовку.",
    ],
    hints: [
      "Бесплатная вводная ступень; время и формат подтверждаются лично.",
      "Индивидуальное обучение по согласованию с Андреем.",
      "Скачайте учебные материалы без регистрации.",
    ],
    note: "Без имени, email и файлов. WhatsApp открывает готовое сообщение — отправляете его сами. Запись и инициация не происходят автоматически.",
    label: "Начать обучение Рейки",
  },
  es: {
    prompt: "Elige cómo empezar",
    options: ["Nivel 1 gratis","Iniciación personal","Material PDF"],
    actions: ["Solicitar Nivel 1 gratis","Solicitar iniciación personal","Descargar PDF del curso"],
    messages: [
      "Hola Andrey. Quiero solicitar una iniciación introductoria GRATUITA al Nivel 1. ¿Puedes confirmar la preparación y la disponibilidad del formato guiado?",
      "Hola Andrey. Quiero solicitar una iniciación PERSONAL al Nivel 1. ¿Puedes confirmar el precio actual, las fechas y la preparación?",
    ],
    hints: [
      "Introducción gratuita, sujeta a confirmación personal.",
      "Una sesión individual con Andrey.",
      "Descarga el material de estudio sin registrarte.",
    ],
    note: "Sin nombre, correo ni archivos. WhatsApp abre un mensaje que tú envías. La iniciación no se reserva automáticamente.",
    label: "Comenzar formación Reiki",
  },
};

export function EnergyworkReikiCapture({ locale, course }: { locale: PublicLocale; course: ReikiSystem }) {
  const [choice, setChoice] = useState<Choice>("free");
  const c = copy[locale];
  const system = systems[course];
  const isPdf = choice === "pdf";
  const index = choice === "personal" ? 1 : 0;
  const action = isPdf ? c.actions[2] : c.actions[index];
  const fileHref = "/api/academy/reiki-guide?course=" + course + "&locale=" + locale;
  const request = c.messages[index] + " " + system.name + "." + (choice === "personal" && system.detail ? " (" + system.detail + ")." : "");
  const enquiryHref = whatsappEnquiryUrl({
    locale,
    service: system.name + " · Level 1",
    request,
    option: c.options[choices.indexOf(choice)],
    pagePath: "/" + locale + "/academy/principles-of-energywork",
  });

  return (
    <div className={styles.capture} data-energywork-capture={course} id={"energywork-" + course + "-capture"} aria-label={c.label}>
      <p className={styles.prompt}>{c.prompt}</p>
      <div className={styles.choices} role="group" aria-label={c.prompt}>
        {choices.map((option,i) => (
          <button
            type="button"
            className={styles.choice}
            aria-pressed={choice===option}
            data-selected={choice===option}
            data-energywork-intent={option}
            key={option}
            onClick={()=>setChoice(option)}
          >
            <span className={styles.choiceNumber} aria-hidden="true">{choice===option ? <Check size={14} /> : String(i+1).padStart(2,"0")}</span>
            <span>{c.options[i]}</span>
          </button>
        ))}
      </div>
      <p className={styles.help}>{c.hints[choices.indexOf(choice)]}</p>
      <a
        className={styles.action}
        data-energywork-action={choice}
        href={isPdf ? fileHref : enquiryHref}
        download={isPdf ? true : undefined}
        target={isPdf ? undefined : "_blank"}
        rel={isPdf ? undefined : "noopener noreferrer"}
      >
        {isPdf ? <ArrowDown size={18} aria-hidden="true" /> : <MessageCircle size={18} aria-hidden="true" />}
        <span>{action}</span>
        <ArrowRight size={17} aria-hidden="true" />
      </a>
      <small className={styles.note}>{c.note}</small>
    </div>
  );
}
