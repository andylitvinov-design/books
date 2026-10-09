"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Download, HeartHandshake, MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./reiki-choice-capture.module.css";

type Course = "tantra" | "yggdrasil";
type Choice = "guide" | "free" | "master";
const choices: Choice[] = ["guide", "free", "master"];
const whatsapp = "https://wa.me/14376066502?text=";

const copy = {
  en: {
    common: {
      eyebrow: "YOUR NEXT STEP · DIRECTLY WITH ANDREY",
      choose: "What interests you most?",
      downloadNote: "A detailed programme outline will download as a readable text file. Full lessons remain on this page.",
      messageNote: "WhatsApp opens a prepared request. Nothing is sent until you press Send.",
      telegram: "Or write directly on Telegram",
      consultation: "Prefer to talk first? Request a free consultation",
      reply: "Personal reply",
      obligation: "No obligation",
    },
    tantra: {
      title: "Explore Tantra Reiki together",
      lead: "Choose how you'd like to start. I'll personally reply about the next step.",
      options: {
        guide: "Download detailed description",
        free: "Free express initiation",
        master: "Tantra Reiki Master Course",
      },
      actions: {
        guide: "Download course description",
        free: "Request free express initiation",
        master: "Ask to join the Master Course",
      },
      messages: {
        free: "Hello Andrey! I'd like to book a free express initiation in Tantra Reiki. Please tell me how it works and when we could arrange it.",
        master: "Hello Andrey! I'm interested in enrolling in the Tantra Reiki Master Course. Please tell me about the current programme, dates, format and conditions.",
        consultation: "Hello Andrey! I'd like to request a free personal consultation about Tantra Reiki.",
      },
    },
    yggdrasil: {
      title: "Start your Reiki Yggdrasil journey",
      lead: "Choose what you need: the programme, a free first step, or personal training.",
      options: {
        guide: "Download detailed description",
        free: "Receive Level 1 for free",
        master: "Explore the full Reiki Yggdrasil course",
      },
      actions: {
        guide: "Download course description",
        free: "Request free Level 1",
        master: "Ask about the full course",
      },
      messages: {
        free: "Hello Andrey! I'd like to receive the free first level of Reiki Yggdrasil. Please tell me how to begin.",
        master: "Hello Andrey! I'm interested in the full Reiki Yggdrasil programme. Please tell me about the modules, study format and current enrolment options.",
        consultation: "Hello Andrey! I'd like to request a free personal consultation about Reiki Yggdrasil.",
      },
    },
  },
  ru: {
    common: {
      eyebrow: "ВАШ СЛЕДУЮЩИЙ ШАГ · ЛИЧНО С АНДРЕЕМ",
      choose: "Что вас интересует?",
      downloadNote: "Скачается подробный план программы в текстовом формате. Полные материалы курса остаются на странице.",
      messageNote: "Откроется готовое сообщение WhatsApp. Оно отправится только после вашего подтверждения.",
      telegram: "Или напишите в Telegram",
      consultation: "Хотите сначала поговорить? Бесплатная консультация",
      reply: "Личный ответ",
      obligation: "Без обязательств",
    },
    tantra: {
      title: "Откройте Тантра Рейки",
      lead: "Выберите подходящий первый шаг — я лично отвечу и подскажу, как начать.",
      options: {
        guide: "Скачать подробное описание",
        free: "Бесплатная экспресс-инициация",
        master: "Курс Мастер Тантра Рейки",
      },
      actions: {
        guide: "Скачать описание курса",
        free: "Записаться на экспресс-инициацию",
        master: "Записаться на мастер-курс",
      },
      messages: {
        free: "Здравствуйте, Андрей! Хочу записаться на бесплатную экспресс-инициацию в Тантра Рейки. Подскажите, пожалуйста, как она проходит и когда можно договориться.",
        master: "Здравствуйте, Андрей! Хочу записаться на курс Мастер Тантра Рейки. Расскажите, пожалуйста, о программе, датах и условиях участия.",
        consultation: "Здравствуйте, Андрей! Хочу договориться о бесплатной личной консультации по Тантра Рейки.",
      },
    },
    yggdrasil: {
      title: "Начните знакомство с Рейки Иггдрасиль",
      lead: "Выберите описание, бесплатную первую ступень или обучение всей системе.",
      options: {
        guide: "Скачать подробное описание",
        free: "Бесплатная первая ступень",
        master: "Полный курс Рейки Иггдрасиль",
      },
      actions: {
        guide: "Скачать описание курса",
        free: "Получить первую ступень",
        master: "Узнать о полном курсе",
      },
      messages: {
        free: "Здравствуйте, Андрей! Хочу получить бесплатно первую ступень Рейки Иггдрасиль. Подскажите, как начать.",
        master: "Здравствуйте, Андрей! Интересует полный курс Рейки Иггдрасиль. Расскажите, пожалуйста, о модулях, формате обучения и условиях записи.",
        consultation: "Здравствуйте, Андрей! Хочу записаться на бесплатную личную консультацию по Рейки Иггдрасиль.",
      },
    },
  },
  es: {
    common: {
      eyebrow: "TU PRÓXIMO PASO · DIRECTAMENTE CON ANDREY",
      choose: "¿Qué te interesa?",
      downloadNote: "Se descargará una descripción detallada en texto. El programa completo sigue en esta página.",
      messageNote: "WhatsApp abrirá un mensaje preparado que solo se envía si confirmas Enviar.",
      telegram: "O escríbeme por Telegram",
      consultation: "¿Prefieres hablar primero? Consulta gratuita",
      reply: "Respuesta personal",
      obligation: "Sin compromiso",
    },
    tantra: {
      title: "Descubre Tantra Reiki",
      lead: "Elige tu siguiente paso. Te responderé personalmente.",
      options: {
        guide: "Descargar descripción detallada",
        free: "Iniciación exprés gratuita",
        master: "Curso de Maestría Tantra Reiki",
      },
      actions: {
        guide: "Descargar descripción del curso",
        free: "Solicitar iniciación gratuita",
        master: "Consultar el curso de maestría",
      },
      messages: {
        free: "Hola Andrey. Quisiera solicitar una iniciación exprés gratuita de Tantra Reiki. ¿Cómo funciona y cuándo podemos coordinarla?",
        master: "Hola Andrey. Me interesa el curso de Maestría Tantra Reiki. ¿Cuáles son el programa, las fechas y los requisitos?",
        consultation: "Hola Andrey. Quisiera solicitar una consulta introductoria gratuita sobre Tantra Reiki.",
      },
    },
    yggdrasil: {
      title: "Empieza Reiki Yggdrasil",
      lead: "Elige la descripción, el primer nivel gratuito o la formación completa.",
      options: {
        guide: "Descargar descripción detallada",
        free: "Primer nivel gratis",
        master: "Curso completo Reiki Yggdrasil",
      },
      actions: {
        guide: "Descargar descripción del curso",
        free: "Solicitar el primer nivel gratis",
        master: "Consultar la formación completa",
      },
      messages: {
        free: "Hola Andrey. Me gustaría recibir el primer nivel gratuito de Reiki Yggdrasil. ¿Cómo puedo comenzar?",
        master: "Hola Andrey. Me interesa el programa completo de Reiki Yggdrasil. ¿Cuáles son los módulos, el formato y las opciones actuales?",
        consultation: "Hola Andrey. Quisiera solicitar una consulta introductoria gratuita sobre Reiki Yggdrasil.",
      },
    },
  },
} as const;

