"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Coins, Flower2, Sparkles, Sun, UsersRound } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-magical-help-mobile.module.css";

const kinds = ["health", "money", "energy"] as const;
const pictures = {
  health: "/images/holistic-house/mandala-gold-reference.webp",
  money: "/images/holistic-house/hero-olive-incense.webp",
  energy: "/images/holistic-house/reiki-practitioner-sunrise.webp",
} as const;

const copy = {
  ru: {
    eyebrow: "АССИСТ · УСЛУГИ",
    title: "Magical Help",
    lead: "Ритуалы · Мандалы · Талисманы · Энергопомощь",
    details: "О практике",
    more: "Посмотреть больше мастеров",
    moreLead: "Подберите специалиста по ритуалам, мандалам, талисманам и энергетической поддержке",
    note: "Это символические практики, а не лечение или финансовые рекомендации. Возможность выполнения, сроки и стоимость мастер уточнит до заказа.",
    cards: {
      health: {
        title: "Мандала · Здоровье",
        description: "Персональная символическая мандала для заботы о себе, спокойствия и внутренней гармонии.",
        action: "Заказать мандалу",
        request: "Хочу обсудить персональную мандалу на тему самочувствия. Подскажите условия, сроки и стоимость.",
        alt: "Золотая мандала для личной символической практики",
      },
      money: {
        title: "Мандала · Деньги",
        description: "Мандала для размышления о финансовых целях, устойчивости и намерении.",
        action: "Заказать мандалу",
        request: "Хочу обсудить персональную мандалу на тему денег и целей. Подскажите условия, сроки и стоимость.",
        alt: "Тёплый ритуальный натюрморт для мандалы на тему изобилия",
      },
      energy: {
        title: "Энергетическая подкачка",
        description: "Дистанционная энергетическая практика для отдыха, внимания к себе и ощущения ресурса.",
        action: "Заказать поддержку",
        request: "",
        alt: "Солнечный образ практики Рейки",
      },
    },
  },
  en: {
    eyebrow: "ASSIST · SERVICES",
    title: "Magical Help",
    lead: "Rituals · Mandalas · Talismans · Energy support",
    details: "Learn more",
    more: "See more practitioners",
    moreLead: "Explore practitioners offering rituals, mandalas, talismans and energy practices",
    note: "These are symbolic practices, not medical treatment or financial advice. The practitioner confirms availability, timing and cost before an order.",
    cards: {
      health: {
        title: "Mandala · Wellbeing",
        description: "A personal symbolic mandala for reflection, calm and gentle self-care.",
        action: "Request a mandala",
        request: "I would like to enquire about a personal wellbeing-themed mandala. Please confirm terms, delivery and cost.",
        alt: "Golden mandala for personal symbolic reflection",
      },
      money: {
        title: "Mandala · Money",
        description: "A mandala to reflect on financial goals, balance and personal intention.",
        action: "Request a mandala",
        request: "I would like to enquire about a personal money-themed mandala. Please confirm terms, delivery and cost.",
        alt: "Warm ritual still life for a prosperity-themed mandala",
      },
      energy: {
        title: "Energy recharge",
        description: "An optional remote energy practice for calm, rest and self-reflection.",
        action: "Request support",
        request: "",
        alt: "Sunlit imagery for a Reiki practice",
      },
    },
  },
  es: {
    eyebrow: "ASSIST · SERVICIOS",
    title: "Ayuda ritual",
    lead: "Rituales · Mandalas · Talismanes · Apoyo energético",
    details: "Más información",
    more: "Ver más profesionales",
    moreLead: "Explora especialistas en rituales, mandalas, talismanes y prácticas energéticas",
    note: "Son prácticas simbólicas, no tratamientos médicos ni asesoramiento financiero. El profesional confirma disponibilidad, plazo y precio antes del pedido.",
    cards: {
      health: {
        title: "Mandala · Bienestar",
        description: "Una mandala simbólica personal para la calma y el autocuidado.",
        action: "Solicitar mandala",
        request: "Quiero consultar una mandala personal para el bienestar. Confirmen condiciones, plazo y precio.",
        alt: "Mandala dorada para la reflexión simbólica",
      },
      money: {
        title: "Mandala · Dinero",
        description: "Una mandala para reflexionar sobre metas económicas e intenciones.",
        action: "Solicitar mandala",
        request: "Quiero consultar una mandala personal sobre metas económicas. Confirmen condiciones, plazo y precio.",
        alt: "Escena ritual cálida para una mandala de prosperidad",
      },
      energy: {
        title: "Recarga energética",
        description: "Práctica energética opcional a distancia para la calma y el descanso.",
        action: "Solicitar apoyo",
        request: "",
        alt: "Imagen luminosa para una práctica de Reiki",
      },
    },
  },
} as const;

export function ServicesMagicalHelpMobile({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <section id="assist-magical-help" className={styles.section} data-assist-magical-help lang={locale} aria-labelledby="assist-magical-help-title">
      <header className={styles.header}>
        <p className={styles.eyebrow}><Sparkles size={17} aria-hidden="true" />{t.eyebrow}</p>
        <h2 id="assist-magical-help-title">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
      </header>
      <div className={styles.cards}>
        {kinds.map(kind => {
          const item = t.cards[kind];
          const Icon = kind === "health" ? Flower2 : kind === "money" ? Coins : Sun;
          const detailsHref = kind === "energy" ? "/" + locale + "/services/remote-energy-support" : "/" + locale + "/holistic-support/mandala?mode=photo";
          return (
            <article key={kind} className={styles.card} data-assist-magical-card={kind}>
              <div className={styles.picture}>
                <Image src={pictures[kind]} alt={item.alt} fill sizes="(max-width: 350px) 95px, (max-width: 760px) 160px, 1px" className={styles.photo} />
                {kind === "money" ? <Coins className={styles.pictureSymbol} size={30} aria-hidden="true" /> : null}
              </div>
              <div className={styles.cardText}>
                <h3><Icon aria-hidden="true" size={25} />{item.title}</h3>
                <p>{item.description}</p>
                <Link className={styles.details} href={detailsHref} prefetch={false}>{t.details}<ChevronRight size={16} aria-hidden="true" /></Link>
              </div>
              <div className={styles.booking}>
                {kind === "energy" ? (
                  <Link className={styles.cta} data-assist-magical-order="energy" href={"/" + locale + "/services/remote-energy-support"} prefetch={false}>
                    {item.action}<ArrowRight size={19} aria-hidden="true" />
                  </Link>
                ) : (
                  <ContactChannelChooser
                    locale={locale}
                    label={item.action}
                    className={styles.cta}
                    compactMessenger
                    event="service_request_start"
                    publicServiceTitle={item.title}
                    whatsappUrl={whatsappEnquiryUrl({
                      locale, service: item.title, request: item.request, pagePath: "/" + locale + "/services",
                    })}
                    attributes={{ "data-assist-magical-order": kind }}
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
      <Link className={styles.more} href={"/" + locale + "/masters"} prefetch={false} data-assist-magical-more>
        <span className={styles.masterIcon} aria-hidden="true"><UsersRound size={40} /></span>
        <span className={styles.moreText}><strong>{t.more}</strong><small>{t.moreLead}</small></span>
        <ChevronRight size={25} className={styles.moreArrow} aria-hidden="true" />
      </Link>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
