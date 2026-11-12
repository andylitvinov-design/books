"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronRight, Compass, Layers3, Sparkles, Users } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-spiritual-reading.module.css";

export type TarotMasterPreview = { slug: string; name: string; summary: string; photo: string };

const copy = {
  ru: {
    eyebrow: "Ассист · Услуги", title: "Spiritual Reading",
    lead: "Оракулы · Дао · Таро · Духовные подсказки",
    back: "Все услуги Assist", entry: "Spiritual Reading",
    entryLead: "Даосские чтения, Таро и подбор мастера", entryAction: "Открыть",
    free: "Бесплатно", freeTitle: "Taoist AI Reading",
    freeDescription: "Бесплатная даосская подсказка по вашему вопросу",
    freeAction: "Получить чтение",
    taoTitle: "Taoist Reading с мастером",
    taoDescription: "Персональное чтение и рекомендации",
    taoAction: "Заказать чтение",
    tarotTitle: "Tarot Reading",
    tarotDescription: "Символический расклад на вопрос или ситуацию",
    tarotAction: "Заказать расклад",
    finderTitle: "Подобрать мастера по Таро",
    finderDescription: "Выберите специалиста по направлению и подходу",
    finderAction: "Выбрать мастера",
    mastersTitle: "Мастера по Таро",
    mastersLead: "Только специалисты с опубликованными услугами Таро.",
    masterDetails: "О мастере", noMasters: "Пока нет опубликованных предложений Таро. Можно посмотреть весь каталог мастеров.",
    unavailable: "Список мастеров временно недоступен. Попробуйте общий каталог.",
    directory: "Все мастера",
    caveat: "Бесплатное И-Цзин-чтение сейчас работает на авторских текстах и символическом алгоритме в браузере — генеративный AI пока не подключён. Чтения предназначены для размышления, а не достоверного предсказания будущего.",
    enquiry: "Хочу узнать условия и доступность личного духовного чтения. Подтвердите формат и стоимость до оплаты.",
  },
  en: {
    eyebrow: "Assist · Services", title: "Spiritual Reading",
    lead: "Oracles · Dao · Tarot · Spiritual reflection",
    back: "All Assist services", entry: "Spiritual Reading",
    entryLead: "Taoist insights, Tarot and practitioners", entryAction: "Explore",
    free: "Free", freeTitle: "Taoist AI Reading",
    freeDescription: "A free Taoist reflection on your question",
    freeAction: "Get a reading",
    taoTitle: "Taoist Reading with a master",
    taoDescription: "A personal symbolic reading and guidance",
    taoAction: "Request a reading",
    tarotTitle: "Tarot Reading",
    tarotDescription: "A symbolic spread for your question or situation",
    tarotAction: "Request a spread",
    finderTitle: "Find a Tarot practitioner",
    finderDescription: "Choose someone by their approach and experience",
    finderAction: "Find a master",
    mastersTitle: "Tarot practitioners",
    mastersLead: "Only practitioners with published Tarot services.",
    masterDetails: "About practitioner", noMasters: "No published Tarot offers are available yet. Browse all practitioners instead.",
    unavailable: "The practitioner directory is temporarily unavailable. Try the full directory.",
    directory: "All practitioners",
    caveat: "The free I Ching reflection currently uses authored material and a browser-based symbolic algorithm; generative AI is not connected yet. Readings invite reflection and cannot reliably predict the future.",
    enquiry: "I would like to ask about a personal symbolic reading. Please confirm availability, format and price before any payment.",
  },
  es: {
    eyebrow: "Assist · Servicios", title: "Spiritual Reading",
    lead: "Oráculos · Dao · Tarot · Reflexión espiritual",
    back: "Todos los servicios", entry: "Spiritual Reading",
    entryLead: "Lecturas taoístas, Tarot y profesionales", entryAction: "Explorar",
    free: "Gratis", freeTitle: "Taoist AI Reading",
    freeDescription: "Una reflexión taoísta gratuita sobre tu pregunta",
    freeAction: "Obtener lectura",
    taoTitle: "Taoist Reading con un maestro",
    taoDescription: "Una lectura simbólica personal y orientación",
    taoAction: "Solicitar lectura",
    tarotTitle: "Tarot Reading",
    tarotDescription: "Una tirada simbólica para tu pregunta o situación",
    tarotAction: "Solicitar tirada",
    finderTitle: "Elegir especialista en Tarot",
    finderDescription: "Encuentra un profesional según su enfoque",
    finderAction: "Buscar especialista",
    mastersTitle: "Especialistas en Tarot",
    mastersLead: "Solo profesionales con servicios de Tarot publicados.",
    masterDetails: "Ver profesional", noMasters: "Todavía no hay ofertas de Tarot publicadas. Puedes explorar el directorio general.",
    unavailable: "El directorio no está disponible temporalmente. Prueba el directorio general.",
    directory: "Todos los profesionales",
    caveat: "La reflexión gratuita del I Ching usa textos de autor y un algoritmo simbólico en el navegador; todavía no está conectada a IA generativa. Estas lecturas no predicen el futuro de forma fiable.",
    enquiry: "Quisiera consultar condiciones de una lectura simbólica personal. Confirmen disponibilidad, formato y precio antes de pagar.",
  },
} as const;

