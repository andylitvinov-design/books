"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { classifyPublicLead, trainingEnquiryUrl } from "@/lib/public-lead-capture";
import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";
import styles from "./sitewide-lead-capture.module.css";

const copy = {
  en: {
    network: {
      eyebrow: "Holistic House practitioner network",
      title: "Explore a service with the right practitioner.",
      description: "Review the practitioner's services and request the one that interests you. Each independent practitioner confirms their own availability, format and fees.",
      primary: "Explore practitioner services",
      service: "Request this service",
      secondary: "See all services",
    },
    training: {
      eyebrow: "Explore training with Holistic House",
      title: "Would you like to learn this practice?",
      description: "Ask about the programme, entry level, teaching format and current availability. Dates and fees are discussed directly; historical archive materials are not necessarily open for enrolment.",
      primary: "Ask about training",
      secondary: "Explore the Academy",
    },
    reading: {
      eyebrow: "From reading to a personal question",
      title: "Want to explore how this relates to your life?",
      description: "If something in this material speaks to a situation you're facing, start with a free personal conversation. No obligation to choose a method or book paid work.",
      primary: "Start with a free situation review",
      secondary: "Explore personal work",
    },
    personal: {
      eyebrow: "Your personal first step",
      title: "You don't have to choose a method alone.",
      description: "Tell me what's important to you. We'll explore where you're stuck and which of the three approaches, if any, may be appropriate. The introductory review is free.",
      primary: "Request a free situation review",
      secondary: "Meet Andrey",
    },
  },
  ru: {
    network: {
      eyebrow: "Сеть практиков Holistic House",
      title: "Выберите специалиста под свой запрос.",
      description: "Посмотрите услуги выбранного практика и отправьте запрос. Условия, доступность и стоимость каждый практик уточняет индивидуально.",
      primary: "Посмотреть услуги практика",
      service: "Запросить эту услугу",
      secondary: "Все услуги",
    },
    training: {
      eyebrow: "Обучение в Holistic House",
      title: "Хотите изучить эту практику?",
      description: "Уточните программу, подходящую ступень, формат и доступность обучения. Даты и стоимость согласуются лично; исторические архивные программы могут быть закрыты для записи.",
      primary: "Узнать об обучении",
      secondary: "Вся Академия",
    },
    reading: {
      eyebrow: "От чтения — к личному запросу",
      title: "Хотите обсудить, как это связано с вашей жизнью?",
      description: "Если материал затронул важный для вас вопрос, начните с бесплатного личного разбора ситуации. Не нужно заранее выбирать метод или покупать сеансы.",
      primary: "Бесплатный разбор ситуации",
      secondary: "Мои услуги",
    },
    personal: {
      eyebrow: "Первый шаг к ясности",
      title: "Вам не нужно самостоятельно выбирать метод.",
      description: "Расскажите, что сейчас важно. Мы обсудим точку затруднения и подходящее направление, если оно нужно. Первая вводная беседа бесплатная.",
      primary: "Запросить бесплатный разбор",
      secondary: "Об Андрее",
    },
  },
  es: {
    network: {
      eyebrow: "Red de profesionales de Holistic House",
      title: "Encuentra al profesional para tu consulta.",
      description: "Explora los servicios y solicita el que te interesa. Cada profesional confirma su disponibilidad, modalidad y tarifas de manera individual.",
      primary: "Explorar los servicios",
      service: "Solicitar este servicio",
      secondary: "Todos los servicios",
    },
    training: {
      eyebrow: "Formación en Holistic House",
      title: "¿Quieres aprender esta práctica?",
      description: "Pregunta por el programa, el nivel de entrada, el formato y la disponibilidad. Las fechas y los precios se confirman directamente; los materiales de archivo no siempre están abiertos a inscripción.",
      primary: "Consultar la formación",
      secondary: "Explorar la Academia",
    },
    reading: {
      eyebrow: "De la lectura a tu pregunta personal",
      title: "¿Quieres explorar cómo se relaciona esto con tu vida?",
      description: "Si este material refleja algo importante para ti, puedes empezar con una conversación introductoria gratuita. No hay obligación de contratar sesiones.",
      primary: "Evaluación gratuita de tu situación",
      secondary: "Explorar servicios",
    },
    personal: {
      eyebrow: "Tu primer paso personal",
      title: "No tienes que elegir el método a solas.",
      description: "Cuéntame qué es importante hoy. Podemos explorar dónde te sientes bloqueado y qué enfoque podría tener sentido. La conversación inicial es gratuita.",
      primary: "Solicitar una evaluación gratuita",
      secondary: "Conoce a Andrey",
    },
  },
} as const;

