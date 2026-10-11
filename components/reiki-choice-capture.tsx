"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Download, HeartHandshake, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import { emitPublicAnalyticsEvent } from "@/lib/public-analytics";
import { formatReikiLevelPrice } from "@/lib/academy/reiki-level-pricing";
import styles from "./reiki-choice-capture.module.css";

type Course = "tantra" | "yggdrasil";
type Choice = "guide" | "express" | "personal";
const choices: Choice[] = ["guide", "express", "personal"];

// A recognisable WhatsApp brand mark, rather than the generic message icon.
function WhatsAppMark({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.966-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.76-1.653-2.057-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.496.099-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.273.297-1.04 1.016-1.04 2.478s1.064 2.874 1.213 3.073c.148.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.288.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.886 9.886 0 0 1-5.031-1.378l-.361-.214-3.74.981.998-3.646-.235-.374a9.866 9.866 0 0 1-1.51-5.26c.002-5.45 4.437-9.885 9.888-9.885a9.824 9.824 0 0 1 6.99 2.897 9.825 9.825 0 0 1 2.893 6.994c-.002 5.45-4.437 9.885-9.888 9.885m8.413-18.3A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.334.157 11.892a11.833 11.833 0 0 0 1.587 5.937L.057 24l6.314-1.656a11.884 11.884 0 0 0 5.674 1.446h.005c6.557 0 11.892-5.334 11.895-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

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
      messageNote: "WhatsApp opens with your exact selection. You choose whether to send the message.",
      telegram: "Or write directly on Telegram",
      consultation: "Prefer to talk first? Request a free consultation",
      reply: "Personal reply",
      obligation: "No obligation",
    },
    tantra: {
      courseName: "Tantra Reiki",
      title: "Explore Tantra Reiki together",
      lead: "Choose your guide, a free first experience, or a full personal Level 1 initiation.",
      messages: {
        express: "I would like to request the free express Level 1 initiation in Tantra Reiki. Please tell me how to arrange it.",
        personal: "I would like to request the full personal Level 1 initiation in Tantra Reiki. Please confirm the format, availability and how to prepare.",
        consultation: "I'd like to request a free personal consultation about Tantra Reiki.",
      },
    },
    yggdrasil: {
      courseName: "Reiki Yggdrasil",
      title: "Start your Reiki Yggdrasil journey",
      lead: "Choose your guide, a free first experience, or a full personal Level 1 initiation.",
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
      messageNote: "WhatsApp откроет сообщение с выбранным запросом. Отправка только после вашего нажатия.",
      telegram: "Или напишите в Telegram",
      consultation: "Хотите сначала поговорить? Бесплатная консультация",
      reply: "Личный ответ",
      obligation: "Без обязательств",
    },
    tantra: {
      courseName: "Тантра Рейки (Tantra Reiki)",
      title: "Откройте Тантра Рейки",
      lead: "Скачайте описание или выберите бесплатную экспресс-инициацию либо полную личную инициацию.",
      messages: {
        express: "Хочу запросить бесплатную экспресс-инициацию 1-й ступени Тантра Рейки. Подскажите, как её пройти.",
        personal: "Хочу пройти полную личную инициацию 1-й ступени Тантра Рейки. Подскажите формат, доступные даты и как подготовиться.",
        consultation: "Хочу договориться о бесплатной консультации по Тантра Рейки.",
      },
    },
    yggdrasil: {
      courseName: "Рейки Иггдрасиль (Reiki Yggdrasil)",
      title: "Начните знакомство с Рейки Иггдрасиль",
      lead: "Скачайте описание или выберите бесплатную экспресс-инициацию либо полную личную инициацию.",
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
      messageNote: "WhatsApp abrirá tu solicitud exacta. Solo se envía si pulsas Enviar.",
      telegram: "O escríbeme por Telegram",
      consultation: "¿Prefieres hablar primero? Consulta gratuita",
      reply: "Respuesta personal",
      obligation: "Sin compromiso",
    },
    tantra: {
      courseName: "Tantra Reiki",
      title: "Descubre Tantra Reiki",
      lead: "Descarga la guía o elige una iniciación exprés gratuita o una iniciación personal completa.",
      messages: {
        express: "Quisiera solicitar la iniciación exprés gratuita de nivel 1 en Tantra Reiki. ¿Cómo puedo comenzar?",
        personal: "Quisiera solicitar la iniciación personal completa de nivel 1 en Tantra Reiki. ¿Cuál es el formato, la disponibilidad y cómo prepararme?",
        consultation: "Quisiera solicitar una consulta introductoria gratuita sobre Tantra Reiki.",
      },
    },
    yggdrasil: {
      courseName: "Reiki Yggdrasil",
      title: "Empieza Reiki Yggdrasil",
      lead: "Descarga la guía o elige una iniciación exprés gratuita o una iniciación personal completa.",
      messages: {
        express: "Quisiera solicitar la iniciación exprés gratuita de nivel 1 en Reiki Yggdrasil. ¿Cómo puedo comenzar?",
        personal: "Quisiera solicitar la iniciación personal completa de nivel 1 en Reiki Yggdrasil. ¿Cuál es el formato, la disponibilidad y cómo prepararme?",
        consultation: "Quisiera solicitar una consulta introductoria gratuita sobre Reiki Yggdrasil.",
      },
    },
  },
} as const;