export function SpiritualReadingEntry({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return <Link href={"/" + locale + "/services/spiritual-reading"} prefetch={false}
    data-assist-spiritual-entry className={styles.entry}>
    <span className={styles.entryMark} aria-hidden="true"><Sparkles size={24}/></span>
    <span className={styles.entryWords}><strong>{t.entry}</strong><small>{t.entryLead}</small></span>
    <span className={styles.entryAction}>{t.entryAction}<ArrowRight size={17} aria-hidden="true"/></span>
  </Link>;
}

function SpiritualAction({ locale, label, service }: { locale: PublicLocale; label: string; service: string }) {
  const t = copy[locale];
  const pagePath = "/" + locale + "/services/spiritual-reading";
  return <div className={styles.request}>
    <ContactChannelChooser locale={locale} label={label} className={styles.action}
      event="service_request_start" whatsappUrl={whatsappEnquiryUrl({
        locale, service, request: t.enquiry, pagePath,
      })} attributes={{ "data-spiritual-enquiry": service }} />
  </div>;
}

export function SpiritualReadingPageContent({
  locale, masters, mastersUnavailable,
}: { locale: PublicLocale; masters: TarotMasterPreview[]; mastersUnavailable: boolean }) {
  const t = copy[locale];
  const root = "/" + locale;
  return <main className={styles.page} data-spiritual-reading lang={locale}>
    <div className={styles.shell}>
      <Link href={root + "/services"} prefetch={false} className={styles.back}>
        <ArrowLeft size={17} aria-hidden="true"/>{t.back}
      </Link>
      <header className={styles.hero}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}><Sparkles size={23} aria-hidden="true"/>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className={styles.lead}>{t.lead}</p>
        </div>
        <Image className={styles.flower} src="/images/holistic-house/homepage-botanical.svg" width={170} height={170} alt="" unoptimized priority />
      </header>
      <div className={styles.cards}>
        <article className={styles.card} data-spiritual-service="tao-ai">
          <div className={styles.photo}><Image src="/images/holistic-house/tantra-reiki-yin-yang-cover.svg" alt="" fill sizes="(max-width: 450px) 34vw, 210px" unoptimized /></div>
          <div className={styles.info}>
            <span className={styles.free}>{t.free}</span>
            <h2>{t.freeTitle}</h2>
            <p className={styles.description}><Sparkles aria-hidden="true"/>{t.freeDescription}</p>
            <Link className={styles.action} data-spiritual-free-reading
              href={root + "/holistic-support#dao-guidance"} prefetch={false}>
              {t.freeAction}<ArrowRight size={19} aria-hidden="true"/>
            </Link>
          </div>
        </article>
        <article className={styles.card} data-spiritual-service="tao-master">
          <div className={styles.photo}><Image src="/images/holistic-house/andy-about.png" alt="" fill sizes="(max-width: 450px) 34vw, 210px" unoptimized /></div>
          <div className={styles.info}>
            <h2>{t.taoTitle}</h2>
            <p className={styles.description}><Compass aria-hidden="true"/>{t.taoDescription}</p>
            <SpiritualAction locale={locale} label={t.taoAction} service="Taoist Reading" />
          </div>
        </article>
        <article className={styles.card} data-spiritual-service="tarot">
          <div className={styles.photo}><Image src="/images/holistic-house/mandala-gold-reference.webp" alt="" fill sizes="(max-width: 450px) 34vw, 210px" unoptimized /></div>
          <div className={styles.info}>
            <h2>{t.tarotTitle}</h2>
            <p className={styles.description}><Layers3 aria-hidden="true"/>{t.tarotDescription}</p>
            <SpiritualAction locale={locale} label={t.tarotAction} service="Tarot Reading" />
          </div>
        </article>
        <article className={styles.card} data-spiritual-service="tarot-masters">
          <div className={styles.photo}>
            <Image src="/images/holistic-house/ideas-zen-landscape.svg" alt="" fill sizes="(max-width: 450px) 34vw, 210px" unoptimized />
            {masters.length ? <div className={styles.photoFaces}>
              {masters.map(master => <span key={master.slug} className={styles.face}>
                {master.photo ? <Image src={master.photo} alt="" fill sizes="55px" unoptimized /> : <Users size={23} aria-hidden="true"/>}
              </span>)}
            </div> : null}
          </div>
          <div className={styles.info}>
            <h2>{t.finderTitle}</h2>
            <p className={styles.description}><Users aria-hidden="true"/>{t.finderDescription}</p>
            <Link className={styles.action} href="#tarot-masters" data-spiritual-master-finder>
              {t.finderAction}<ArrowRight size={19} aria-hidden="true"/>
            </Link>
          </div>
        </article>
      </div>
      <p className={styles.caveat}>{t.caveat}</p>
      <section className={styles.mastersSection} id="tarot-masters" aria-labelledby="spiritual-tarot-masters-title">
        <h2 id="spiritual-tarot-masters-title">{t.mastersTitle}</h2>
        <p>{t.mastersLead}</p>
        {masters.length ? <div className={styles.masterList}>
          {masters.map(master => <Link key={master.slug} className={styles.masterRow} href={root + "/masters/" + encodeURIComponent(master.slug)} prefetch={false}>
            <span className={styles.masterAvatar}>
              {master.photo ? <Image src={master.photo} alt="" fill sizes="58px" unoptimized/> : <Users size={24} aria-hidden="true"/>}
            </span>
            <span><strong>{master.name}</strong><small>{master.summary}</small></span>
            <ChevronRight size={21} aria-hidden="true"/>
          </Link>)}
        </div> : <p className={styles.empty}>{mastersUnavailable ? t.unavailable : t.noMasters}</p>}
        <Link href={root + "/masters"} prefetch={false} className={styles.directoryLink}>
          {t.directory}<ArrowRight size={18} aria-hidden="true"/>
        </Link>
      </section>
    </div>
  </main>;
}