export function ReikiChoiceCapture({ locale, course }: { locale: PublicLocale; course: Course }) {
  const [selected, setSelected] = useState<Choice>("free");
  const t = copy[locale];
  const c = t[course];

  // Deep-linked course CTAs also switch the selected action, including after hydration.
  useEffect(() => {
    const syncHash = () => {
      if (course === "tantra" && window.location.hash === "#tantra-master-course") setSelected("master");
      if (course === "yggdrasil" && window.location.hash === "#reiki-free-level-one") setSelected("free");
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [course]);

  const download = selected === "guide";
  const actionUrl = download
    ? "/academy/course-guides/" + course + "." + locale + ".txt"
    : whatsapp + encodeURIComponent(selected === "free" ? c.messages.free : c.messages.master);
  const consultationUrl = whatsapp + encodeURIComponent(c.messages.consultation);
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
            <span>{c.options[choice]}</span>
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
      >
        {download ? <Download size={19} aria-hidden="true" /> : <MessageCircle size={20} aria-hidden="true" />}
        <span>{c.actions[selected]}</span>
        <ArrowUpRight size={20} aria-hidden="true" />
      </a>
      <p className={styles.note}>{download ? t.common.downloadNote : t.common.messageNote}</p>
       {course === "yggdrasil" && selected === "free" ? (
         <a className={styles.checklistLink} href={`/${locale}/academy/reiki/yggdrasil/free-initiation`}>
           {locale === "ru" ? "Как получить бесплатно: материалы и 7 вопросов →" : locale === "es" ? "Cómo comenzar gratis: lecturas y 7 preguntas →" : "How to begin for free: reading guide and 7 questions →"}
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
