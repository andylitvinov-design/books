"use client";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { classifyPublicLead, trainingEnquiryUrl } from "@/lib/public-lead-capture";

const copy = {
  en: {
    personal: {
      eyebrow: "A gentle first step",
      title: "You can simply write to me",
      text: "Ask about working together, or begin with a free situation review. You do not need to choose a method before we speak.",
      whatsapp: "WhatsApp · +1 437 606 6502",
      telegram: "Telegram · @AndyTherapist",
      free: "Free situation review",
      message: "Hello Andy. I found you through Holistic House and would like to ask about a personal consultation.",
    },
    reading: {
      eyebrow: "When a question becomes personal",
      title: "Want to talk about your own situation?",
      text: "These pages are for learning. A free introductory conversation can help you explore an individual question without treating the material as a medical diagnosis.",
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
      text: "Обсудите личный запрос или начните с бесплатной диагностики ситуации. Заранее выбирать метод не нужно.",
      whatsapp: "WhatsApp · +1 437 606 6502",
      telegram: "Telegram · @AndyTherapist",
      free: "Бесплатная диагностика",
      message: "Здравствуйте, Андрей. Я пишу с сайта Holistic House и хотел(а) бы уточнить насчёт личной консультации.",
    },
    reading: {
      eyebrow: "От знаний — к своему вопросу",
      title: "Хотите обсудить собственную ситуацию?",
      text: "Это образовательные материалы. Бесплатная вводная беседа поможет прояснить личный вопрос — без медицинской диагностики и обязательства продолжать.",
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
      text: "Pregunta por una sesión individual o empieza con una evaluación gratuita de tu situación, sin elegir un método de antemano.",
      whatsapp: "WhatsApp · +1 437 606 6502",
      telegram: "Telegram · @AndyTherapist",
      free: "Evaluación inicial gratuita",
      message: "Hola Andy. Te escribo desde Holistic House y me gustaría consultar sobre una sesión personal.",
    },
    reading: {
      eyebrow: "Del aprendizaje a tu pregunta",
      title: "¿Quieres hablar de tu propia situación?",
      text: "Estos materiales son educativos. Una conversación gratuita puede ayudar a aclarar tu consulta, sin diagnóstico médico ni compromiso.",
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

export function PublicConsultationCta({ locale, id }: { locale: "en" | "ru" | "es"; id?: string }) {
  const pathname = usePathname();
  // Match the server-rendered default on first hydration; resolve route intent after mount.
  const [clientPath, setClientPath] = useState<string | null>(null);
  useEffect(() => setClientPath(pathname), [pathname]);
  const route = clientPath ? classifyPublicLead(clientPath) : null;
  const mode = route?.kind === "training" ? "training" : route?.kind === "reading" ? "reading" : "personal";
  const text = copy[locale][mode];
  const whatsappUrl = mode === "training"
    ? trainingEnquiryUrl(locale, pathname)
    : "https://wa.me/14376066502?text=" + encodeURIComponent(text.message);
  const further = mode === "training" ? "/" + locale + "/academy" : "/" + locale + "/services/free-situation-review";
  return (
    <aside className="public-consultation-cta" id={id} aria-label={text.title} data-consultation-cta data-conversion-kind={mode} lang={locale}>
      <div className="public-consultation-cta__copy">
        <p>{text.eyebrow}</p>
        <h2>{text.title}</h2>
        <span>{text.text}</span>
      </div>
      <div className="public-consultation-cta__actions">
        <AcquisitionEventLink prefetch={false} href={whatsappUrl} rel="noopener noreferrer" target="_blank" attributes={{ "data-contact-channel": "whatsapp" }} event={mode === "training" ? "contact_click" : "service_request_start"}>
          <span data-contact-channel="whatsapp">{text.whatsapp}</span><ArrowUpRight aria-hidden="true" />
        </AcquisitionEventLink>
        <AcquisitionEventLink prefetch={false} href="https://t.me/AndyTherapist" rel="noopener noreferrer" target="_blank" attributes={{ "data-contact-channel": "telegram" }} event="contact_click">
          <span data-contact-channel="telegram">{text.telegram}</span><ArrowUpRight aria-hidden="true" />
        </AcquisitionEventLink>
        <Link prefetch={false} href={further}>{text.free}<ArrowRight aria-hidden="true" size={17}/></Link>
      </div>
    </aside>
  );
}
