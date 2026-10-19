"use client";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { classifyPublicLead, trainingEnquiryUrl } from "@/lib/public-lead-capture";
import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";
import { ConsultationCartEntry } from "@/components/commerce/consultation-cart-entry";

const copy = {
  en: {
    personal: {
      eyebrow: "A gentle first step",
      title: "You can simply write to me",
      text: "Start with a free coaching form and handwritten drawing for a written report, or ask about a paid personal session (€50 / 30 min or €100 / 60 min).",
      whatsapp: "WhatsApp · +1 437 606 6502",
      telegram: "Telegram · @AndyTherapist",
      free: "Free situation review",
      message: "Hello Andy. I found you through Holistic House and would like to ask about a personal consultation.",
    },
    reading: {
      eyebrow: "When a question becomes personal",
      title: "Want to talk about your own situation?",
      text: "These pages are educational. A free coaching form and handwritten drawing can lead to a personal written situation review, not a medical diagnosis.",
      whatsapp: "Ask via WhatsApp",
      telegram: "Telegram · @AndyTherapist",
      free: "Start with a free review",
      message: "Hello Andy. I have been reading Holistic House material and would like to ask about a personal situation.",
    },
    training: {
      eyebrow: "Explore the Academy with a teacher",
      title: "Interested in training or the next level?",
      text: "Ask about the programme, entry point, availability and format. Dates, fees and whether historical programmes are currently taught can be confirmed directly.",
      whatsapp: "Ask about training via WhatsApp",
      telegram: "Telegram · @AndyTherapist",
      free: "Explore Academy",
      message: "",
    },
  },
  ru: {
    personal: {
      eyebrow: "Первый шаг без давления",
      title: "Можно просто написать мне",
      text: "Отправьте коучинг-форму и рисунок ручкой для бесплатного письменного отчёта. Личная сессия отдельно: €50 / 30 мин или €100 / 60 мин.",
      whatsapp: "WhatsApp · +1 437 606 6502",
      telegram: "Telegram · @AndyTherapist",
      free: "Бесплатная диагностика",
      message: "Здравствуйте, Андрей. Я пишу с сайта Holistic House и хотел(а) бы уточнить насчёт личной консультации.",
    },
    reading: {
      eyebrow: "От знаний — к своему вопросу",
      title: "Хотите обсудить собственную ситуацию?",
      text: "Это образовательные материалы. Коучинг-форма и рисунок от руки позволяют получить бесплатный письменный разбор, не медицинский диагноз.",
      whatsapp: "Спросить в WhatsApp",
      telegram: "Telegram · @AndyTherapist",
      free: "Бесплатный разбор ситуации",
      message: "Здравствуйте, Андрей. Прочитал(а) материалы Holistic House и хочу обсудить личный вопрос.",
    },
    training: {
      eyebrow: "Знакомство с Академией",
      title: "Хотите узнать про обучение и ступени?",
      text: "Спросите о программе, уровне входа, формате и наличии мест. Даты и стоимость уточняются лично; архивные программы могут быть закрыты для записи.",
      whatsapp: "Узнать об обучении в WhatsApp",
      telegram: "Telegram · @AndyTherapist",
      free: "Все программы Академии",
      message: "",
    },
  },
  es: {
    personal: {
      eyebrow: "Un primer paso sencillo",
      title: "Puedes escribirme directamente",
      text: "Empieza con un formulario de coaching y dibujo a mano para un informe escrito gratuito, o elige una sesión pagada de €50 / 30 min o €100 / 60 min.",
      whatsapp: "WhatsApp · +1 437 606 6502",
      telegram: "Telegram · @AndyTherapist",
      free: "Evaluación inicial gratuita",
      message: "Hola Andy. Te escribo desde Holistic House y me gustaría consultar sobre una sesión personal.",
    },
    reading: {
      eyebrow: "Del aprendizaje a tu pregunta",
      title: "¿Quieres hablar de tu propia situación?",
      text: "Estos materiales son educativos. Un formulario de coaching y dibujo a mano permiten solicitar un informe escrito gratuito, no un diagnóstico médico.",
      whatsapp: "Consultar por WhatsApp",
      telegram: "Telegram · @AndyTherapist",
      free: "Evaluación gratuita",
      message: "Hola Andy. He leído material de Holistic House y tengo una pregunta personal.",
    },
    training: {
      eyebrow: "Conoce la Academia",
      title: "¿Quieres conocer la formación y sus niveles?",
      text: "Pregunta por el programa, nivel de entrada, modalidad y disponibilidad. Fechas y precios se confirman directamente; algunos programas del archivo ya no admiten inscripciones.",
      whatsapp: "Consultar formación en WhatsApp",
      telegram: "Telegram · @AndyTherapist",
      free: "Explorar la Academia",
      message: "",
    },
  },
} as const;

export function PublicConsultationCta({ locale, id, serviceBooking = false, wiseEnabled = false, paypalPersonalEnabled = false }: { locale: "en" | "ru" | "es"; id?: string; serviceBooking?: boolean; wiseEnabled?: boolean; paypalPersonalEnabled?: boolean }) {
  const pathname = usePathname();
  // Match the server-rendered default on first hydration; resolve route intent after mount.
  const [clientPath, setClientPath] = useState<string | null>(null);
  useEffect(() => setClientPath(pathname), [pathname]);
  // Delay context-dependent public CTAs until the browser pathname is stable:
  // rewritten and locale routes can differ between SSR and hydration (#418).
  // Both server render and the first client render now agree on null.
  // The dedicated Services page has a stable paid selector before hydration.
  // Keep other public, training and private paths on their existing route rules.
  if (serviceBooking) return <ConsultationCartEntry locale={locale} id={id} />;
  if (clientPath === null) return null;
  const route = clientPath ? classifyPublicLead(clientPath) : null;
  const mode = route?.kind === "training" ? "training" : route?.kind === "reading" ? "reading" : "personal";
  if (mode !== "training") {
    return <ConsultationChoiceCapture locale={locale} variant={mode === "reading" ? "reading" : "personal"} id={id} />;
  }
  const text = copy[locale][mode];
  const whatsappUrl = trainingEnquiryUrl(locale, pathname);
  const further = mode === "training" ? "/" + locale + "/academy" : "/" + locale + "/services/free-situation-review";
  return (
    <aside className="public-consultation-cta" id={id} aria-label={text.title} data-consultation-cta data-conversion-kind={mode} lang={locale}>
      <div className="public-consultation-cta__copy">
        <p>{text.eyebrow}</p>
        <h2>{text.title}</h2>
        <span>{text.text}</span>
      </div>
      <div className="public-consultation-cta__actions">
        <ContactChannelChooser locale={locale} whatsappUrl={whatsappUrl} event="academy_course_enquiry_click" />
        <Link prefetch={false} href={further}>{text.free}<ArrowRight aria-hidden="true" size={17}/></Link>
      </div>
    </aside>
  );
}
