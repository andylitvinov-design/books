"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Info, Sparkles } from "lucide-react";
import { ContactChannelChooser } from "@/components/contact-channel-chooser";
import { telegramEnquiryUrlFromWhatsApp, whatsappEnquiryUrl } from "@/lib/whatsapp-enquiry";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-courses-shelf.module.css";

type Direction = "all" | "temple" | "reiki";
type Format = "all" | "free" | "teacher";
const courses = [
  { id: "dionysus", direction: "temple", teacher: false, freeIntro: false,
    path: "academy/archive/dionysian-tantra-club", image: "/images/holistic-house/hero-olive-incense.webp" },
  { id: "tantra", direction: "reiki", teacher: true, freeIntro: true,
    path: "academy/reiki/free-practitioner-course", image: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg" },
  { id: "yggdrasil", direction: "reiki", teacher: true, freeIntro: false,
    path: "academy/reiki/yggdrasil/basic-course", image: "/academy/reiki-yggdrasil/source/basic-program.jpg" },
] as const;
const content = {
  ru: {
    eyebrow: "HOLISTIC HOUSE · ОБУЧЕНИЕ", title: "Обучающие курсы",
    lead: "Знания, практики и инициации для целостного развития",
    direction: "Направление обучения", format: "Вариант обучения", recommended: "Рекомендуемые курсы",
    directions: { all: "Все курсы", temple: "Храмовые традиции", reiki: "Рейки и энергия" },
    formats: { all: "Все", free: "Бесплатно", teacher: "С мастером" },
    details: "Подробнее", order: "Заказать курс", all: "Посмотреть все курсы",
    empty: "По этому фильтру пока нет курсов.", reset: "Сбросить фильтры",
    enquire: "Хочу уточнить актуальный набор, стоимость и формат курса. Заявка не является оплатой.",
    note: "Заявка не означает оплату или подтверждённое место. Доступность согласовывается лично; программа Диониса — архивные материалы.",
    items: {
      dionysus: { title: "Путь Диониса", label: "Греческие мистерии", description: "Телесность, радость жизни и древнегреческие символические традиции", status: "Архивная программа" },
      tantra: { title: "Тантра Рейки", label: "Энергопрактики", description: "Бесплатное знакомство с практикой и возможность запросить инициацию", status: "Бесплатный старт" },
      yggdrasil: { title: "Рейки Иггдрасиль", label: "Северная традиция", description: "Древо Жизни, символические практики и ступени обучения", status: "Обучающая программа" },
    },
  },
  en: {
    eyebrow: "HOLISTIC HOUSE · LEARNING", title: "Learning courses",
    lead: "Knowledge, practices and initiations for personal growth",
    direction: "Learning direction", format: "Learning option", recommended: "Recommended courses",
    directions: { all: "All courses", temple: "Temple traditions", reiki: "Reiki & energy" },
    formats: { all: "All", free: "Free", teacher: "With a teacher" },
    details: "Details", order: "Enquire about course", all: "Explore all courses",
    empty: "No courses match these filters yet.", reset: "Reset filters",
    enquire: "Please confirm current enrolment, pricing and format before any payment.",
    note: "An enquiry does not confirm a place or payment. Availability is confirmed separately; Dionysus is an archived programme.",
    items: {
      dionysus: { title: "Path of Dionysus", label: "Greek mysteries", description: "Embodiment, joy of life and Greek symbolic traditions", status: "Programme archive" },
      tantra: { title: "Tantra Reiki", label: "Energy practices", description: "Free introductory learning with an optional initiation request", status: "Free introduction" },
      yggdrasil: { title: "Reiki Yggdrasil", label: "Nordic tradition", description: "The Tree of Life, symbolic practices and learning stages", status: "Learning programme" },
    },
  },
  es: {
    eyebrow: "HOLISTIC HOUSE · FORMACIÓN", title: "Cursos de formación",
    lead: "Conocimientos, prácticas e iniciaciones para crecer",
    direction: "Área de formación", format: "Opción de formación", recommended: "Cursos recomendados",
    directions: { all: "Todos los cursos", temple: "Tradiciones de templo", reiki: "Reiki y energía" },
    formats: { all: "Todos", free: "Gratis", teacher: "Con un maestro" },
    details: "Detalles", order: "Solicitar curso", all: "Ver todos los cursos",
    empty: "Aún no hay cursos para estos filtros.", reset: "Restablecer filtros",
    enquire: "Quisiera confirmar la inscripción, el precio y la modalidad antes de pagar.",
    note: "La solicitud no supone pago ni plaza confirmada. Se confirma la disponibilidad; Dioniso es material de archivo.",
    items: {
      dionysus: { title: "Camino de Dioniso", label: "Misterios griegos", description: "El cuerpo, la alegría de vivir y las tradiciones simbólicas griegas", status: "Archivo del programa" },
      tantra: { title: "Tantra Reiki", label: "Prácticas energéticas", description: "Formación introductoria gratuita y solicitud opcional de iniciación", status: "Inicio gratis" },
      yggdrasil: { title: "Reiki Yggdrasil", label: "Tradición nórdica", description: "Árbol de la Vida, prácticas simbólicas y etapas de estudio", status: "Programa formativo" },
    },
  },
} as const;

export function ServicesCoursesShelf({ locale }: { locale: PublicLocale }) {
  const t = content[locale];
  const [direction, setDirection] = useState<Direction>("all");
  const [format, setFormat] = useState<Format>("all");
  const filtered = courses.filter((course) => (direction === "all" || course.direction === direction)
    && (format === "all" || (format === "free" && course.freeIntro) || (format === "teacher" && course.teacher)));
  return <section className={styles.shelf} lang={locale} data-assist-course-shelf aria-labelledby="assist-courses-title">
    <header className={styles.hero}>
      <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true"/>{t.eyebrow}</p>
      <h2 id="assist-courses-title">{t.title}</h2><p>{t.lead}</p>
    </header>
    <div className={styles.filters}>
      <label className={styles.directionLabel} htmlFor="assist-course-direction"><GraduationCap size={22} aria-hidden="true"/>{t.direction}</label>
      <select id="assist-course-direction" value={direction} onChange={event=>setDirection(event.target.value as Direction)}>
        {(["all","temple","reiki"] as const).map(key=><option value={key} key={key}>{t.directions[key]}</option>)}
      </select>
      <p className={styles.formatLabel}><BookOpen size={22} aria-hidden="true"/>{t.format}</p>
      <div className={styles.pills} role="group" aria-label={t.format}>
        {(["all","free","teacher"] as const).map(key=><button key={key} type="button" aria-pressed={format===key}
          onClick={()=>setFormat(key)}>{t.formats[key]}</button>)}
      </div>
    </div>
    <div className={styles.topics} role="group" aria-label={t.direction}>
      {(["all","temple","reiki"] as const).map(key=><button key={key} type="button" aria-pressed={direction===key}
        onClick={()=>setDirection(key)}><span aria-hidden="true">{key==="temple"?"✧":key==="reiki"?"❧":"✦"}</span>{t.directions[key]}</button>)}
    </div>
    <h3 className={styles.sectionTitle}>{t.recommended}</h3>
    <div className={styles.cards}>
      {filtered.map(course=>{
        const item=t.items[course.id];
        const href="/"+locale+"/"+course.path;
        const enquiryUrl = whatsappEnquiryUrl({locale,service:item.title,request:t.enquire,pagePath:href});
        return <article key={course.id} className={styles.card} data-assist-learning-course={course.id}>
          <Link className={styles.art} href={href} prefetch={false} aria-label={item.title}>
            <Image src={course.image} alt="" width={230} height={230} unoptimized loading="lazy"/>
          </Link>
          <div className={styles.body}>
            <span className={styles.tag}>{item.label}</span>
            <h4><Link href={href} prefetch={false}>{item.title}</Link></h4>
            <p>{item.description}</p><small>{item.status}</small>
          </div>
          <div className={styles.actions}>
            <Link className={styles.details} href={href} prefetch={false} data-assist-course-detail={course.id}>
              <Info size={18} aria-hidden="true"/>{t.details}
            </Link>
            <div className={styles.orderWrap} data-assist-course-order={course.id}>
              <ContactChannelChooser locale={locale} label={t.order} className={styles.order} compactTrigger compactMessenger
                publicServiceTitle={item.title} publicTopic={item.title} event="service_request_start"
                whatsappUrl={enquiryUrl} telegramEnquiryUrl={telegramEnquiryUrlFromWhatsApp(enquiryUrl)}
                attributes={{"data-assist-course-order":course.id}}/>
            </div>
          </div>
        </article>;
      })}
      {filtered.length===0?<div className={styles.empty} role="status"><p>{t.empty}</p><button type="button"
        onClick={()=>{setDirection("all");setFormat("all");}}>{t.reset}</button></div>:null}
    </div>
    <Link className={styles.all} href={"/"+locale+"/academy"} data-assist-course-all prefetch={false}>
      <BookOpen size={23} aria-hidden="true"/>{t.all}<ArrowRight size={20} aria-hidden="true"/>
    </Link>
    <p className={styles.note}><Info size={16} aria-hidden="true"/>{t.note}</p>
  </section>;
}
