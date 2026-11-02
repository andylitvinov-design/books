"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Check, Send } from "lucide-react";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./yggdrasil-free-initiation.module.css";

type Intent = "free" | "personal" | "pdf";
const intents: readonly Intent[] = ["free", "personal", "pdf"];

const copy: Record<PublicLocale, {
  choose: string;
  options: [string, string, string];
  helps: [string, string, string];
  request: [string, string];
  actions: [string, string, string];
  note: string;
  telegram: string;
  assurance: string;
}> = {
  en: {
    choose: "How would you like to begin?",
    options: ["Free Level 1", "Personal initiation", "Download the guide"],
    helps: [
      "Request a free introductory Level 1 session with Andrey. Study the materials and seven questions on this page; Andrey confirms availability personally.",
      "Ask Andrey about a dedicated 60-minute Level 1 initiation (€100 per level). Dates and format are confirmed directly.",
      "Get the Reiki Yggdrasil course overview and prices immediately. No account, email or registration.",
    ],
    request: [
      "Hello Andrey! I would like to request the FREE introductory Level 1 Reiki Yggdrasil initiation. I have reviewed the materials and seven preparation questions. Please tell me about available dates and the teacher-led format.",
      "Hello Andrey! I would like to book a PERSONAL Reiki Yggdrasil Level 1 initiation (€100 / 60 minutes). Please tell me the availability and how to prepare.",
    ],
    actions: ["Request free Level 1", "Ask about personal initiation", "Download PDF guide"],
    note: "No name, email, registration or uploads. Choose WhatsApp or Telegram; the prepared request is sent only by you. This does not automatically book or grant an initiation.",
    telegram: "Or write to Andrey on Telegram",
    assurance: "A personal reply · No obligation",
  },
  ru: {
    choose: "Как вы хотите начать?",
    options: ["1-я ступень бесплатно", "Личная инициация", "Скачать методичку"],
    helps: [
      "Запросите бесплатную вводную инициацию первой ступени. Изучите материалы и семь вопросов на этой странице; наличие мест и формат Андрей подтвердит лично.",
      "Узнайте о личной инициации 1-й ступени продолжительностью 60 минут (€100 за ступень). Дата и формат согласуются индивидуально.",
      "Сразу скачайте описание курса Рейки Иггдрасиль и условия обучения. Без аккаунта, email и регистрации.",
    ],
    request: [
      "Здравствуйте, Андрей! Хочу запросить БЕСПЛАТНУЮ вводную инициацию 1-й ступени Рейки Иггдрасиль. Я ознакомился(-ась) с материалами и семью вопросами. Подскажите доступное время и формат.",
      "Здравствуйте, Андрей! Хочу записаться на ЛИЧНУЮ инициацию 1-й ступени Рейки Иггдрасиль (€100 / 60 минут). Подскажите дату, формат и подготовку.",
    ],
    actions: ["Запросить 1-ю ступень", "Узнать о личной инициации", "Скачать PDF-методичку"],
    note: "Без имени, email, регистрации и загрузки файлов. Выберите WhatsApp или Telegram и отправьте готовую заявку сами. Запись и инициация не происходят автоматически.",
    telegram: "Или написать Андрею в Telegram",
    assurance: "Личный ответ · Без обязательств",
  },
  es: {
    choose: "¿Cómo quieres empezar?",
    options: ["Nivel 1 gratis", "Iniciación personal", "Descargar la guía"],
    helps: [
      "Solicita una introducción gratuita al Nivel 1 con Andrey. Lee los materiales y las siete preguntas; Andrey confirma personalmente la disponibilidad.",
      "Pregunta por una iniciación personal de Nivel 1 de 60 minutos (€100 por nivel). La fecha y el formato se confirman personalmente.",
      "Descarga al instante el programa y los precios de Reiki Yggdrasil. No necesitas cuenta, correo electrónico ni registro.",
    ],
    request: [
      "Hola Andrey. Quiero solicitar una iniciación introductoria GRATIS al Nivel 1 de Reiki Yggdrasil. Ya he revisado los materiales y las siete preguntas. ¿Cuáles son las fechas y el formato disponibles?",
      "Hola Andrey. Quiero solicitar una iniciación PERSONAL al Nivel 1 de Reiki Yggdrasil (€100 / 60 minutos). ¿Puedes confirmar disponibilidad y preparación?",
    ],
    actions: ["Solicitar Nivel 1 gratis", "Consultar iniciación personal", "Descargar guía PDF"],
    note: "Sin nombre, correo, registro ni archivos. Elige WhatsApp o Telegram; tú decides cuándo enviar la solicitud. La solicitud no reserva ni concede automáticamente una iniciación.",
    telegram: "O escribir a Andrey en Telegram",
    assurance: "Respuesta personal · Sin compromiso",
  },
};

