"use client";

import { useState } from "react";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./free-resource-enquiry.module.css";

type EnquiryKind = "situation" | "dao";
const text = {
  en: {
    topic: "What would you like to explore?",
    action: "Continue with a free request",
    note: "Choose a topic, then enter your name, email or phone, and a short enquiry once in the request form. Submitting it sends those details and your reply consent to the site for CRM registration. After receipt confirmation, WhatsApp or Telegram is optional; you decide whether to send a message there.",
    situation: {
      title: "Your free written review",
      lead: "Start with one topic. Andrey will explain how to send the short questionnaire and your handwritten drawing.",
      service: "Free written Situation Review",
      request: "I would like a free written situation review. Please tell me how to send my completed coaching questionnaire and the handwritten ME / GOAL / PROBLEM drawing. I understand this is not a live call.",
      topics: ["Relationships & family", "Personal decision", "Work & business", "Inner state / resources"],
    },
    dao: {
      title: "Your free Wu Xing enquiry",
      lead: "Choose an area that interests you and prepare a short message for a personal symbolic resource review.",
      service: "Free symbolic Wu Xing Resource Profile",
      request: "I would like to request the free symbolic Wu Xing Resource Profile. Please explain the next step. I understand this is a self-reflection model, not a medical assessment.",
      topics: ["Balance & everyday energy", "Focus & direction", "Relationships & connection", "Personal strengths & resources"],
    },
  },
  ru: {
    topic: "Какой вопрос хотите исследовать?",
    action: "Продолжить бесплатный запрос",
    note: "Выберите тему, затем один раз укажите имя, email или телефон и краткий запрос в форме заявки. При её отправке эти данные и согласие на личный ответ передаются на сайт для регистрации заявки в CRM. После подтверждения получения можно по желанию перейти в WhatsApp или Telegram; сообщение там отправляете вы сами.",
    situation: {
      title: "Ваш бесплатный письменный разбор",
      lead: "Выберите тему. Андрей подскажет, как прислать короткую анкету и рисунок от руки.",
      service: "Бесплатный письменный разбор ситуации",
      request: "Хочу получить бесплатный письменный разбор ситуации. Подскажите, как прислать коучинг-анкету и рисунок «Я / ЦЕЛЬ / ПРОБЛЕМА» от руки. Понимаю, что это не видеозвонок.",
      topics: ["Отношения и семья", "Личное решение", "Работа и бизнес", "Внутреннее состояние и ресурсы"],
    },
    dao: {
      title: "Бесплатный запрос профиля У-Син",
      lead: "Выберите область интереса и подготовьте короткий запрос на символический профиль ресурсов.",
      service: "Бесплатный символический профиль ресурсов У-Син",
      request: "Хочу получить бесплатный символический профиль ресурсов У-Син. Подскажите следующий шаг. Понимаю, что это инструмент самоисследования, а не медицинская диагностика.",
      topics: ["Баланс и энергия", "Фокус и направление", "Отношения и контакт", "Сильные стороны и опоры"],
    },
  },
  es: {
    topic: "¿Qué te gustaría explorar?",
    action: "Continuar con la solicitud gratuita",
    note: "Elige un tema y completa una sola vez tu nombre, email o teléfono y una consulta breve en el formulario de solicitud. Al enviarlo, esos datos y tu consentimiento para una respuesta personal se envían al sitio para registrar la solicitud en el CRM. Tras la confirmación de recepción, WhatsApp o Telegram son opcionales; tú decides si envías un mensaje allí.",
    situation: {
      title: "Tu revisión gratuita por escrito",
      lead: "Elige un tema. Andrey te explicará cómo enviar el cuestionario breve y tu dibujo a mano.",
      service: "Revisión escrita gratuita de la situación",
      request: "Quiero una revisión escrita gratuita de mi situación. Explícame cómo enviar el cuestionario y el dibujo YO / META / PROBLEMA a mano. Entiendo que no incluye videollamada.",
      topics: ["Relaciones y familia", "Decisión personal", "Trabajo y negocio", "Estado interior y recursos"],
    },
    dao: {
      title: "Tu consulta gratuita Wu Xing",
      lead: "Elige un aspecto que te interese y prepara una solicitud para una reflexión simbólica sobre tus recursos.",
      service: "Perfil simbólico gratuito de recursos Wu Xing",
      request: "Quisiera solicitar el perfil simbólico gratuito de recursos Wu Xing. Explícame el siguiente paso. Entiendo que no es una evaluación médica.",
      topics: ["Equilibrio y energía diaria", "Enfoque y dirección", "Relaciones y conexión", "Fortalezas personales y recursos"],
    },
  },
} as const;

export function FreeResourceEnquiry({ locale, kind }: { locale: PublicLocale; kind: EnquiryKind }) {
  const t = text[locale];
  const offer = t[kind];
  const [topic, setTopic] = useState(0);
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: offer.service,
    request: offer.request,
    topic: offer.topics[topic],
    // Only the editorially approved broad topic is placed in either messenger URL.
    // Contact details and the short enquiry are entered once in the consented form below.
    pagePath: "/" + locale + "/services/" + (kind === "dao" ? "dao-health-profile" : "free-situation-review"),
  });

  return (
    <section className={styles.form} data-free-resource-enquiry={kind} aria-label={offer.title}>
      <p className={styles.eyebrow}><MessageCircle size={16} aria-hidden="true" />{offer.title}</p>
      <p className={styles.lead}>{offer.lead}</p>
      <div className={styles.fields}>
        <label>{t.topic}
          <select value={topic} onChange={(event) => setTopic(Number(event.target.value))}>
            {offer.topics.map((item, index) => <option key={item} value={index}>{item}</option>)}
          </select>
        </label>
      </div>
      <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} label={t.action}
        className={styles.action} event="service_request_start" attributes={{ "data-free-enquiry-kind": kind }} />
      <p className={styles.note}><ShieldCheck size={16} aria-hidden="true" />{t.note}</p>
    </section>
  );
}