export function ReikiChoiceCapture({ locale, course }: { locale: PublicLocale; course: Course }) {
  const [selected, setSelected] = useState<Choice>("express");
  const t = copy[locale];
  const c = t[course];
  const personalPrice = formatReikiLevelPrice(course, locale);

  useEffect(() => {
    const syncHash = () => {
      // Preserve historical deep links to the now renamed personal pathway.
      if (course === "tantra" && window.location.hash === "#tantra-master-course") setSelected("personal");
      if (course === "yggdrasil" && window.location.hash === "#reiki-free-level-one") setSelected("express");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [course]);

  const download = selected === "guide";
  const pagePath = "/" + locale + "/academy/reiki/" + (course === "tantra" ? "tantra-reiki" : "yggdrasil");
  const actionUrl = download
    ? "/api/academy/reiki-guide?course=" + course + "&locale=" + locale
    : whatsappEnquiryUrl({
        locale,
        service: c.courseName,
        request: selected === "express" ? c.messages.express : c.messages.personal,
        option: t.common.options[selected],
        context: selected === "personal" ? personalPrice : undefined,
        pagePath,
      });
  const consultationUrl = whatsappEnquiryUrl({
    locale,
    service: c.courseName,
    request: c.messages.consultation,
    option: t.common.consultation,
    pagePath,
  });
  const sectionId = course === "tantra" ? "tantra-next-steps" : "reiki-free-level-one";

  return (
    <section
      className={styles.capture}
      id={sectionId}
      data-reiki-choice-capture={course}
      aria-labelledby={course + "-capture-title"}
    >
      {course === "tantra" ? <span id="tantra-master-course" className={styles.anchor} aria-hidden="true" /> : null}
      <div className={styles.eyebrow}><HeartHandshake size={20} aria-hidden="true" /><span>{t.common.eyebrow}</span></div>
      <h2 className={styles.title} id={course + "-capture-title"}>{c.title}</h2>
      <p className={styles.lead}>{c.lead}</p>
      <p className={styles.priceLine} data-reiki-initiation-price={course}>{t.common.personalPrice}: <strong>{personalPrice}</strong></p>
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
            <span>{t.common.options[choice]}</span>
          </button>
        ))}
      </div>

      <a
        className={styles.action}
        data-reiki-choice-action={selected}
        href={actionUrl}
        download={download ? true : undefined}
        target={download ? undefined : "_blank"}
        rel={download ? undefined : "noopener noreferrer"}
        aria-label={download ? t.common.action.guide : "WhatsApp — " + t.common.action[selected]}
        onClick={() => emitPublicAnalyticsEvent(download ? "academy_study_material_request_click" : selected === "express" ? "academy_level_one_initiation_enquiry_click" : "academy_personal_initiation_enquiry_click")}
      >
        {download ? <Download size={21} aria-hidden="true" /> : <WhatsAppMark size={22} />}
        <span>{t.common.action[selected]}</span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </a>
      <p className={styles.note}>{download ? t.common.downloadNote : t.common.messageNote}</p>
      {course === "yggdrasil" && selected === "express" ? (
        <a className={styles.checklistLink} href={"/" + locale + "/academy/reiki/yggdrasil/free-initiation"}>
          {locale === "ru" ? "Как начать бесплатно: чтение и 7 вопросов →" : locale === "es" ? "Cómo comenzar gratis: lecturas y 7 preguntas →" : "How to begin for free: reading guide and 7 questions →"}
        </a>
      ) : null}
      <div className={styles.footer}>
        <div className={styles.trust}><span><Check size={15} aria-hidden="true" /> {t.common.reply}</span><span><Check size={15} aria-hidden="true" /> {t.common.obligation}</span></div>
        <div className={styles.secondary}>
          <a href={consultationUrl} id="reiki-free-consultation" target="_blank" rel="noopener noreferrer">{t.common.consultation}</a>
          <a href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer"><Send size={14} aria-hidden="true" /> {t.common.telegram}</a>
        </div>
      </div>
    </section>
  );
}
