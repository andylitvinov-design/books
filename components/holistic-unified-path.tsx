"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight, BookOpen, CalendarDays, ChevronRight, GraduationCap,
  HeartHandshake, MessageCircle, Search, SlidersHorizontal, Sparkles,
} from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import styles from "./holistic-unified-path.module.css";

type Kind = "all" | "sessions" | "courses" | "programs" | "events";
type Topic = "all" | "energy" | "money" | "relationships" | "goals";
type Format = "any" | "online" | "inperson";
type Price = "all" | "free" | "paid";
type Translated = Record<PublicLocale, string>;
type Offer = {
  id: string; kind: Exclude<Kind, "all">; topics: Exclude<Topic, "all">[];
  format: "online" | "inperson" | "both"; priceKind: "free" | "paid" | "request";
  path: string; image: string;
  title: Translated; about: Translated; price: Translated;
};

const copy = {
  en: {
    journey: "Your personal path",
    journeyLead: "Understand yourself, restore balance and find your next step.",
    steps: ["Explore & understand", "Practice & restore", "Personal support", "Learn & master"],
    start: "Start your journey", heading: "Find what you need",
    subtitle: "Services, courses and programs in one place",
    academy: "All Academy courses", directory: "All practitioner services",
    kind: { all: "All", sessions: "Sessions", courses: "Courses", programs: "Programs", events: "Events" },
    topic: "Focus", format: "Format", price: "Price",
    topics: { all: "Any focus", energy: "Body & energy", money: "Work & money", relationships: "Relationships", goals: "Meaning & growth" },
    formats: { any: "Any format", online: "Online", inperson: "In person" },
    prices: { all: "All offers", free: "Free", paid: "Paid" },
    labels: { sessions: "Service", courses: "Course", programs: "Program", events: "Event" },
    details: "Details", count: "offers",
    empty: "No offers match these filters. Try another category, focus or format.",
    reset: "Clear filters",
    disclaimer: "Self-ratings and filters are kept on this screen, not sent to a practitioner. These options are for self-reflection, not diagnosis. Session times and conditions are confirmed before booking.",
  },
  ru: {
    journey: "Ваш персональный путь",
    journeyLead: "Поймите себя, восстановите опору и выберите следующий шаг.",
    steps: ["Понять себя", "Практика и опора", "Личная поддержка", "Обучение мастера"],
    start: "Начать свой путь", heading: "Найдите то, что вам нужно",
    subtitle: "Услуги, курсы и программы в одном месте",
    academy: "Все курсы Академии", directory: "Все услуги мастеров",
    kind: { all: "Все", sessions: "Сессии", courses: "Курсы", programs: "Программы", events: "События" },
    topic: "Цель", format: "Формат", price: "Цена",
    topics: { all: "Любая тема", energy: "Тело и энергия", money: "Работа и деньги", relationships: "Отношения", goals: "Смысл и рост" },
    formats: { any: "Любой", online: "Онлайн", inperson: "Лично" },
    prices: { all: "Все предложения", free: "Бесплатно", paid: "Платно" },
    labels: { sessions: "Услуга", courses: "Курс", programs: "Программа", events: "Событие" },
    details: "Подробнее", count: "предложений",
    empty: "Нет подходящих предложений. Измените категорию, цель или формат.",
    reset: "Сбросить фильтры",
    disclaimer: "Оценки и фильтры остаются на этом экране и не отправляются мастеру. Это самостоятельный подбор, не диагностика. Время и условия сессии подтверждаются перед записью.",
  },
  es: {
    journey: "Tu camino personal",
    journeyLead: "Conócete, recupera equilibrio y elige tu siguiente paso.",
    steps: ["Explorar y comprender", "Practicar y recuperar", "Apoyo personal", "Aprender y guiar"],
    start: "Comienza tu camino", heading: "Encuentra lo que necesitas",
    subtitle: "Servicios, cursos y programas en un solo lugar",
    academy: "Todos los cursos", directory: "Todos los servicios",
    kind: { all: "Todos", sessions: "Sesiones", courses: "Cursos", programs: "Programas", events: "Eventos" },
    topic: "Objetivo", format: "Modalidad", price: "Precio",
    topics: { all: "Cualquier tema", energy: "Cuerpo y energía", money: "Trabajo y dinero", relationships: "Relaciones", goals: "Sentido y crecimiento" },
    formats: { any: "Cualquiera", online: "En línea", inperson: "Presencial" },
    prices: { all: "Todas las ofertas", free: "Gratis", paid: "De pago" },
    labels: { sessions: "Servicio", courses: "Curso", programs: "Programa", events: "Evento" },
    details: "Detalles", count: "opciones",
    empty: "No hay opciones con estos filtros. Prueba otra categoría, objetivo o modalidad.",
    reset: "Borrar filtros",
    disclaimer: "Las valoraciones y los filtros permanecen en esta pantalla. Son para reflexión personal, no diagnóstico. Horarios y condiciones se confirman antes de reservar.",
  },
} as const;

