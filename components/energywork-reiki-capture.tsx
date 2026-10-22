"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./energywork-reiki-capture.module.css";

export type ReikiSystem = "yggdrasil" | "tantra" | "kundalini";
type Choice = "gift" | "donation" | "personal" | "pdf";

const choices: Choice[] = ["gift", "donation", "personal", "pdf"];
const systems: Record<ReikiSystem, { name: string; detail: string }> = {
  yggdrasil: { name: "Reiki Yggdrasil", detail: "€50 / 30 min · €60 / 60 min" },
  tantra: { name: "Tantra Reiki", detail: "€50 / 30 min · €60 / 60 min" },
  kundalini: { name: "Kundalini Reiki", detail: "€50 / 30 min · €60 / 60 min" },
};

const copy: Record<PublicLocale, {
  prompt: string; options: readonly [string,string,string,string];
  actions: readonly [string,string,string,string]; messages: readonly [string,string,string];
  hints: readonly [string,string,string,string]; note: string; label: string;
}> = {
  en: {
    prompt: "Choose your next step",
    options: ["One system as a gift", "Additional · donation", "Personal 1:1", "PDF materials"],
    actions: ["Choose this free system", "Request an additional system", "Book personal teaching & initiation", "Download course PDF"],
    messages: [
      "Hello Andrey! I would like to choose my ONE complimentary Reiki system for an introductory Level 1 initiation in",
      "Hello Andrey! I would like an ADDITIONAL Reiki system with a pay-what-you-wish donation (no fixed amount) in",
      "Hello Andrey! I would like a PERSONAL Reiki teaching session and initiation in",
    ],
    hints: [
      "Choose one of the three systems as your complimentary Level 1 introduction.",
      "Each additional system is available for a donation of any amount.",
      "Individual teaching: €50 for 30 min or €60 for 60 min.",
      "Download the study guide now. No registration.",
    ],
    note: "No name, email or file uploads. Choose WhatsApp or Telegram to review and send the prepared message. An initiation is not booked automatically.",
    label: "Start Reiki training",
  },
  ru: {
    prompt: "Выберите, как начать",
    options: ["Одна система в подарок", "Дополнительная · донейшен", "Личное обучение", "PDF-материалы"],
    actions: ["Выбрать систему в подарок", "Запросить ещё одну систему", "Заказать личное обучение и инициацию", "Скачать PDF-материалы"],
    messages: [
      "Здравствуйте, Андрей! Хочу выбрать ОДНУ систему Рейки в подарок для вводной инициации 1-й ступени:",
      "Здравствуйте, Андрей! Хочу ДОПОЛНИТЕЛЬНУЮ систему Рейки за свободное пожертвование без фиксированной суммы:",
      "Здравствуйте, Андрей! Хочу ЛИЧНОЕ обучение Рейки и инициацию по системе:",
    ],
    hints: [
      "В подарок — одна система на выбор для вводной 1-й ступени.",
      "За каждую следующую систему — добровольное пожертвование в любой сумме.",
      "Индивидуально: 50 € за 30 минут или 60 € за 60 минут.",
      "Скачайте учебные материалы без регистрации.",
    ],
    note: "Без имени, email и файлов. Выберите WhatsApp или Telegram — отправьте подготовленное сообщение сами. Запись и инициация не происходят автоматически.",
    label: "Начать обучение Рейки",
  },
  es: {
    prompt: "Elige cómo empezar",
    options: ["Un sistema de regalo", "Otro · donación libre", "Clase personal", "Material PDF"],
    actions: ["Elegir mi sistema de regalo", "Solicitar otro sistema", "Reservar clase e iniciación", "Descargar PDF del curso"],
    messages: [
      "Hola Andrey. Quiero elegir UN sistema Reiki de regalo para una iniciación introductoria al Nivel 1:",
      "Hola Andrey. Quiero un sistema Reiki ADICIONAL con una donación voluntaria sin importe fijo:",
      "Hola Andrey. Quiero una clase PERSONAL de Reiki e iniciación en",
    ],
    hints: [
      "Elige un sistema gratuito para introducirte al Nivel 1.",
      "Cada sistema adicional está disponible por una donación de cualquier importe.",
      "Clase individual: 50 € por 30 minutos o 60 € por 60 minutos.",
      "Descarga el material sin registro.",
    ],
    note: "Sin nombre, correo ni archivos. Elige WhatsApp o Telegram y envía tú mismo la solicitud. La iniciación no se reserva automáticamente.",
    label: "Comenzar formación Reiki",
  },
};

export function EnergyworkReikiCapture({ locale, course }: { locale: PublicLocale; course: ReikiSystem }) {
  const [choice, setChoice] = useState<Choice>("gift");
  const c = copy[locale];
  const system = systems[course];
  const isPdf = choice === "pdf";
  const index = choices.indexOf(choice);
  const action = c.actions[index];
  const fileHref = "/api/academy/reiki-guide?course=" + course + "&locale=" + locale;
  const request = c.messages[Math.min(index, 2)] + " " + system.name + "." + (choice === "personal" ? " (" + system.detail + ")." : "");
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
      <p className={styles.help}>{c.hints[index]}</p>
      {isPdf ? (
        <a className={styles.action} data-energywork-action={choice} href={fileHref} download>
          <ArrowDown size={18} aria-hidden="true" />
          <span>{action}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </a>
      ) : (
        <ContactChannelChooser
        stayAfterSave
          locale={locale}
          whatsappUrl={enquiryHref}
          label={action}
          className={styles.action}
          attributes={{ "data-energywork-action": choice }}
        />
      )}
      <small className={styles.note}>{c.note}</small>
    </div>
  );
}
