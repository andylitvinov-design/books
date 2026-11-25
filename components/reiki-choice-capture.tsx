"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Download, HeartHandshake } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { emitPublicAnalyticsEvent } from "@/lib/public-analytics";
import { formatReikiLevelPrice } from "@/lib/academy/reiki-level-pricing";
import styles from "./reiki-choice-capture.module.css";

type Course = "tantra" | "yggdrasil";
type Choice = "guide" | "express" | "personal";
const choices: Choice[] = ["guide", "express", "personal"];

const copy = {
  en: {
    common: {
      eyebrow: "YOUR NEXT STEP · DIRECTLY WITH ANDREY",
      choose: "What interests you most?",
      personalPrice: "Personal initiation (per level)",
      options: {
        guide: "Download study material and prices",
        express: "Request free express Level 1 initiation",
        personal: "Request full personal Level 1 initiation",
      },
      action: {
        guide: "Download PDF guide & pricing",
        express: "Request free express Level 1",
        personal: "Request personal Level 1 initiation",
      },
      downloadNote: "PDF: course overview, Level 1 options and available pricing information.",
      messageNote: "Choose WhatsApp or Telegram below. Review your request and press Send yourself.",
      telegram: "Or write directly on Telegram",
      consultation: "Prefer to talk first? Request a free consultation",
      reply: "Personal reply",
      obligation: "No obligation",
    },
    tantra: {
      courseName: "Tantra Reiki",
      title: "Tantra Reiki · your next step",
      lead: "Free PDF, free express Level 1, or personal initiation.",
      messages: {
        express: "I would like to request the free express Level 1 initiation in Tantra Reiki. Please tell me how to arrange it.",
        personal: "I would like to request the full personal Level 1 initiation in Tantra Reiki. Please confirm the format, availability and how to prepare.",
        consultation: "I'd like to request a free personal consultation about Tantra Reiki.",
      },
    },
    yggdrasil: {
      courseName: "Reiki Yggdrasil",
      title: "Reiki Yggdrasil · your next step",
      lead: "Free PDF, free express Level 1, or personal initiation.",
      messages: {
        express: "I would like to request the free express Level 1 initiation in Reiki Yggdrasil. Please tell me how to begin.",
        personal: "I would like to request the full personal Level 1 initiation in Reiki Yggdrasil. Please confirm the format, availability and how to prepare.",
        consultation: "I'd like to request a free personal consultation about Reiki Yggdrasil.",
      },
    },
  },
  ru: {
    common: {
      eyebrow: "ВАШ СЛЕДУЮЩИЙ ШАГ · ЛИЧНО С АНДРЕЕМ",
      choose: "Что вас интересует?",
      personalPrice: "Личная инициация (за ступень)",
      options: {
        guide: "Скачать учебные материалы и цены",
        express: "Бесплатная экспресс-инициация 1-й ступени",
        personal: "Полная личная инициация 1-й ступени",
      },
      action: {
        guide: "Скачать PDF и условия",
        express: "Запросить бесплатную экспресс-инициацию",
        personal: "Запросить личную инициацию",
      },
      downloadNote: "PDF: описание системы, варианты первой ступени и информация о стоимости.",
      messageNote: "Выберите WhatsApp или Telegram. Заявка будет подготовлена, отправка — только после вашего подтверждения.",
      telegram: "Или напишите в Telegram",
      consultation: "Хотите сначала поговорить? Бесплатная консультация",
      reply: "Личный ответ",
      obligation: "Без обязательств",
    },
    tantra: {
      courseName: "Тантра Рейки (Tantra Reiki)",
      title: "Тантра Рейки · следующий шаг",
      lead: "PDF, бесплатная экспресс-инициация или личная 1-я ступень.",
      messages: {
        express: "Хочу запросить бесплатную экспресс-инициацию 1-й ступени Тантра Рейки. Подскажите, как её пройти.",
        personal: "Хочу пройти полную личную инициацию 1-й ступени Тантра Рейки. Подскажите формат, доступные даты и как подготовиться.",
        consultation: "Хочу договориться о бесплатной консультации по Тантра Рейки.",
      },
    },
    yggdrasil: {
      courseName: "Рейки Иггдрасиль (Reiki Yggdrasil)",
      title: "Рейки Иггдрасиль · следующий шаг",
      lead: "PDF, бесплатная экспресс-инициация или личная 1-я ступень.",
      messages: {
        express: "Хочу запросить бесплатную экспресс-инициацию 1-й ступени Рейки Иггдрасиль. Подскажите, как начать.",
        personal: "Хочу пройти полную личную инициацию 1-й ступени Рейки Иггдрасиль. Подскажите формат, доступные даты и как подготовиться.",
        consultation: "Хочу договориться о бесплатной консультации по Рейки Иггдрасиль.",
      },
    },
  },
  es: {
    common: {
      eyebrow: "TU PRÓXIMO PASO · DIRECTAMENTE CON ANDREY",
      choose: "¿Qué te interesa?",
      personalPrice: "Iniciación personal (por nivel)",
      options: {
        guide: "Descargar material de estudio y precios",
        express: "Solicitar iniciación exprés gratuita de nivel 1",
        personal: "Solicitar iniciación personal completa de nivel 1",
      },
      action: {
        guide: "Descargar guía PDF y precios",
        express: "Solicitar iniciación exprés gratuita",
        personal: "Solicitar iniciación personal",
      },
      downloadNote: "PDF: descripción del sistema, opciones de nivel 1 e información de precios.",
      messageNote: "Elige WhatsApp o Telegram. Revisa la solicitud y pulsa Enviar tú mismo.",
      telegram: "O escríbeme por Telegram",
      consultation: "¿Prefieres hablar primero? Consulta gratuita",
      reply: "Respuesta personal",
      obligation: "Sin compromiso",
    },
    tantra: {
      courseName: "Tantra Reiki",
      title: "Tantra Reiki · tu siguiente paso",
      lead: "PDF, iniciación exprés gratuita o personal de nivel 1.",
      messages: {
        express: "Quisiera solicitar la iniciación exprés gratuita de nivel 1 en Tantra Reiki. ¿Cómo puedo comenzar?",
        personal: "Quisiera solicitar la iniciación personal completa de nivel 1 en Tantra Reiki. ¿Cuál es el formato, la disponibilidad y cómo prepararme?",
        consultation: "Quisiera solicitar una consulta introductoria gratuita sobre Tantra Reiki.",
      },
    },
    yggdrasil: {
      courseName: "Reiki Yggdrasil",
      title: "Reiki Yggdrasil · tu siguiente paso",
      lead: "PDF, iniciación exprés gratuita o personal de nivel 1.",
      messages: {
        express: "Quisiera solicitar la iniciación exprés gratuita de nivel 1 en Reiki Yggdrasil. ¿Cómo puedo comenzar?",
        personal: "Quisiera solicitar la iniciación personal completa de nivel 1 en Reiki Yggdrasil. ¿Cuál es el formato, la disponibilidad y cómo prepararme?",
        consultation: "Quisiera solicitar una consulta introductoria gratuita sobre Reiki Yggdrasil.",
      },
    },
  },
} as const;