const offers: Offer[] = [
  {
    id: "psychohomeopathy", kind: "sessions", topics: ["energy", "goals"],
    format: "both", priceKind: "paid", path: "services/psychohomeopathy",
    image: "/images/holistic-house/andy-about.png",
    title: { en: "Psycho-homeopathy consultation", ru: "Психогомеопатическая консультация", es: "Consulta de psicohomeopatía" },
    about: {
      en: "A complementary one-to-one discussion of your experience, not a proven medical treatment.",
      ru: "Личный разбор текущих переживаний. Дополнительный подход, не доказанное лечение заболеваний.",
      es: "Conversación complementaria individual; no es un tratamiento médico probado.",
    },
    price: { en: "€100 / 60 min", ru: "€100 / 60 мин", es: "100 € / 60 min" },
  },
  {
    id: "opora", kind: "courses", topics: ["energy", "goals"],
    format: "online", priceKind: "free", path: "courses/antistress",
    image: "/images/holistic-house/course-start-heron.webp",
    title: { en: "OPORA · 14-Day Anti-Stress", ru: "ОПОРА · 14 дней антистресса", es: "OPORA · 14 días antiestrés" },
    about: {
      en: "Short daily practices to explore calm, attention and inner stability.",
      ru: "Короткие ежедневные практики для спокойствия, внимания и внутренней опоры.",
      es: "Prácticas breves diarias de calma, atención y estabilidad interior.",
    },
    price: { en: "Free course", ru: "Бесплатный курс", es: "Curso gratuito" },
  },
  {
    id: "reiki-practitioner", kind: "programs", topics: ["energy", "goals"],
    format: "online", priceKind: "free", path: "academy/principles-of-energywork/learn",
    image: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    title: { en: "Reiki Practitioner Program", ru: "Программа «Практик Рейки»", es: "Programa de Practicante de Reiki" },
    about: {
      en: "Five lessons: Sun Flight, Tantra, Kundalini, Yggdrasil and an initiation request.",
      ru: "Пять уроков: Полёт к Солнцу, Тантра, Кундалини, Иггдрасиль и запрос инициации.",
      es: "Cinco lecciones: vuelo al Sol, Tantra, Kundalini, Yggdrasil y solicitud de iniciación.",
    },
    price: { en: "Free program", ru: "Бесплатная программа", es: "Programa gratuito" },
  },
  {
    id: "constellations", kind: "sessions", topics: ["relationships", "goals"],
    format: "both", priceKind: "paid", path: "services/systemic-constellations",
    image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
    title: { en: "Systemic constellations", ru: "Системные расстановки", es: "Constelaciones sistémicas" },
    about: {
      en: "Explore relationship and decision patterns through guided symbolic mapping.",
      ru: "Исследуйте повторяющиеся сценарии в отношениях и решениях.",
      es: "Explora patrones de relaciones y decisiones de forma simbólica.",
    },
    price: { en: "From €50 / 30 min", ru: "От €50 / 30 мин", es: "Desde 50 € / 30 min" },
  },
  {
    id: "business", kind: "sessions", topics: ["money", "goals"],
    format: "both", priceKind: "paid", path: "services/business-consulting",
    image: "/images/holistic-house/andy-about.png",
    title: { en: "Business & career guidance", ru: "Бизнес и карьера", es: "Orientación de negocios y carrera" },
    about: {
      en: "Clarify a project, priorities or a difficult choice with a consultant.",
      ru: "Проясните задачи проекта, приоритеты и сложные решения.",
      es: "Aclara tu proyecto, tus prioridades y decisiones importantes.",
    },
    price: { en: "From €50 / 30 min", ru: "От €50 / 30 мин", es: "Desde 50 € / 30 min" },
  },
  {
    id: "remote-reiki", kind: "sessions", topics: ["energy", "relationships"],
    format: "online", priceKind: "request", path: "services/remote-energy-support",
    image: "/images/holistic-house/reiki-practitioner-sunrise.webp",
    title: { en: "Remote Reiki support", ru: "Дистанционная поддержка Рейки", es: "Apoyo Reiki a distancia" },
    about: {
      en: "Choose a practitioner and request a remote session; terms confirmed personally.",
      ru: "Выберите мастера и запросите сессию; условия подтверждаются лично.",
      es: "Elige un profesional y solicita una sesión; se confirman las condiciones.",
    },
    price: { en: "Price on request", ru: "Цена по запросу", es: "Precio a consultar" },
  },
  {
    id: "events", kind: "events", topics: ["energy", "relationships", "goals"],
    format: "inperson", priceKind: "request", path: "events",
    image: "/images/holistic-house/hero-olive-incense.webp",
    title: { en: "Workshops & gatherings", ru: "Семинары и встречи", es: "Talleres y encuentros" },
    about: {
      en: "Explore published events and participation conditions.",
      ru: "Посмотрите ближайшие мероприятия и условия участия.",
      es: "Consulta los eventos publicados y las condiciones para participar.",
    },
    price: { en: "See schedule", ru: "Смотреть расписание", es: "Ver calendario" },
  },
];
const kinds: Kind[] = ["all", "sessions", "courses", "programs", "events"];
const topicKeys: Topic[] = ["all", "energy", "money", "relationships", "goals"];
const formatKeys: Format[] = ["any", "online", "inperson"];
const priceKeys: Price[] = ["all", "free", "paid"];
const kindIcons = { sessions: MessageCircle, courses: BookOpen, programs: GraduationCap, events: CalendarDays };
const pathIcons = [Search, Sparkles, HeartHandshake, GraduationCap];