export function SitewideLeadCapture() {
  const pathname = usePathname();
  // Resolve path-based marketing only after hydration. Rewritten public routes may
  // differ between SSR and the browser; rendering null for both initial passes avoids #418.
  const [clientPath, setClientPath] = useState<string | null>(null);
  const [legacyBookLocale, setLegacyBookLocale] = useState<"en" | "ru">("ru");
  useEffect(() => {
    setClientPath(pathname);
    if (/^\/books\/[^/]+/.test(pathname)) {
      setLegacyBookLocale(new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "ru");
    }
  }, [pathname]);
  const route = clientPath ? classifyPublicLead(clientPath) : null;
  if (!route) return null;
  const locale = (/^\/books\/[^/]+/.test(pathname) ? legacyBookLocale : route.locale) as "en" | "ru" | "es";
  const kind = route.kind as "training" | "reading" | "personal" | "network";
  const c = copy[locale][kind];
  const relative = pathname.replace(/^\/(en|ru|es)(?=\/|$)/, "");
  const networkService = kind === "network" && /^\/services\/[a-z0-9-]+\/[a-z0-9-]+/.test(relative);
  const networkMaster = kind === "network" && /^\/masters\/[a-z0-9-]+/.test(relative);
  const primary = kind === "training" ? trainingEnquiryUrl(locale, pathname)
    : kind === "network" ? networkService ? "#request-service" : networkMaster ? "#practitioner-services" : "/" + locale + "/services"
    : "/" + locale + "/services/free-situation-review";
  const secondary = kind === "training" ? "/" + locale + "/academy"
    : kind === "reading" || kind === "network" ? "/" + locale + "/services"
    : "/" + locale + "/about";
  const primaryLabel = networkService ? copy[locale].network.service : c.primary;
  const external = kind === "training";
  const portraitSrc = kind === "network" ? "/images/holistic-house/hero-olive-incense.webp"
            : kind === "training" ? pathname.includes("temple") ? "/academy/reiki-yggdrasil/source/temple-studies.png"
              : pathname.includes("tantra-reiki") ? "/library/maya-mysteries/media/post-217-1.jpg"
              : "/academy/reiki-yggdrasil/source/basic-program.jpg"
            : kind === "reading" ? pathname.includes("homeopathy") ? "/images/holistic-house/distance-homeopathy.webp"
              : pathname.includes("wu-xing") ? "/academy/reiki-yggdrasil/source/temple-studies.png"
              : "/images/holistic-house/books-library.webp"
            : "/images/holistic-house/andy-about.png";
  if (kind === "personal" || kind === "reading") {
    return (
      <aside className={styles.consultationPanel} data-sitewide-capture={kind} lang={locale}>
        <ConsultationChoiceCapture locale={locale} variant={kind} sitewide />
      </aside>
    );
  }
  return (
    <aside className={styles.section} aria-labelledby="sitewide-capture-title" data-sitewide-capture={kind} lang={locale}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h2 id="sitewide-capture-title">{c.title}</h2>
          <p className={styles.description}>{c.description}</p>
          <div className={styles.actions}>
            <AcquisitionEventLink prefetch={false} className={styles.primary} event={external ? "contact_click" : "service_request_start"} href={primary} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {primaryLabel} {external ? <ArrowUpRight aria-hidden="true" size={19} /> : <ArrowRight aria-hidden="true" size={19}/>}
            </AcquisitionEventLink>
            {kind !== "network" ? <Link prefetch={false} className={styles.secondary} href={secondary}>{c.secondary} <ArrowRight aria-hidden="true" size={16}/></Link> : null}
          </div>
        </div>
        <div className={styles.portrait}>
          <Image src={portraitSrc} alt="" fill sizes="(max-width: 767px) 110px, 224px" />
        </div>
      </div>
    </aside>
  );
}
