import type { PublicLocale } from "@/lib/public-locales";
import { REIKI_LEVEL_PRICES } from "@/lib/academy/reiki-level-pricing.js";
import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";

/**
 * Read-only discovery of ALREADY EXISTING public Academy pages and initiation
 * requests. These are NOT new provider services, enrollments or payment SKUs.
 * Only the canonical personal-initiation rate and explicitly free resources
 * have a numeric price. No certificate, SLA or written/voice report is promised.
 */
export type ReikiPublicOfferFormat = "initiation" | "course";
export type ReikiPublicPrice = "all" | "free" | "low" | "mid" | "high" | "premium";
export type ReikiPublicFocus = "strength" | "love" | "purpose" | "balance";
export type ReikiPublicOffer = {
  id: string;
  format: ReikiPublicOfferFormat;
  focus: readonly ReikiPublicFocus[];
  method: "Tantra Reiki" | "Kundalini Reiki" | "Reiki Yggdrasil";
  title: string;
  description: string;
  href: string;
  photo: string;
  practitionerPhoto: string;
  practitioner: string;
  /** Explicit fee only; null means 'ask', never zero. */
  priceEur: number | null;
  priceStatus: "free" | "published" | "ask";
  durationMinutes: number | null;
  /** Source has not verified these offer-level commitments. */
  certificateAvailable: null;
  reportFormats: null;
  deliveryWindow: null;
  source: "existing_academy";
};

const mentor = "Andy";
const mentorPhoto = "/images/holistic-house/andy-about.png";
const sunrise = "/images/holistic-house/reiki-approved-sunrise-v3.webp";
const practitionerSunrise = "/images/holistic-house/reiki-practitioner-sunrise.webp";

const records = [
  {
    id: "tantra-free-initiation", format: "initiation", focus: ["love"],
    method: "Tantra Reiki", slug: "reiki/tantra-reiki/free-initiation",
    title: { en: "Tantra Reiki — free initiation request", ru: "Тантра Рейки — бесплатная заявка на инициацию", es: "Tantra Reiki — solicitud de iniciación gratuita" },
    description: { en: "The existing first-level introduction and guided request. Personal availability is confirmed separately.", ru: "Действующее знакомство с первой ступенью и заявка. Дата личной встречи согласуется отдельно.", es: "Introducción de primer nivel y solicitud existentes; confirma la disponibilidad aparte." },
    photo: sunrise, priceStatus: "free", priceEur: 0, durationMinutes: null,
  },
  {
    id: "tantra-personal-initiation", format: "initiation", focus: ["love"],
    method: "Tantra Reiki", slug: "reiki/tantra-reiki/free-initiation#initiation-choices",
    title: { en: "Tantra Reiki — personal initiation", ru: "Тантра Рейки — личная инициация", es: "Tantra Reiki — iniciación personal" },
    description: { en: "Personal first-level guidance by request. One level; schedule and certificate to be confirmed.", ru: "Личное сопровождение первой ступени по запросу. Время и сертификат уточняются.", es: "Guía personal para el primer nivel, previa solicitud. Fecha y certificado por confirmar." },
    photo: sunrise, priceStatus: "published", priceEur: REIKI_LEVEL_PRICES.tantra.amountEur,
    durationMinutes: REIKI_LEVEL_PRICES.tantra.durationMinutes,
  },
  {
    id: "yggdrasil-free-introduction", format: "initiation", focus: ["balance"],
    method: "Reiki Yggdrasil", slug: "reiki/yggdrasil/free-initiation",
    title: { en: "Reiki Yggdrasil — introductory initiation", ru: "Рейки Иггдрасиль — вводная инициация", es: "Reiki Yggdrasil — iniciación introductoria" },
    description: { en: "Explore the existing free introductory initiation information. Confirmation is required.", ru: "Существующие материалы о бесплатном вводном посвящении; участие подтверждается отдельно.", es: "Explora la introducción gratuita existente. Se requiere confirmación." },
    photo: practitionerSunrise, priceStatus: "free", priceEur: 0, durationMinutes: null,
  },
  {
    id: "yggdrasil-personal-initiation", format: "initiation", focus: ["balance"],
    method: "Reiki Yggdrasil", slug: "reiki/yggdrasil",
    title: { en: "Reiki Yggdrasil — personal level initiation", ru: "Рейки Иггдрасиль — личная инициация ступени", es: "Reiki Yggdrasil — iniciación personal por nivel" },
    description: { en: "One personally guided level; the date and certificate are discussed before any order.", ru: "Одна ступень с личным сопровождением. Дату и выдачу сертификата согласовывают заранее.", es: "Un nivel con guía personal; fecha y certificado se acuerdan por separado." },
    photo: practitionerSunrise, priceStatus: "published", priceEur: REIKI_LEVEL_PRICES.yggdrasil.amountEur,
    durationMinutes: REIKI_LEVEL_PRICES.yggdrasil.durationMinutes,
  },
  {
    id: "kundalini-initiation-request", format: "initiation", focus: ["strength"],
    method: "Kundalini Reiki", slug: "reiki/kundalini-reiki",
    title: { en: "Kundalini Reiki — initiation enquiry", ru: "Кундалини Рейки — запрос инициации", es: "Kundalini Reiki — consulta de iniciación" },
    description: { en: "An existing first-level initiation request. Individual terms and fees are confirmed by the teacher.", ru: "Действующая заявка на первую ступень; формат и стоимость уточняет преподаватель.", es: "Solicitud existente de primer nivel; condiciones y precio por confirmar." },
    photo: practitionerSunrise, priceStatus: "ask", priceEur: null, durationMinutes: null,
  },
  {
    id: "reiki-free-practitioner", format: "course", focus: ["love", "strength", "balance"],
    method: "Tantra Reiki", slug: "reiki/free-practitioner-course",
    title: { en: "Free Reiki Practitioner Program", ru: "Бесплатная программа Reiki Practitioner", es: "Programa Reiki Practitioner gratuito" },
    description: { en: "Five original introductory lessons across Tantra, Kundalini and Yggdrasil. No automatic certificate.", ru: "Пять вводных уроков Тантра, Кундалини и Иггдрасиль Рейки. Сертификат не выдается автоматически.", es: "Cinco lecciones originales de Tantra, Kundalini y Yggdrasil. Sin certificado automático." },
    photo: sunrise, priceStatus: "free", priceEur: 0, durationMinutes: null,
  },
  {
    id: "tantra-learning", format: "course", focus: ["love"],
    method: "Tantra Reiki", slug: "reiki/tantra-reiki",
    title: { en: "Tantra Reiki — first-level training", ru: "Тантра Рейки — обучение первой ступени", es: "Tantra Reiki — formación de primer nivel" },
    description: { en: "Original first-level materials and guided practice. Additional tutoring fees are not confirmed.", ru: "Оригинальные материалы первой ступени и практики. Оплата личного обучения уточняется.", es: "Materiales originales y prácticas de primer nivel; tutoría por confirmar." },
    photo: sunrise, priceStatus: "ask", priceEur: null, durationMinutes: null,
  },
  {
    id: "kundalini-learning", format: "course", focus: ["strength"],
    method: "Kundalini Reiki", slug: "reiki/kundalini-reiki",
    title: { en: "Kundalini Reiki — three-level training", ru: "Кундалини Рейки — программа трёх ступеней", es: "Kundalini Reiki — formación en tres niveles" },
    description: { en: "Existing three-level study path with the original manual. Dates and tuition on request.", ru: "Действующий курс трёх ступеней с оригинальной методичкой. Условия уточняются.", es: "Programa de tres niveles y manual original; precio y fechas por confirmar." },
    photo: practitionerSunrise, priceStatus: "ask", priceEur: null, durationMinutes: null,
  },
  {
    id: "yggdrasil-learning", format: "course", focus: ["balance"],
    method: "Reiki Yggdrasil", slug: "reiki/yggdrasil",
    title: { en: "Reiki Yggdrasil — learning programme", ru: "Рейки Иггдрасиль — программа обучения", es: "Reiki Yggdrasil — programa de formación" },
    description: { en: "Existing seven-module Yggdrasil programme. Tutoring and tuition require confirmation.", ru: "Действующая программа семи модулей. Стоимость сопровождения уточняется.", es: "Programa existente de siete módulos; condiciones por confirmar." },
    photo: practitionerSunrise, priceStatus: "ask", priceEur: null, durationMinutes: null,
  },
] as const satisfies readonly {
  id: string;
  format: ReikiPublicOfferFormat;
  focus: readonly ReikiPublicFocus[];
  method: ReikiPublicOffer["method"];
  slug: string;
  title: Record<PublicLocale, string>;
  description: Record<PublicLocale, string>;
  photo: string;
  priceStatus: ReikiPublicOffer["priceStatus"];
  priceEur: number | null;
  durationMinutes: number | null;
}[];