export function YggdrasilInitiationForm({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [mode, setMode] = useState<Intent>("free");

  const switchMode = useCallback((intent: Intent) => setMode(intent), []);
  useEffect(() => {
    const readHash = () => {
      const hash = window.location.hash;
      if (hash === "#apply-personal") switchMode("personal");
      if (hash === "#apply-pdf") switchMode("pdf");
      // Preserve older checklist links without bringing back answer uploads.
      if (hash === "#apply-free" || hash === "#apply-answers" || hash === "#request-free-initiation") switchMode("free");
    };
    readHash();
    window.addEventListener("hashchange", readHash);
    return () => window.removeEventListener("hashchange", readHash);
  }, [switchMode]);

  const isPdf = mode === "pdf";
  const index = mode === "personal" ? 1 : 0;
  const enquiryUrl = whatsappEnquiryUrl({
    locale,
    service: "Reiki Yggdrasil · Level 1",
    request: t.request[index],
    option: t.options[index],
    pagePath: "/" + locale + "/academy/reiki/yggdrasil/free-initiation",
  });
  const pdfUrl = "/api/academy/reiki-guide?course=yggdrasil&locale=" + locale;

  return (
    <section className={styles.applicationForm} data-yggdrasil-form aria-label={t.choose}>
      <span id="apply-free" className={styles.anchor} aria-hidden="true" />
      <span id="apply-personal" className={styles.anchor} aria-hidden="true" />
      <span id="apply-pdf" className={styles.anchor} aria-hidden="true" />
      <span id="apply-answers" className={styles.anchor} aria-hidden="true" />
      <p className={styles.formQuestion}>{t.choose}</p>
      <div className={styles.formOptions} role="group" aria-label={t.choose}>
        {intents.map((intent, index) => (
          <button
            type="button"
            key={intent}
            className={styles.formOption}
            data-selected={mode === intent}
            data-intent={intent}
            aria-pressed={mode === intent}
            onClick={() => switchMode(intent)}
          >
            <span className={styles.formOptionIndex} aria-hidden="true">{mode === intent ? <Check size={16} /> : String(index + 1).padStart(2, "0")}</span>
            <span>{t.options[index]}</span>
          </button>
        ))}
      </div>
      <p className={styles.modeExplanation}>{t.helps[intents.indexOf(mode)]}</p>
      {isPdf ? (
        <a className={styles.formSubmit} href={pdfUrl} download>
          <ArrowDown size={19} aria-hidden="true" />{t.actions[2]}<ArrowRight size={18} aria-hidden="true" />
        </a>
      ) : (
        <ContactChannelChooser stayAfterSave
          locale={locale}
          whatsappUrl={enquiryUrl}
          className={styles.formSubmit}
          attributes={{ "data-reiki-initiation-handoff": mode }}
        />
      )}
      <div className={styles.formFooter}>
        <p className={styles.formAssurance}><Check size={15} aria-hidden="true" />{t.assurance}</p>
        <a className={styles.telegramLink} href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer"><Send size={15} aria-hidden="true" />{t.telegram}</a>
      </div>
      <p className={styles.formNote}>{t.note}</p>
    </section>
  );
}
