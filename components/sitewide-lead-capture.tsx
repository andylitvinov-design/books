"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import { classifyPublicLead, trainingEnquiryUrl } from "@/lib/public-lead-capture";
import { coreOfferDetailData, type DetailKind } from "@/components/core-service-detail";
import { ConsultationChoiceCapture } from "@/components/consultation-choice-capture";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
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
      description: "Start with a free coaching form and hand drawing of ME, GOAL and PROBLEM. Receive a personal written report without booking a paid call.",
      primary: "Start free drawing assessment",
      secondary: "Explore personal work",
    },
    personal: {
      eyebrow: "Your personal first step",
      title: "You don't have to choose a method alone.",
      description: "Complete a free coaching form and paper drawing; receive my written assessment. Live sessions are optional and cost €50 / 30 min or €100 / 60 min.",
      primary: "Free drawing assessment",
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
      title: "Хотите получить письменный разбор своей ситуации?",
      description: "Заполните коучинг-форму и нарисуйте ручкой «Я — цель — проблема». Я пришлю письменный отчёт. Покупать личную сессию необязательно.",
      primary: "Диагностика по рисунку бесплатно",
      secondary: "Мои услуги",
    },
    personal: {
      eyebrow: "Первый шаг к ясности",
      title: "Вам не нужно самостоятельно выбирать метод.",
      description: "Заполните бесплатную коучинг-форму и пришлите рисунок от руки. Я подготовлю письменный отчёт. Личные сессии стоят €50 / 30 мин или €100 / 60 мин.",
      primary: "Бесплатная диагностика по рисунку",
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
      description: "Empieza con el formulario de coaching y dibujo a mano y recibe un informe escrito gratuito. Las sesiones personales son de pago aparte.",
      primary: "Evaluación gratuita por dibujo",
      secondary: "Explorar servicios",
    },
    personal: {
      eyebrow: "Tu primer paso personal",
      title: "No tienes que elegir el método a solas.",
      description: "Completa el formulario de coaching y dibuja YO / META / PROBLEMA en papel. Recibirás un informe escrito. Sesiones aparte: €50 / 30 min o €100 / 60 min.",
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
  const coreMatch = relative.match(/^\/services\/(dao-health-profile|alchemy-of-soul|hypnotherapy-course)\/?$/);
  const coreSlugToKind: Record<string, DetailKind> = { "dao-health-profile": "dao", "alchemy-of-soul": "alchemy", "hypnotherapy-course": "hypnotherapy" };
  const coreKind = coreMatch ? coreSlugToKind[coreMatch[1]] || null : null;
  // Dedicated Alchemy landing has exactly one enquiry form: do not append another global CTA.
  if (coreKind === "alchemy") return null;
  const coreDetail = coreKind ? coreOfferDetailData(locale, coreKind) : null;
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
  if (coreDetail && coreKind) {
    const alternative = locale === "ru"
      ? { summary: "Предпочитаете сначала бесплатный письменный разбор ситуации?", action: "Открыть бесплатный разбор" }
      : { summary: "Prefer to start with a free written situation review?", action: "Open the free written review" };
    const coreWhatsappUrl = whatsappEnquiryUrl({
      locale,
      service: coreDetail.title,
      request: coreDetail.actionMessage,
      option: coreDetail.action,
      pagePath: pathname,
    });
    return (
      <aside className={styles.section} aria-labelledby="sitewide-capture-title" data-sitewide-capture="core-service" data-core-service-capture={coreKind} lang={locale}>
        <div className={styles.inner}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>{locale === "ru" ? "ЛИЧНАЯ РАБОТА · С АНДРЕЕМ" : "PERSONAL WORK · WITH ANDREY"}</p>
            <h2 id="sitewide-capture-title">{coreDetail.action}</h2>
            <p className={styles.description}>{coreDetail.note}</p>
            <div className={styles.actions}>
              <ContactChannelChooser
                locale={locale}
                whatsappUrl={coreWhatsappUrl}
                className={styles.primary}
                event="service_request_start"
                attributes={{ "data-service-request": coreKind }}
              />
            </div>
            <details className={styles.alternative}>
              <summary>{alternative.summary}</summary>
              <Link prefetch={false} href={"/" + locale + "/services/free-situation-review"}>{alternative.action} <ArrowRight aria-hidden="true" size={16}/></Link>
            </details>
          </div>
          <div className={styles.portrait}><Image src={coreDetail.image} alt="" fill sizes="(max-width: 767px) 110px, 224px" /></div>
        </div>
      </aside>
    );
  }
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
            {external ? (
              <ContactChannelChooser
                locale={locale}
                whatsappUrl={primary}
                className={styles.primary}
                event="contact_click"
              />
            ) : (
              <AcquisitionEventLink prefetch={false} className={styles.primary} event="service_request_start" href={primary}>
                {primaryLabel} <ArrowRight aria-hidden="true" size={19}/>
              </AcquisitionEventLink>
            )}
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