export function ReikiChoiceCapture({ locale, course, placement = "bottom" }: { locale: PublicLocale; course: Course; placement?: "top" | "bottom" }) {
  // Keep top and bottom selectors independent for both Reiki programmes.
  // Top starts with the free guide; the bottom keeps the approved express Level 1 default.
  const isTop = placement === "top";
  const [selected, setSelected] = useState<Choice>(isTop ? "guide" : "express");
  const t = copy[locale];
  const c = t[course];
  const personalPrice = formatReikiLevelPrice(course, locale);

  useEffect(() => {
    const syncHash = () => {
      // Preserve historical deep links to the now renamed personal pathway.
      if (course === "tantra" && !isTop && window.location.hash === "#tantra-master-course") setSelected("personal");
      if (course === "yggdrasil" && !isTop && window.location.hash === "#reiki-free-level-one") setSelected("express");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [course, isTop]);

  const download = selected === "guide";
  const pagePath = "/" + locale + "/academy/reiki/" + (course === "tantra" ? "tantra-reiki" : "yggdrasil");
  const guideUrl = "/api/academy/reiki-guide?course=" + course + "&locale=" + locale;
  const actionUrl = download
    ? guideUrl
    : whatsappEnquiryUrl({
        locale,
        service: c.courseName,
        request: selected === "express" ? c.messages.express : c.messages.personal,
        option: t.common.options[selected],
        context: selected === "personal" ? personalPrice : undefined,
        pagePath,
      });
  const sectionId = isTop ? (course === "tantra" ? "tantra-top-capture" : "yggdrasil-top-capture") : course === "tantra" ? "tantra-next-steps" : "reiki-free-level-one";
  const titleId = course + "-" + placement + "-capture-title";
  const shortOption = {
    en: { guide: "PDF guide", express: "Free express Level 1", personal: "Personal Level 1 initiation" },
    ru: { guide: "PDF-методичка", express: "Бесплатная экспресс 1-я ступень", personal: "Личная инициация 1-й ступени" },
    es: { guide: "Guía PDF", express: "Nivel 1 exprés gratis", personal: "Iniciación personal de nivel 1" },
  }[locale];
  const topTitle = course === "tantra"
    ? (locale === "ru" ? "Выберите, как начать Тантра Рейки" : locale === "es" ? "Elige cómo comenzar Tantra Reiki" : "Choose how to begin Tantra Reiki")
    : (locale === "ru" ? "С чего начать Рейки Иггдрасиль" : locale === "es" ? "Cómo comenzar Reiki Yggdrasil" : "Begin Reiki Yggdrasil");
  const topLead = course === "tantra"
    ? (locale === "ru" ? "Сначала изучите бесплатную методичку для телефона или выберите формат инициации первой ступени." : locale === "es" ? "Descarga la guía móvil gratuita o elige una iniciación de nivel 1." : "Read the free phone-friendly study guide, or choose your Level 1 initiation.")
    : (locale === "ru" ? "Скачайте бесплатную методичку или запросите экспресс-инициацию либо личную инициацию первой ступени. Доступность и формат подтвердит Андрей." : locale === "es" ? "Descarga la guía gratuita o solicita la iniciación exprés o personal del Nivel 1. Andrey confirmará los detalles." : "Download the free study guide or request a free express or full personal Level 1 initiation. Andrey will confirm the format and availability.");


  return (
    <section
      className={styles.capture + (isTop ? " " + styles.topCapture : "") + (isTop && course === "yggdrasil" ? " " + styles.yggdrasilTopCapture : "")}
      id={sectionId}
      data-reiki-choice-capture={course}
      data-reiki-capture-placement={placement}
      aria-labelledby={titleId}
    >
      {course === "tantra" && !isTop ? <span id="tantra-master-course" className={styles.anchor} aria-hidden="true" /> : null}
      <div className={styles.eyebrow}><HeartHandshake size={20} aria-hidden="true" /><span>{t.common.eyebrow}</span></div>
      <h2 className={styles.title} id={titleId}>{isTop ? topTitle : c.title}</h2>
      <p className={styles.lead}>{isTop ? topLead : c.lead}</p>
      {selected === "personal" ? <p className={styles.priceLine} data-reiki-initiation-price={course}>{t.common.personalPrice}: <strong>{personalPrice}</strong></p> : null}
      <p className={styles.question}>{t.common.choose}</p>

      <div className={styles.choices} role="group" aria-label={t.common.choose}>
        {choices.map((choice) => (
          <button
            key={choice}
            type="button"
            className={styles.choice}
            data-selected={selected === choice}
            aria-pressed={selected === choice}
            onClick={() => setSelected(choice)}
          >
            {selected === choice ? <Check size={18} strokeWidth={2.7} aria-hidden="true" /> : <span className={styles.unselected} aria-hidden="true" />}
            <span>{shortOption[choice]}</span>
          </button>
        ))}
      </div>

      {download ? (
        <a
          className={styles.action}
          data-reiki-choice-action={selected}
          href={guideUrl}
          download
          aria-label={t.common.action.guide}
          onClick={() => emitPublicAnalyticsEvent("academy_study_material_request_click")}
        >
          <Download size={21} aria-hidden="true" />
          <span>{course === "tantra"
            ? (locale === "ru" ? "Скачать PDF Тантра Рейки" : locale === "es" ? "Descargar PDF Tantra Reiki" : "Download Tantra Reiki mobile PDF")
            : t.common.action.guide}</span>
          <ArrowUpRight size={20} aria-hidden="true" />
        </a>
      ) : (
        <ContactChannelChooser
          compactPhone
          stayAfterSave
          resetKey={course + "-" + placement + "-" + selected}
          publicTopic={t.common.options[selected]}
          locale={locale}
          whatsappUrl={actionUrl}
          event="contact_click"
          analyticsEvent={selected === "express" ? "academy_level_one_initiation_enquiry_click" : "academy_personal_initiation_enquiry_click"}
          attributes={{ "data-reiki-choice-action": selected }}
        />
      )}
      {course === "yggdrasil" && selected === "express" ? (
        <a className={styles.checklistLink} href={"/" + locale + "/academy/reiki/yggdrasil/free-initiation"}>
          {locale === "ru" ? "Как начать бесплатно: чтение и 7 вопросов →" : locale === "es" ? "Cómo comenzar gratis: lecturas y 7 preguntas →" : "How to begin for free: reading guide and 7 questions →"}
        </a>
      ) : null}

    </section>
  );
}
