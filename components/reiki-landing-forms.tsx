import { MessageCircle, Send } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";

type Kind = "first-level" | "consultation";

// Lightweight direct-contact cards. No signup form, client-side submission,
// personal data capture or hidden follow-up questions.
const copy = {
  en: {
    "first-level": {
      eyebrow: "Start with a gift",
      title: "Free Reiki Yggdrasil Level 1",
      lead: "Request the first level directly from Andrey. No form to fill in.",
      message: "Hello Andrey! I'd like to receive the free first level of Reiki Yggdrasil.",
    },
    consultation: {
      eyebrow: "Let's talk",
      title: "Free personal consultation",
      lead: "Ask for an introductory conversation about your situation. No obligation.",
      message: "Hello Andrey! I'd like to request a free personal consultation about my situation.",
    },
  },
  ru: {
    "first-level": {
      eyebrow: "Подарок для начала",
      title: "1-я ступень Рейки Иггдрасиль — бесплатно",
      lead: "Напишите Андрею и получите информацию о бесплатной первой ступени.",
      message: "Здравствуйте, Андрей! Хочу получить бесплатно первую ступень Рейки Иггдрасиль.",
    },
    consultation: {
      eyebrow: "Давайте познакомимся",
      title: "Бесплатная личная консультация",
      lead: "Напишите, чтобы договориться о вводной беседе и разборе вашей ситуации.",
      message: "Здравствуйте, Андрей! Хочу записаться на бесплатную личную консультацию — разбор ситуации.",
    },
  },
  es: {
    "first-level": {
      eyebrow: "Un regalo para comenzar",
      title: "Nivel 1 de Reiki Yggdrasil gratis",
      lead: "Escríbele a Andrey para solicitar el primer nivel gratuito, sin formularios.",
      message: "Hola Andrey. Quiero solicitar gratis el primer nivel de Reiki Yggdrasil.",
    },
    consultation: {
      eyebrow: "Hablemos",
      title: "Consulta personal gratuita",
      lead: "Escríbele para pedir una conversación inicial sobre tu situación.",
      message: "Hola Andrey. Quiero pedir una consulta personal introductoria gratuita.",
    },
  },
} as const;

function ReikiContactCard({ locale, kind, course }: { locale: PublicLocale; kind: Kind; course: string }) {
  const item = copy[locale][kind];
  const whatsappUrl = "https://wa.me/14376066502?text=" +
    encodeURIComponent(item.message + "\n" + "Course: " + course + " · Holistic House");
  return (
    <article className={"reiki-offer-card " + (kind === "first-level" ? "reiki-offer-card--gift" : "reiki-offer-card--consult")} data-reiki-contact={kind}>
      <div className="reiki-offer-card__intro">
        <span className="reiki-offer-card__eyebrow">{item.eyebrow}</span>
        <h3>{item.title}</h3>
        <p>{item.lead}</p>
      </div>
      <div className="reiki-offer-card__actions" aria-label={item.title}>
        <a className="reiki-offer-card__whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={"WhatsApp — " + item.title}>
          <MessageCircle size={17} aria-hidden="true" /> WhatsApp
        </a>
        <a className="reiki-offer-card__telegram" href="https://t.me/AndyTherapist" target="_blank" rel="noopener noreferrer" aria-label={"Telegram — " + item.title}>
          <Send size={16} aria-hidden="true" /> Telegram
        </a>
      </div>
    </article>
  );
}

// Keep existing exported names and anchor IDs so all site links continue to work.
export function YggdrasilLeadForms({ locale }: { locale: PublicLocale }) {
  return (
    <section className="reiki-landing-forms" id="reiki-free-level-one" aria-label={locale === "ru" ? "Бесплатная первая ступень и консультация" : locale === "es" ? "Primer nivel gratis y consulta" : "Free Reiki Level 1 and personal consultation"}>
      <ReikiContactCard locale={locale} kind="first-level" course="Reiki Yggdrasil" />
      <div id="reiki-free-consultation"><ReikiContactCard locale={locale} kind="consultation" course="Reiki Yggdrasil" /></div>
    </section>
  );
}

export function ReikiConsultationForm({ locale, course }: { locale: PublicLocale; course: string }) {
  return (
    <section className="reiki-standalone-consultation" id="reiki-free-consultation" aria-label={copy[locale].consultation.title}>
      <ReikiContactCard locale={locale} kind="consultation" course={course} />
    </section>
  );
}