export function listReikiPublicOffers(locale: PublicLocale): ReikiPublicOffer[] {
  return records.map(record => ({
    id: record.id, format: record.format, focus: record.focus, method: record.method,
    title: record.title[locale], description: record.description[locale],
    href: record.id === "reiki-free-practitioner" && locale === "en"
      ? REIKI_FREE_COURSE_PATH
      : "/" + locale + "/academy/" + record.slug,
    photo: record.photo, practitionerPhoto: mentorPhoto, practitioner: mentor,
    priceEur: record.priceEur, priceStatus: record.priceStatus,
    durationMinutes: record.durationMinutes,
    certificateAvailable: null, reportFormats: null, deliveryWindow: null,
    source: "existing_academy",
  }));
}

export function matchReikiPublicOffers(
  offers: readonly ReikiPublicOffer[],
  filters: {
    format: ReikiPublicOfferFormat;
    focus: ReikiPublicFocus;
    price: ReikiPublicPrice;
    certificateRequested: boolean;
  },
): ReikiPublicOffer[] {
  return offers.filter(offer => {
    if (offer.format !== filters.format || !offer.focus.includes(filters.focus)) return false;
    // Unknown is not 'yes'. Do not invent certificates just because the user requests one.
    if (filters.certificateRequested && offer.certificateAvailable !== true) return false;
    if (filters.price === "all") return true;
    if (offer.priceEur === null) return false;
    switch (filters.price) {
      case "free": return offer.priceStatus === "free" && offer.priceEur === 0;
      case "low": return offer.priceEur > 0 && offer.priceEur <= 20;
      case "mid": return offer.priceEur > 20 && offer.priceEur <= 50;
      case "high": return offer.priceEur > 50 && offer.priceEur <= 100;
      case "premium": return offer.priceEur > 100;
      default: return false;
    }
  });
}
