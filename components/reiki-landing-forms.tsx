import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { ReikiChoiceCapture } from "@/components/reiki-choice-capture";
import type { PublicLocale } from "@/lib/public-locales";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";

type Kind = "first-level" | "consultation";

// Lightweight direct-contact cards. No signup form, client-side submission,
// personal data capture or hidden follow-up questions.
const copy = {
  en: {
    "first-level": {
      eyebrow: "Start with a gift",
      title: "Free Reiki Yggdrasil Level 1",
      lead: "Request the first level directly from Andrey. No form to fill in.",
      message: "I'd like to receive the free first level of Reiki Yggdrasil.",
    },
    consultation: {
      eyebrow: "Let's talk",
      title: "Free personal consultation",
      lead: "Ask for an introductory conversation about your situation. No obligation.",
      message: "I'd like to request a free personal consultation about my situation.",
    },
  },
  ru: {
    "first-level": {
      eyebrow: "Подарок для начала",
      title: "1-я ступень Рейки Иггдрасиль — бесплатно",
      lead: "Напишите Андрею и получите информацию о бесплатной первой ступени.",
      message: "Хочу получить бесплатно первую ступень Рейки Иггдрасиль.",
    },
    consultation: {
      eyebrow: "Давайте познакомимся",
      title: "Бесплатная личная консультация",
      lead: "Напишите, чтобы договориться о вводной беседе и разборе вашей ситуации.",
      message: "Хочу записаться на бесплатную личную консультацию — разбор ситуации.",
    },
  },
  es: {
    "first-level": {
      eyebrow: "Un regalo para comenzar",
      title: "Nivel 1 de Reiki Yggdrasil gratis",
      lead: "Escríbele a Andrey para solicitar el primer nivel gratuito, sin formularios.",
      message: "Quiero solicitar gratis el primer nivel de Reiki Yggdrasil.",
    },
    consultation: {
      eyebrow: "Hablemos",
      title: "Consulta personal gratuita",
      lead: "Escríbele para pedir una conversación inicial sobre tu situación.",
      message: "Quiero pedir una consulta personal introductoria gratuita.",
    },
  },
} as const;

function ReikiContactCard({ locale, kind, course }: { locale: PublicLocale; kind: Kind; course: string }) {
  const item = copy[locale][kind];
  const whatsappUrl = whatsappEnquiryUrl({
    locale,
    service: course,
    request: item.message,
    option: item.title,
  });
  return (
    <article className={"reiki-offer-card " + (kind === "first-level" ? "reiki-offer-card--gift" : "reiki-offer-card--consult")} data-reiki-contact={kind}>
      <div className="reiki-offer-card__intro">
        <span className="reiki-offer-card__eyebrow">{item.eyebrow}</span>
        <h3>{item.title}</h3>
        <p>{item.lead}</p>
      </div>
      <div className="reiki-offer-card__actions" aria-label={item.title}>
        <ContactChannelChooser
        stayAfterSave locale={locale} whatsappUrl={whatsappUrl} />
      </div>
    </article>
  );
}

// Keep existing exported names and anchor IDs so all site links continue to work.
// Retain the historical export and the #reiki-free-level-one deep link.
export function YggdrasilLeadForms({ locale, placement = "bottom" }: { locale: PublicLocale; placement?: "top" | "bottom" }) {
  return <ReikiChoiceCapture locale={locale} course="yggdrasil" placement={placement} />;
}

export function ReikiConsultationForm({ locale, course }: { locale: PublicLocale; course: string }) {
  return (
    <section className="reiki-standalone-consultation" id="reiki-free-consultation" aria-label={copy[locale].consultation.title}>
      <ReikiContactCard locale={locale} kind="consultation" course={course} />
    </section>
  );
}
