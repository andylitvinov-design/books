"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Coins, Flame, Flower2, Sparkles, Sun, UsersRound } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-magical-help-mobile.module.css";

const kinds = ["health", "money", "energy", "talisman", "ritual"] as const;
const pictures = {
  health: "/images/holistic-house/mandala-gold-reference.webp",
  money: "/images/holistic-house/hero-olive-incense.webp",
  energy: "/images/holistic-house/reiki-practitioner-sunrise.webp",
  talisman: "/academy/reiki-yggdrasil/source/advanced-runes.png",
  ritual: "/academy/reiki-yggdrasil/source/temple-studies.png",
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
      talisman: { title: "Личный талисман", description: "Символический предмет по теме или намерению. Материалы и изготовление обсуждаются отдельно.", action: "Запросить талисман",
        request: "Хочу обсудить символический талисман. Уточните варианты, материалы, стоимость и сроки.", alt: "Символические рунические изображения" },
      ritual: { title: "Ритуал и церемония", description: "Личная символическая практика или церемония с мастером по согласованной теме.", action: "Запросить ритуал",
        request: "Хочу узнать о символической церемонии или ритуале. Уточните формат, правила участия, сроки и стоимость.", alt: "Изображение храмовой традиции" },
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
      talisman: { title: "Personal talisman", description: "A symbolic object linked to your intention. Materials and commissioning are agreed separately.", action: "Enquire about a talisman",
        request: "I would like to ask about a symbolic talisman. Please confirm options, materials, price and delivery.", alt: "Symbolic rune illustrations" },
      ritual: { title: "Ritual & ceremony", description: "A personal symbolic ceremony with a practitioner by agreement.", action: "Enquire about a ritual",
        request: "Please tell me about symbolic rituals, participation, format and cost before booking.", alt: "Illustration of a temple tradition" },
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
      talisman: { title: "Talismán personal", description: "Objeto simbólico para una intención. Materiales y encargo se acuerdan por separado.", action: "Solicitar talismán",
        request: "Quisiera consultar sobre un talismán simbólico. Confirmen opciones, materiales, precio y entrega.", alt: "Ilustraciones simbólicas de runas" },
      ritual: { title: "Ritual y ceremonia", description: "Práctica simbólica personal con un especialista, previo acuerdo.", action: "Consultar ritual",
        request: "Quisiera conocer los rituales simbólicos, las condiciones, modalidad y coste.", alt: "Imagen de una tradición de templo" },
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
          const Icon = kind === "health" ? Flower2 : kind === "money" ? Coins : kind === "energy" ? Sun : kind === "talisman" ? Sparkles : Flame;
          const detailsHref = kind === "energy" ? "/" + locale + "/services/remote-energy-support" : kind === "talisman" ? "/" + locale + "/holistic-support/mobile" : kind === "ritual" ? "/" + locale + "/services/spiritual-reading" : "/" + locale + "/holistic-support/mandala?mode=photo";
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