export function HolisticUnifiedPath({ locale, activeChoice, suggestedFocus }: {
  locale: PublicLocale;
  activeChoice: string;
  suggestedFocus: Exclude<Topic, "all"> | null;
}) {
  const t = copy[locale];
  const [kind, setKind] = useState<Kind>("all");
  const [topic, setTopic] = useState<Topic>("all");
  const [format, setFormat] = useState<Format>("any");
  const [price, setPrice] = useState<Price>("all");
  useEffect(() => { setKind(activeChoice === "pump" ? "courses" : "all"); }, [activeChoice]);
  useEffect(() => { if (suggestedFocus) setTopic(suggestedFocus); }, [suggestedFocus]);

  const filtered = offers.filter(offer =>
    (kind === "all" || offer.kind === kind) &&
    (topic === "all" || offer.topics.includes(topic)) &&
    (format === "any" || offer.format === "both" || offer.format === format) &&
    (price === "all" || (price === "free" ? offer.priceKind === "free" : offer.priceKind !== "free")));
  const reset = () => { setKind("all"); setTopic("all"); setFormat("any"); setPrice("all"); };
  const jump = () => document.getElementById("holistic-unified-offers")?.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
  return (
    <div className={styles.hub} data-holistic-unified-hub>
      <section className={styles.path} data-holistic-personal-path aria-labelledby="personal-path-heading">
        <Image alt="" src="/images/holistic-house/reiki-approved-sunrise-v3.webp" fill
          sizes="(max-width: 720px) 100vw, 1120px" className={styles.backdrop} />
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.pathContent}>
          <h2 id="personal-path-heading">{t.journey}</h2>
          <p>{t.journeyLead}</p>
          <ol className={styles.steps}>
            {t.steps.map((text, index) => {
              const Icon = pathIcons[index];
              return <li key={text}>
                <span className={styles.stepIcon}><Icon size={22} aria-hidden="true" /></span>
                <span>{index + 1}. {text}</span>
              </li>;
            })}
          </ol>
          <button type="button" onClick={jump} className={styles.start}>
            {t.start}<ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
      <section className={styles.directory} id="holistic-unified-offers"
        aria-labelledby="holistic-unified-title" data-holistic-unified-directory>
        <header className={styles.header}>
          <div><h2 id="holistic-unified-title">{t.heading}</h2><p>{t.subtitle}</p></div>
          <Link href={"/" + locale + "/academy"} prefetch={false} className={styles.allLink}>
            {t.academy}<ArrowRight size={17} aria-hidden="true" />
          </Link>
        </header>
        <nav className={styles.categories} aria-label={t.subtitle}>
          {kinds.map(value => {
            const Icon = value === "all" ? SlidersHorizontal : kindIcons[value];
            return <button type="button" key={value} aria-pressed={kind === value}
              onClick={() => setKind(value)} className={kind === value ? styles.active : styles.category}>
              <Icon size={18} aria-hidden="true" />{t.kind[value]}
            </button>;
          })}
        </nav>
        <div className={styles.filters} data-holistic-unified-filters>
          <label><span>{t.topic}</span>
            <select value={topic} aria-label={t.topic} onChange={event => setTopic(event.target.value as Topic)}>
              {topicKeys.map(value => <option key={value} value={value}>{t.topics[value]}</option>)}
            </select></label>
          <label><span>{t.format}</span>
            <select value={format} aria-label={t.format} onChange={event => setFormat(event.target.value as Format)}>
              {formatKeys.map(value => <option key={value} value={value}>{t.formats[value]}</option>)}
            </select></label>
          <label><span>{t.price}</span>
            <select value={price} aria-label={t.price} onChange={event => setPrice(event.target.value as Price)}>
              {priceKeys.map(value => <option key={value} value={value}>{t.prices[value]}</option>)}
            </select></label>
        </div>
        <div className={styles.results} aria-live="polite" data-holistic-unified-results>
          <span className={styles.count}>{filtered.length} {t.count}</span>
          {filtered.map(offer => {
            const Icon = kindIcons[offer.kind];
            const href = offer.id === "reiki-practitioner"
              ? REIKI_FREE_COURSE_PATH.replace(/^\/en\//, "/" + locale + "/")
              : "/" + locale + "/" + offer.path;
            return <Link href={href} key={offer.id} className={styles.offer} prefetch={false}
              data-holistic-unified-offer={offer.id}>
              <span className={styles.photo}>
                <Image alt="" src={offer.image} fill sizes="(max-width: 600px) 34vw, 245px" />
                <span className={styles.kindTag}><Icon size={15} aria-hidden="true" />{t.labels[offer.kind]}</span>
              </span>
              <span className={styles.body}>
                <strong className={styles.offerTitle}>{offer.title[locale]}</strong>
                <span className={styles.about}>{offer.about[locale]}</span>
                <span className={styles.footerLine}>
                  <strong className={styles.price}>{offer.price[locale]}</strong>
                  <span className={styles.details}>{t.details}<ChevronRight size={18} aria-hidden="true" /></span>
                </span>
              </span>
            </Link>;
          })}
          {filtered.length === 0 && <div role="status" className={styles.empty}>
            <p>{t.empty}</p><button type="button" onClick={reset}>{t.reset}</button>
          </div>}
        </div>
        <footer className={styles.foot}>
          <p>{t.disclaimer}</p>
          <Link href={"/" + locale + "/services/catalog"} prefetch={false}>
            {t.directory}<ArrowRight size={17} aria-hidden="true" />
          </Link>
        </footer>
      </section>
    </div>
  );
}
