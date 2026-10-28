"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type TouchEvent } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, FileText, Filter, HandHeart, Headphones, PlayCircle, ShieldCheck, Sparkles, TestTube2, UserRound, X, BriefcaseBusiness, Eye, Leaf, MessageCircle, ShoppingCart, SlidersHorizontal, Users, CalendarDays, Clock3, GraduationCap, Mic, Zap } from "lucide-react";
import { listReikiPublicOffers, matchReikiPublicOffers, type ReikiPublicOffer } from "@/lib/academy/reiki-public-offers";
import { RemoteEnergySupportBooking, type EnergySupportMaster } from "@/components/remote-energy-support-booking";
import type { PublicLocale } from "@/lib/public-locales";
import { matchReikiVariants } from "@/lib/practitioners/reiki-offer.mjs";
import styles from "./holistic-support-master-gallery.module.css";

type Kind = "masters" | "healing" | "consultation";
type ReikiFocus = "strength" | "love" | "purpose" | "balance";
type ReikiTab = "main" | "filter" | "description" | "media";
type ReikiFormat = "session" | "initiation" | "course";
type ReikiPrice = "all" | "free" | "low" | "mid" | "high" | "premium";
type ReikiTime = "any" | "day" | "days" | "chosen";
type ReikiReport = "brief" | "text" | "voice";
type ReikiRole = "any" | "practitioner" | "master";
// "All" is restored with the visible Reset button, leaving five compact price chips.
const PRICE_BANDS: Exclude<ReikiPrice, "all">[] = ["free", "low", "mid", "high", "premium"];
function matchesReikiEuroPrice(master: EnergySupportMaster, band: ReikiPrice, price: number) {
  if (band === "all") return true;
  if (master.currency !== "EUR" || !Number.isFinite(price)) return false;
  switch (band) {
    case "free": return price === 0;
    case "low": return price > 0 && price <= 20;
    case "mid": return price > 20 && price <= 50;
    case "high": return price > 50 && price <= 100;
    case "premium": return price > 100;
  }
}
const REIKI_FOCI: ReikiFocus[] = ["strength", "love", "purpose", "balance"];
// Only public methods returned by the existing practitioner directory are bookable.
// Unpublished practice tabs show an honest empty state, never a synthetic offer.
const REIKI_METHODS: Record<ReikiFocus, readonly string[]> = {
  strength: ["Kundalini Reiki"],
  love: ["Tantra Reiki"],
  purpose: ["Runic Reiki", "Rune Reiki", "Reiki Runes", "Tarot"],
  balance: ["Reiki Yggdrasil"],
};
type PublishedConsultation = {
  serviceId: string;
  title: string;
  practitionerName: string;
  description: string;
  areaKey: string;
  pricingMode: string;
  price: number | null;
  currency: string;
  href: string;
  deliveryFormat: string;
  photos: string[];
  presentations: { type: "video" | "audio"; url: string }[];
};
type DirectoryResponse = { masters?: EnergySupportMaster[]; consultations?: PublishedConsultation[] };
const words = {
  en: {
    masters: "Masters", healing: "Reiki support", consultation: "Test / session",
    verified: "Published practitioner", publicOffer: "Published service", online: "Online",
    method: "Method", allMethods: "All practices", price: "Price", allPrices: "All offers",
    freeOnly: "Free", paidOnly: "With a published price",
    galleryMasters: "Choose a master", galleryOffers: "Other services",
    reikiFocus: "Reiki support intention",
    reikiOptions: {
      strength: { label: "Strength support", method: "Kundalini Reiki" },
      love: { label: "Love support", method: "Tantra Reiki" },
      purpose: { label: "Purpose support", method: "Runic Reiki / Tarot" },
      balance: { label: "Balance support", method: "Reiki Yggdrasil" },
    },
    reikiUnavailable: "No published practitioner offer for this Reiki method yet. No session can be booked for it here.",
    reikiSeeAvailable: "See available Reiki methods",
    request: "Request this master", openOffer: "View service & request", details: "Profile",
    from: "Published options", quote: "Details confirmed before booking",
    exploreMasters: "All masters", exploreServices: "All services", tests: "Free self-tests",
    description: "Only approved, published practitioners and offers; this is not a booking or payment.",
    consultNote: "Choose an approved service, then continue through its secure enquiry.",
    loading: "Loading published offers…", unavailable: "The practitioner directory is temporarily unavailable.",
    empty: "No published matches for this filter.", retry: "Retry", reset: "Show all",
    prev: "Previous", next: "Next", close: "Close request", requestTitle: "Request support",
  },
  ru: {
    masters: "Мастера", healing: "Рейки поддержка", consultation: "Тест / сессия",
    verified: "Опубликованный мастер", publicOffer: "Опубликованная услуга", online: "Онлайн",
    method: "Метод", allMethods: "Все практики", price: "Цена", allPrices: "Все предложения",
    freeOnly: "Бесплатно", paidOnly: "С опубликованной ценой",
    galleryMasters: "Выбери мастера", galleryOffers: "Другие услуги",
    reikiFocus: "Цель Рейки поддержки",
    reikiOptions: {
      strength: { label: "Поддержка силы", method: "Кундалини Рейки" },
      love: { label: "Поддержка любви", method: "Тантра Рейки" },
      purpose: { label: "Поддержка цели", method: "Рейки рун / Таро" },
      balance: { label: "Поддержка баланса", method: "Рейки Иггдрасиль" },
    },
    reikiUnavailable: "Для выбранной практики пока нет опубликованного предложения. Запись и цена не подтверждены.",
    reikiSeeAvailable: "Доступные практики Рейки",
    request: "Запросить сессию", openOffer: "Подробнее и запросить", details: "Профиль",
    from: "Опубликованные варианты", quote: "Запись подтверждается отдельно",
    exploreMasters: "Все мастера", exploreServices: "Все услуги", tests: "Бесплатные тесты",
    description: "Только одобренные опубликованные мастера и предложения. Выбор не означает запись или оплату.",
    consultNote: "Выбери опубликованную услугу и перейди к защищённой заявке.",
    loading: "Загружаем опубликованные предложения…", unavailable: "Каталог мастеров сейчас недоступен.",
    empty: "По этому фильтру нет опубликованных предложений.", retry: "Повторить", reset: "Показать все",
    prev: "Назад", next: "Вперёд", close: "Закрыть заявку", requestTitle: "Запросить поддержку",
  },
  es: {
    masters: "Maestros", healing: "Apoyo Reiki", consultation: "Test / sesión",
    verified: "Profesional publicado", publicOffer: "Servicio publicado", online: "En línea",
    method: "Método", allMethods: "Todas las prácticas", price: "Precio", allPrices: "Todas",
    freeOnly: "Gratis", paidOnly: "Con precio publicado",
    galleryMasters: "Elige un profesional", galleryOffers: "Otros servicios",
    reikiFocus: "Objetivo del apoyo Reiki",
    reikiOptions: {
      strength: { label: "Apoyo a la fuerza", method: "Kundalini Reiki" },
      love: { label: "Apoyo al amor", method: "Tantra Reiki" },
      purpose: { label: "Apoyo a las metas", method: "Reiki rúnico / Tarot" },
      balance: { label: "Apoyo al equilibrio", method: "Reiki Yggdrasil" },
    },
    reikiUnavailable: "Todavía no hay una oferta publicada para esta práctica. No se puede reservar aquí.",
    reikiSeeAvailable: "Ver prácticas Reiki disponibles",
    request: "Solicitar una sesión", openOffer: "Ver servicio y solicitar", details: "Perfil",
    from: "Ofertas publicadas", quote: "La reserva se confirma aparte",
    exploreMasters: "Todos los profesionales", exploreServices: "Todos los servicios", tests: "Tests gratuitos",
    description: "Solo profesionales y servicios aprobados y publicados. Elegir no reserva ni paga.",
    consultNote: "Elige un servicio publicado y continúa con la solicitud segura.",
    loading: "Cargando ofertas publicadas…", unavailable: "El catálogo no está disponible ahora.",
    empty: "No hay ofertas publicadas para este filtro.", retry: "Reintentar", reset: "Mostrar todas",
    prev: "Anterior", next: "Siguiente", close: "Cerrar solicitud", requestTitle: "Solicitar apoyo",
  },
} as const;

// Real EUR prices and the same published Reiki variant must satisfy every chosen filter.
// Session times are advertised conditions, never confirmed appointment slots.
const reikiUi = {
  en: {
    tabs: { main: "Main", filter: "Filter", description: "Description", media: "Video / audio" },
    format: "Format", formats: { session: "Session", initiation: "Initiation", course: "Training course" },
    price: "Price", prices: { all: "Any", free: "Free", low: "€0–20", mid: "€21–50", high: "€51–100", premium: "€100+" },
    time: "Preferred timing", times: { day: "Within 24h", days: "Within 3 days", chosen: "Chosen hour" },
    report: "Requested report", reports: { brief: "Brief", text: "Personal text review", voice: "Personal voice review" },
    role: "Preferred provider", roles: { practitioner: "Practitioner", master: "Reiki master" },
    certificate: "Request a certificate", certificateNote: "Only for initiation or training; issuance must be confirmed.",
    preferences: "Published offers describe the master's conditions; actual availability is confirmed separately.",
    heading: "Find Reiki support", intro: "Published options, with conditions confirmed before a request.",
    heroTitle: "Reiki support for you", photoHint: "Choose a session, initiation or course in one place.",
    show: "Show available options", count: "Published matching offers", resetFilters: "Reset filters",
    notBooked: "No booking, payment or certificate is created by choosing.",
    initiation: "Explore a Reiki initiation", course: "Free Reiki Practitioner course",
    initiationNote: "See the original initiation request. Timing and certificate are not yet verified.",
    courseNote: "Start the existing self-paced course. A certificate is not automatically granted.",
    learningNone: "No verified offer matches this price or certificate condition.",
    learn: "View original programme", details: "About this support",
    mediaNone: "No approved video or audio introduction has been published for this provider.",
    mediaOpen: "Open", provider: "Provider profile", request: "Request published session",
    choose: "Select filters",
    offersSession: "Reiki sessions", offersInitiation: "Reiki initiations", offersCourse: "Reiki learning programmes",
    offersCount: "offers", sessionTitle: "Reiki support session", offerPublished: "Published service",
    author: "Practitioner", metaTiming: "Timing", metaReport: "Report", metaCertificate: "Certificate",
    unconfirmed: "to confirm", askPrice: "Price on request", minutes: "min",
    sessionCta: "Request session", initiationCta: "Explore initiation", courseCta: "Open programme",
    cardSource: "Existing Academy programme · no booking or payment",
    noCertificate: "No offer has a confirmed certificate for these choices.",
    viewAll: "Reset conditions", waiting: "Loading published sessions…",
  },
  ru: {
    tabs: { main: "Главное", filter: "Фильтр", description: "Описание", media: "Видео / аудио" },
    format: "Формат", formats: { session: "Сессия", initiation: "Инициация", course: "Курс обучения" },
    price: "Цена", prices: { all: "Все", free: "Free", low: "0–20 €", mid: "21–50 €", high: "51–100 €", premium: "100+ €" },
    time: "Желаемый срок", times: { day: "В течение суток", days: "В течение 3 дней", chosen: "В выбранный час" },
    report: "Отчёт", reports: { brief: "Краткий", text: "Личный разбор текстом", voice: "Личный разбор голосом" },
    role: "Исполнитель", roles: { practitioner: "От практика", master: "От Рейки-мастера" },
    certificate: "С выдачей сертификата", certificateNote: "Только для инициации и курса. Выдача уточняется отдельно.",
    preferences: "Фильтр сверяет опубликованные условия мастера. Наличие времени и выдача сертификата подтверждаются отдельно.",
    heading: "Подбор Рейки-поддержки", intro: "Опубликованные предложения. Условия подтверждаются при заявке.",
    heroTitle: "Энергетическая поддержка", photoHint: "Сессия, инициация или обучение — под ваш запрос.",
    show: "Показать варианты", count: "Опубликованных совпадений", resetFilters: "Сбросить",
    notBooked: "Выбор не означает запись, оплату или выдачу сертификата.",
    initiation: "Инициация Рейки", course: "Бесплатный курс Reiki Practitioner",
    initiationNote: "Запрос инициации на действующей странице. Срок и сертификат пока не подтверждены.",
    courseNote: "Обучение в существующей программе. Сертификат не выдается автоматически.",
    learningNone: "Нет подтверждённых предложений с такой ценой или сертификатом.",
    learn: "Открыть программу", details: "О поддержке",
    mediaNone: "У исполнителя пока нет опубликованной видео- или аудиопрезентации.",
    mediaOpen: "Открыть", provider: "Профиль исполнителя", request: "Запросить сессию",
    choose: "Подобрать по фильтру",
    offersSession: "Сессии Рейки", offersInitiation: "Инициации Рейки", offersCourse: "Программы обучения Рейки",
    offersCount: "предложений", sessionTitle: "Сессия Рейки-поддержки", offerPublished: "Опубликованная услуга",
    author: "Практик", metaTiming: "Срок", metaReport: "Отчёт", metaCertificate: "Сертификат",
    unconfirmed: "уточняется", askPrice: "Цена по запросу", minutes: "мин",
    sessionCta: "Запросить сессию", initiationCta: "Открыть инициацию", courseCta: "Открыть программу",
    cardSource: "Действующая программа Академии · не запись и не оплата",
    noCertificate: "Нет предложений с подтверждённой выдачей сертификата.",
    viewAll: "Сбросить условия", waiting: "Загружаем опубликованные сессии…",
  },
  es: {
    tabs: { main: "Inicio", filter: "Filtro", description: "Descripción", media: "Vídeo / audio" },
    format: "Formato", formats: { session: "Sesión", initiation: "Iniciación", course: "Curso de formación" },
    price: "Precio", prices: { all: "Todos", free: "Gratis", low: "0–20 €", mid: "21–50 €", high: "51–100 €", premium: "100+ €" },
    time: "Plazo preferido", times: { day: "En 24 horas", days: "En 3 días", chosen: "Hora elegida" },
    report: "Informe", reports: { brief: "Breve", text: "Análisis personal escrito", voice: "Análisis personal por voz" },
    role: "Profesional preferido", roles: { practitioner: "Practicante", master: "Maestro Reiki" },
    certificate: "Solicitar certificado", certificateNote: "Solo para iniciación o curso; se confirma aparte.",
    preferences: "Las condiciones provienen de ofertas publicadas. Horarios y certificados se confirman por separado.",
    heading: "Encuentra apoyo Reiki", intro: "Opciones publicadas, condiciones por confirmar.",
    heroTitle: "Apoyo energético Reiki", photoHint: "Sesión, iniciación o curso en un solo lugar.",
    show: "Ver opciones", count: "Ofertas publicadas compatibles", resetFilters: "Restablecer",
    notBooked: "Elegir no reserva, paga ni concede certificados.",
    initiation: "Iniciación Reiki", course: "Curso gratuito Reiki Practitioner",
    initiationNote: "Consulta la solicitud original. Plazo y certificado aún sin verificar.",
    courseNote: "Empieza el curso existente. No se emite un certificado automáticamente.",
    learningNone: "No hay ofertas verificadas con ese precio o certificado.",
    learn: "Ver el programa", details: "Sobre el apoyo",
    mediaNone: "Aún no hay presentación de vídeo o audio publicada.",
    mediaOpen: "Abrir", provider: "Perfil del profesional", request: "Solicitar sesión",
    choose: "Elegir filtros",
    offersSession: "Sesiones Reiki", offersInitiation: "Iniciaciones Reiki", offersCourse: "Programas de formación Reiki",
    offersCount: "ofertas", sessionTitle: "Sesión de apoyo Reiki", offerPublished: "Servicio publicado",
    author: "Profesional", metaTiming: "Plazo", metaReport: "Informe", metaCertificate: "Certificado",
    unconfirmed: "por confirmar", askPrice: "Precio por consultar", minutes: "min",
    sessionCta: "Solicitar sesión", initiationCta: "Ver iniciación", courseCta: "Abrir programa",
    cardSource: "Programa existente · sin reserva ni pago",
    noCertificate: "No hay ofertas con certificado confirmado.",
    viewAll: "Restablecer filtros", waiting: "Cargando sesiones publicadas…",
  },
} as const;


type ConsultationCategory = "all" | "psycho" | "imagery" | "constellations" | "business";
const CONSULTATION_CATEGORIES = [
  { id: "all", Icon: MessageCircle },
  { id: "psycho", Icon: Leaf },
  { id: "imagery", Icon: Eye },
  { id: "constellations", Icon: Users },
  { id: "business", Icon: BriefcaseBusiness },
] as const;

const consultationUi = {
  en: {
    heading: "Services", subtitle: "Choose your direction", all: "All services",
    categories: { all: "Consultations", psycho: "Psycho-homeopathy", imagery: "Guided imagery",
      constellations: "Systemic constellations", business: "Business consulting" },
    master: "Practitioner", allMasters: "All practitioners", format: "Format", allFormats: "Any format",
    price: "Price", reset: "Reset", showNext: "More service categories",
    online: "Online", inPerson: "In person", hybrid: "Online / in person",
    order: "Request service", details: "Details", published: "Published service",
    media: "View approved introduction", photos: "Service photos",
    notice: "A request is not a confirmed booking or payment.",
  },
  ru: {
    heading: "Услуги", subtitle: "Выбери направление поддержки", all: "Все услуги",
    categories: { all: "Консультации", psycho: "Психогомеопатия", imagery: "Гайдед имажери",
      constellations: "Системные расстановки", business: "Бизнес-консалтинг" },
    master: "Мастер", allMasters: "Все мастера", format: "Формат", allFormats: "Все форматы",
    price: "Цена", reset: "Сбросить", showNext: "Следующие категории услуг",
    online: "Онлайн", inPerson: "Очно", hybrid: "Онлайн / очно",
    order: "Заказать", details: "Подробнее", published: "Опубликованная услуга",
    media: "Открыть опубликованную презентацию", photos: "Фото услуги",
    notice: "Заявка не означает подтверждённую запись или оплату.",
  },
  es: {
    heading: "Servicios", subtitle: "Elige tu dirección", all: "Todos los servicios",
    categories: { all: "Consultas", psycho: "Psicohomeopatía", imagery: "Imágenes guiadas",
      constellations: "Constelaciones sistémicas", business: "Consultoría empresarial" },
    master: "Profesional", allMasters: "Todos", format: "Formato", allFormats: "Cualquier formato",
    price: "Precio", reset: "Restablecer", showNext: "Más categorías",
    online: "En línea", inPerson: "Presencial", hybrid: "En línea / presencial",
    order: "Solicitar", details: "Detalles", published: "Servicio publicado",
    media: "Ver presentación publicada", photos: "Fotos del servicio",
    notice: "Solicitar no confirma una reserva ni realiza un pago.",
  },
} as const;

/** Browse real approved offers by shared topics, without manufacturing category inventory. */
function matchesConsultationCategory(offer: PublishedConsultation, category: ConsultationCategory) {
  if (category === "all") return true;
  const source = [offer.title, offer.description, offer.areaKey, offer.href].join(" ").toLowerCase();
  switch (category) {
    case "psycho": return /homeopath|homeopat|гомеопат|alchemy|алхими|alquimia/.test(source);
    case "imagery": return /imagery|imagin|образн|имажери|guided|гипнотерап|hypnotherap|hipnoterap/.test(source);
    case "constellations": return /constellat|constelac|расстанов|системн|systemic/.test(source);
    case "business": return /business|бизнес|empresa|negocio|consulting|консалтинг|consultor/.test(source);
  }
}
function consultationCover(offer: PublishedConsultation) {
  if (offer.photos?.[0]) return offer.photos[0];
  if (matchesConsultationCategory(offer, "imagery")) return "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp";
  if (matchesConsultationCategory(offer, "constellations")) return "/images/holistic-house/video-posters/constellations-en-v1.webp";
  if (matchesConsultationCategory(offer, "business")) return "/images/holistic-house/hero-olive-incense.webp";
  if (/andrey|andy|андре/i.test(offer.practitionerName)) {
    return "/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp";
  }
  return "/images/holistic-house/hero-olive-incense.webp";
}
function consultationFormatName(format: string, locale: PublicLocale) {
  if (format === "online") return consultationUi[locale].online;
  if (format === "in_person" || format === "offline") return consultationUi[locale].inPerson;
  if (format === "hybrid") return consultationUi[locale].hybrid;
  return format || consultationUi[locale].allFormats;
}

function validMaster(value: unknown): value is EnergySupportMaster {
  return Boolean(value && typeof value === "object" &&
    "slug" in value && typeof value.slug === "string" &&
    "serviceId" in value && typeof value.serviceId === "string" &&
    "name" in value && typeof value.name === "string" &&
    "methods" in value && Array.isArray(value.methods) &&
    "priceOptions" in value && Array.isArray(value.priceOptions));
}
function validOffer(value: unknown, locale: PublicLocale): value is PublishedConsultation {
  if (!value || typeof value !== "object" || !("serviceId" in value) || !("title" in value) ||
      !("href" in value) || !("practitionerName" in value)) return false;
  const offer = value as PublishedConsultation;
  return typeof offer.serviceId === "string" && typeof offer.title === "string" &&
    typeof offer.practitionerName === "string" && typeof offer.href === "string" &&
    offer.href.startsWith("/" + locale + "/") && !offer.href.startsWith("//");
}
function publishedPrice(price: number, currency: string, locale: PublicLocale) {
  if (!Number.isFinite(price) || !/^[A-Z]{3}$/.test(currency)) return null;
  try { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(price); }
  catch { return null; }
}

export function HolisticSupportMasterGallery({ locale, kind }: {
  locale: PublicLocale; kind: Kind;
}) {
  const t = words[locale];
  const consultations = kind === "consultation";
  const [masters, setMasters] = useState<EnergySupportMaster[] | null>(null);
  const [offers, setOffers] = useState<PublishedConsultation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [method, setMethod] = useState("");
  const [reikiFocus, setReikiFocus] = useState<ReikiFocus>("love");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "published">("all");
  const [consultCategory, setConsultCategory] = useState<ConsultationCategory>("all");
  const [consultMaster, setConsultMaster] = useState("");
  const [consultFormat, setConsultFormat] = useState("");
  const [consultDetailsOpen, setConsultDetailsOpen] = useState(false);
  const [consultPhotoIndex, setConsultPhotoIndex] = useState(0);
  const categoryRailRef = useRef<HTMLDivElement>(null);
  const [reikiTab, setReikiTab] = useState<ReikiTab>("main");
  const [reikiFormat, setReikiFormat] = useState<ReikiFormat>("session");
  const [reikiPrice, setReikiPrice] = useState<ReikiPrice>("all");
  const [reikiTime, setReikiTime] = useState<ReikiTime>("any");
  const [reikiReport, setReikiReport] = useState<ReikiReport>("brief");
  const [reikiRole, setReikiRole] = useState<ReikiRole>("any");
  const [reikiCertificate, setReikiCertificate] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false); setMasters(null); setOffers(null); setSelectedId(null);
    const url = "/api/public/remote-energy-support-masters?locale=" + locale +
      (consultations ? "&kind=consultation" : kind === "healing" ? "&kind=reiki" : "");
    fetch(url, { credentials: "omit", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("PUBLIC_DIRECTORY_UNAVAILABLE");
      return await response.json() as DirectoryResponse;
    }).then(data => {
      if (controller.signal.aborted) return;
      if (consultations) {
        if (!Array.isArray(data?.consultations)) throw new Error("INVALID_CONSULTATION_DIRECTORY");
        setOffers(data.consultations.filter(offer => validOffer(offer, locale)));
      } else {
        if (!Array.isArray(data?.masters)) throw new Error("INVALID_MASTER_DIRECTORY");
        setMasters(data.masters.filter(validMaster));
      }
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [locale, consultations, kind, attempt]);

  // Reopen the same approved master after the existing Google OAuth redirect.
  // The OAuth marker contains only public service title/path, never a client's
  // private intention or the signed-in account details.
  useEffect(() => {
    if (consultations || !masters?.length) return;
    try {
      const pending = JSON.parse(window.sessionStorage.getItem("hh-google-enquiry-return") || "null");
      if (pending?.path !== window.location.pathname ||
          typeof pending.service !== "string" ||
          !pending.service.startsWith("Reiki support · ")) return;
      const master = masters.find(item => pending.service.startsWith(
        "Reiki support · " + item.name.slice(0, 72) + " · "));
      if (!master) return;
      if (kind === "healing") {
        const focus = REIKI_FOCI.find(value => master.methods.some(name =>
          REIKI_METHODS[value].some(allowed => allowed.toLowerCase() === name.toLowerCase())));
        if (!focus) return;
        setReikiFocus(focus);
      }
      setMethod("");
      setSelectedId(master.serviceId);
      setOrderOpen(true);
    } catch { /* Invalid session markers never expose account information. */ }
  }, [masters, consultations, kind]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (orderOpen && !dialog.open) dialog.showModal();
    if (!orderOpen && dialog.open) dialog.close();
  }, [orderOpen]);

  const supportedMethods = kind === "healing" ? REIKI_METHODS[reikiFocus] : null;
  const offersMethod = (value: string) => !supportedMethods ||
    supportedMethods.some(name => name.toLowerCase() === value.toLowerCase());
  const methods = [...new Set((masters || []).flatMap(master => master.methods || [])
    .filter((value): value is string => Boolean(value) && offersMethod(value)))];
  const matchingReikiOptions = (master: EnergySupportMaster) =>
    matchReikiVariants(master.reikiOffer, { kind: reikiFormat, price: reikiPrice, time: reikiTime,
      report: reikiReport, role: reikiRole, certificate: reikiCertificate });
  const visibleMasters = (masters || []).filter(master => {
    if (method && !master.methods.includes(method)) return false;
    if (supportedMethods && !master.methods.some(offersMethod)) return false;
    if (kind !== "healing") return true;
    if (master.reikiOffer) return matchingReikiOptions(master).length > 0;
    // Legacy remote-support prices do not contain a certificate, report, deadline
    // or verified practitioner role. Never infer an offered variant from preferences.
    if (reikiFormat !== "session" || reikiTime !== "any" ||
      reikiRole !== "any" || reikiReport !== "brief") return false;
    return master.priceOptions.some(option => matchesReikiEuroPrice(master, reikiPrice, option.price));
  });
  const consultationMasters = [...new Set((offers || []).map(offer => offer.practitionerName))].sort();
  const consultationFormats = [...new Set((offers || []).map(offer => offer.deliveryFormat).filter(Boolean))];
  const visibleOffers = (offers || []).filter(offer => {
    if (!matchesConsultationCategory(offer, consultCategory)) return false;
    if (consultMaster && offer.practitionerName !== consultMaster) return false;
    if (consultFormat && offer.deliveryFormat !== consultFormat) return false;
    if (priceFilter === "free") return offer.pricingMode === "free" || (offer.price === 0 && offer.pricingMode !== "contact");
    if (priceFilter === "published") return offer.pricingMode !== "contact" && offer.price !== null && Number.isFinite(offer.price);
    return true;
  });
  const entries = consultations ? visibleOffers : visibleMasters;
  const id = (entry: EnergySupportMaster | PublishedConsultation) => entry.serviceId;
  const selected = entries.find(entry => id(entry) === selectedId) || entries[0] || null;
  const selectedMaster = !consultations ? (selected as EnergySupportMaster | null) : null;
  const selectedOffer = consultations ? (selected as PublishedConsultation | null) : null;
  const index = selected ? entries.findIndex(entry => id(entry) === id(selected)) : 0;
  const select = (itemId: string) => { setSelectedId(itemId); setConsultPhotoIndex(0); setConsultDetailsOpen(false); };
  const step = (delta: number) => {
    if (!entries.length) return;
    select(id(entries[(index + delta + entries.length) % entries.length]));
  };
  const endSwipe = (event: TouchEvent<HTMLElement>) => {
    const origin = touchStart.current; touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!origin || !touch || entries.length < 2) return;
    const dx = touch.clientX - origin.x; const dy = touch.clientY - origin.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
  };
  const label = consultations ? t.consultation : kind === "masters" ? t.masters : t.healing;
  const profileLink = selectedMaster && /^[a-z0-9-]+$/.test(selectedMaster.slug)
    ? "/" + locale + "/masters/" + selectedMaster.slug : "/" + locale + "/masters";
  const matchingPriceOptions = selectedMaster?.priceOptions.filter(option =>
    Number.isFinite(option.price) && option.price > 0 &&
    (kind !== "healing" || matchesReikiEuroPrice(selectedMaster, reikiPrice, option.price))) || [];
  const matchingStructured = selectedMaster?.reikiOffer && kind === "healing"
    ? matchingReikiOptions(selectedMaster) : [];
  const cheapest = [...matchingPriceOptions].sort((a, b) => a.price - b.price)[0];
  const cheapestStructured = [...matchingStructured].sort((a, b) => a.price - b.price)[0];
  const currentPrice = selectedOffer
    ? (selectedOffer.pricingMode === "free" || (selectedOffer.price === 0 && selectedOffer.pricingMode !== "contact")
      ? t.freeOnly
      : selectedOffer.pricingMode !== "contact" && selectedOffer.price !== null
        ? publishedPrice(selectedOffer.price, selectedOffer.currency, locale) : null)
    : cheapestStructured && selectedMaster?.reikiOffer
      ? publishedPrice(cheapestStructured.price, selectedMaster.reikiOffer.currency, locale)
      : cheapest && selectedMaster ? publishedPrice(cheapest.price, selectedMaster.currency, locale) : null;
  const displayPrice = currentPrice || t.quote;
  const c = consultationUi[locale];
  const currentConsultPhoto = selectedOffer?.photos?.[consultPhotoIndex] || (selectedOffer ? consultationCover(selectedOffer) : "");
  const consultationPrice = (offer: PublishedConsultation) =>
    offer.pricingMode === "free" || (offer.price === 0 && offer.pricingMode !== "contact")
      ? t.freeOnly
      : offer.pricingMode !== "contact" && offer.price !== null
        ? publishedPrice(offer.price, offer.currency, locale) || t.quote : t.quote;

  const ready = consultations ? offers !== null : masters !== null;
  const r = reikiUi[locale];
  // Source-backed Academy discovery supplements, but does not create, published
  // practitioner service records. It stays visible even if the directory is down.
  const academyReikiOffers = kind === "healing" && reikiFormat !== "session"
    ? matchReikiPublicOffers(listReikiPublicOffers(locale), {
      format: reikiFormat, focus: reikiFocus, price: reikiPrice,
      certificateRequested: reikiCertificate,
    }) : [];
  const reikiLearningMatches = academyReikiOffers.length > 0;
  const reikiCount = visibleMasters.length + academyReikiOffers.length;
  const reikiLearningPath = academyReikiOffers[0]?.href || "/" + locale + "/academy/reiki";
  const reikiLearningLabel = reikiFormat === "course" ? r.course : r.initiation;
  const reikiLearningIntro = reikiFormat === "course" ? r.courseNote : r.initiationNote;
  const academyPrice = (offer: ReikiPublicOffer) =>
    offer.priceStatus === "free" ? t.freeOnly
      : offer.priceEur !== null ? "€" + offer.priceEur +
        (offer.durationMinutes ? " / " + offer.durationMinutes + " " + r.minutes : "")
        : r.askPrice;
  const desiredTiming = reikiTime === "any" ? r.unconfirmed : r.times[reikiTime] + " (" + r.unconfirmed + ")";
  const matchingMasterPrice = (master: EnergySupportMaster) =>
    master.reikiOffer ? matchReikiVariants(master.reikiOffer, {
      kind: reikiFormat, price: reikiPrice, time: reikiTime,
      report: reikiReport, role: reikiRole, certificate: reikiCertificate,
    }).map(v => ({ price: v.price, duration: v.duration, currency: master.reikiOffer?.currency || master.currency }))
      : master.priceOptions.filter(v => Number.isFinite(v.price) && v.price > 0 &&
        matchesReikiEuroPrice(master, reikiPrice, v.price))
        .map(v => ({ price: v.price, duration: v.duration, currency: master.currency }));
  const filteredRequest = [
    r.report + ": " + r.reports[reikiReport],
    ...(reikiTime === "any" ? [] : [r.time + ": " + r.times[reikiTime]]),
    ...(reikiRole === "any" ? [] : [r.role + ": " + r.roles[reikiRole]]),
  ].join(" · ");
  const resetReikiFilters = () => {
    setReikiFormat("session"); setReikiPrice("all"); setReikiTime("any");
    setReikiReport("brief"); setReikiRole("any"); setReikiCertificate(false);
    setMethod(""); setSelectedId(null); setOrderOpen(false);
  };
  const reikiStage = kind === "healing" ? (
    <section className={styles.reikiStage} data-support-reiki-central data-active-tab={reikiTab}
      data-support-master-hero={selected ? id(selected) : undefined}
      aria-label={r.heading}>
      <div className={styles.reikiStageArt} aria-hidden="true">
        <Image className={styles.reikiStageBackdrop} src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
          alt="" fill unoptimized sizes="(max-width: 640px) 100vw, 900px"/>
      </div>
      <div className={styles.reikiStageShade} aria-hidden="true"/>
      <div className={styles.reikiStageTabs} role="tablist" aria-label={r.heading}>
        {(["main", "filter", "description", "media"] as const).map(tab => (
          <button type="button" key={tab} role="tab" id={"reiki-tab-" + tab}
            aria-selected={reikiTab === tab} aria-controls="reiki-active-panel"
            className={styles.reikiStageTab} data-support-reiki-tab={tab}
            onClick={() => setReikiTab(tab)}>
            {tab === "main" ? <HandHeart size={16} aria-hidden="true"/> :
              tab === "filter" ? <Filter size={16} aria-hidden="true"/> :
              tab === "description" ? <FileText size={16} aria-hidden="true"/> :
              <Headphones size={16} aria-hidden="true"/>}
            <span>{r.tabs[tab]}</span>
          </button>
        ))}
      </div>
      {reikiTab === "filter" && <div className={styles.reikiPhotoIntro} data-support-reiki-photo-intro>
        <span className={styles.reikiPill}><HandHeart size={14} aria-hidden="true"/>{t.healing}</span>
        <strong>{r.heroTitle}</strong>
        <small>{r.photoHint}</small>
      </div>}
      <div id="reiki-active-panel" className={styles.reikiStageContent} role="tabpanel"
        aria-labelledby={"reiki-tab-" + reikiTab} data-support-reiki-panel={reikiTab}>
        {reikiTab === "filter" ? <div className={styles.reikiFilterSheet} data-support-reiki-filter>
          <div className={styles.reikiFilterHeading}>
            <div><h2>{r.heading}</h2><p>{r.intro}</p></div>
            <button type="button" className={styles.reikiReset} onClick={resetReikiFilters}>{r.resetFilters}</button>
          </div>
          <fieldset className={styles.reikiFieldset} data-support-reiki-format>
            <legend>1. {r.format}</legend>
            <div className={styles.reikiOptions} data-cols="three">
              {(["session", "initiation", "course"] as const).map(value =>
                <button type="button" key={value} aria-pressed={reikiFormat === value}
                  onClick={() => { setReikiFormat(value); setReikiRole("any"); setReikiCertificate(false);
                    setMethod(""); setSelectedId(null); setOrderOpen(false); }}>
                  {value === "session" ? <UserRound size={17} aria-hidden="true"/> :
                    value === "initiation" ? <Sparkles size={17} aria-hidden="true"/> :
                    <GraduationCap size={17} aria-hidden="true"/>}
                  <span>{r.formats[value]}</span>
                </button>)}
            </div>
          </fieldset>
          <fieldset className={styles.reikiFieldset} data-support-reiki-price>
            <legend>2. {r.price}</legend>
            <div className={styles.reikiOptions} data-cols="price">
              {PRICE_BANDS.map(value =>
                <button type="button" key={value} aria-pressed={reikiPrice === value}
                  onClick={() => { setReikiPrice(value); setSelectedId(null); setOrderOpen(false); }}>
                  {r.prices[value]}
                </button>)}
            </div>
          </fieldset>
          <fieldset className={styles.reikiFieldset} data-support-reiki-timing>
            <legend>3. {r.time}</legend>
            <div className={styles.reikiOptions} data-cols="three">
              {(["days", "day", "chosen"] as const).map(value =>
                <button type="button" key={value} aria-pressed={reikiTime === value}
                  onClick={() => setReikiTime(value === reikiTime ? "any" : value)}>
                  {value === "days" ? <CalendarDays size={17} aria-hidden="true"/> :
                    value === "day" ? <Zap size={17} aria-hidden="true"/> :
                    <Clock3 size={17} aria-hidden="true"/>}
                  <span>{r.times[value]}</span>
                </button>)}
            </div>
          </fieldset>
          <fieldset className={styles.reikiFieldset} data-support-reiki-report>
            <legend>4. {r.report}</legend>
            <div className={styles.reikiOptions} data-cols="three">
              {(["brief", "text", "voice"] as const).map(value =>
                <button type="button" key={value} aria-pressed={reikiReport === value}
                  onClick={() => setReikiReport(value)}>
                  {value === "voice" ? <Mic size={17} aria-hidden="true"/> : <FileText size={17} aria-hidden="true"/>}
                  <span>{r.reports[value]}</span>
                </button>)}
            </div>
          </fieldset>
          {reikiFormat === "session" ? <fieldset className={styles.reikiFieldset} data-support-reiki-provider>
            <legend>5. {r.role}</legend>
            <div className={styles.reikiOptions} data-cols="two">
              {(["practitioner", "master"] as const).map(value =>
                <button type="button" key={value} aria-pressed={reikiRole === value}
                  onClick={() => setReikiRole(value === reikiRole ? "any" : value)}>
                  {value === "master" ? <ShieldCheck size={17} aria-hidden="true"/> :
                    <UserRound size={17} aria-hidden="true"/>}
                  <span>{r.roles[value]}</span>
                </button>)}
            </div>
          </fieldset> : <label className={styles.reikiCertificate} data-support-reiki-certificate>
            <span><strong>5. {r.certificate}</strong><small>{r.certificateNote}</small></span>
            <input type="checkbox" checked={reikiCertificate}
              onChange={event => setReikiCertificate(event.target.checked)}/>
          </label>}
          <p className={styles.reikiPreferences} role="status">{r.preferences}</p>
          <button type="button" className={styles.reikiApply} data-support-reiki-apply
            onClick={() => setReikiTab("main")}>
            <Filter size={19} aria-hidden="true"/>{r.show}
            <small>{r.count}: {ready || reikiFormat !== "session" ? reikiCount : "…"}</small>
          </button>
        </div> : reikiTab === "description" ? <div className={styles.reikiTabCopy}>
          <span className={styles.reikiPill}>{r.details}</span>
          <h2>{selectedMaster?.name || (reikiFormat === "session" ? r.heading : reikiLearningLabel)}</h2>
          <p>{selectedMaster?.description || selectedMaster?.bio || (reikiFormat === "session" ? t.description : reikiLearningIntro)}</p>
          <p>{r.preferences} {r.notBooked}</p>
          {selectedMaster &&
            <Link href={profileLink} className={styles.reikiInlineLink}>{r.provider}<ArrowRight size={16}/></Link>}
        </div> : reikiTab === "media" ? <div className={styles.reikiTabCopy} data-support-reiki-media>
          <span className={styles.reikiPill}>{r.tabs.media}</span>
          <h2>{selectedMaster?.name || (reikiFormat === "session" ? r.heading : reikiLearningLabel)}</h2>
          {selectedMaster?.presentations?.length ?
            <div className={styles.reikiMediaLinks}>
              {selectedMaster.presentations.map((media, i) =>
                <a key={i} href={media.url} target="_blank" rel="noopener noreferrer"
                  className={styles.reikiInlineLink}>
                  {media.type === "video" ? <PlayCircle size={19}/> : <Headphones size={19}/>}
                  {r.mediaOpen} {media.type === "video" ? "Video" : "Audio"}
                  <ArrowRight size={15}/>
                </a>)}
            </div> : <p>{r.mediaNone}</p>}
          {selectedMaster &&
            <Link href={profileLink} className={styles.reikiInlineLink}>{r.provider}<ArrowRight size={16}/></Link>}
          {reikiFormat !== "session" && !selectedMaster && reikiLearningMatches &&
            <Link href={reikiLearningPath} className={styles.reikiInlineLink}>{r.learn}<ArrowRight size={16}/></Link>}
        </div> : <div className={styles.reikiTabCopy} data-support-reiki-main>
          <span className={styles.reikiPill}><HandHeart size={15}/>{t.healing}</span>
          <h2>{reikiFormat === "session" ? r.heroTitle : selectedMaster?.name || reikiLearningLabel}</h2>
          <p>{reikiFormat === "session"
            ? selectedMaster ? selectedMaster.name + " · " +
              (selectedMaster.description || selectedMaster.bio || r.intro) : r.intro
            : selectedMaster ? selectedMaster.name + " · " +
              (selectedMaster.description || selectedMaster.bio || reikiLearningIntro) : reikiLearningIntro}</p>
          {selectedMaster && <strong className={styles.reikiSelectedPrice}>{displayPrice}</strong>}
          <div className={styles.reikiMainActions}>
            {selectedMaster?.serviceHref && cheapestStructured ?
              <Link className={styles.reikiApply} data-support-reiki-request href={selectedMaster.serviceHref}>
                {r.request}<ArrowRight size={17}/></Link> :
              reikiFormat === "session" && selectedMaster && cheapest ?
              <button type="button" className={styles.reikiApply}
                data-support-reiki-request onClick={() => setOrderOpen(true)}>{r.request}<ArrowRight size={17}/></button> :
              reikiFormat !== "session" && !selectedMaster && reikiLearningMatches ?
                <Link className={styles.reikiApply} href={reikiLearningPath}>{r.learn}<ArrowRight size={17}/></Link> :
                <button type="button" className={styles.reikiApply}
                  onClick={() => setReikiTab("filter")}>{r.choose}<Filter size={17}/></button>}
            <button type="button" className={styles.reikiSecondary}
              onClick={() => setReikiTab("filter")}>{r.tabs.filter}</button>
          </div>
          <small className={styles.reikiCaution}>{r.notBooked}</small>
        </div>}
      </div>
    </section>
  ) : null;

  return (
    <div className={styles.viewer} data-support-master-viewer data-support-directory-kind={kind}>
      {kind === "healing" && <div className={styles.reikiFocusBar} role="group"
        aria-label={t.reikiFocus} data-support-reiki-filters>
        {REIKI_FOCI.map(value => {
          const option = t.reikiOptions[value];
          return <button type="button" key={value} className={styles.reikiFocusButton}
            data-support-reiki-focus={value} aria-pressed={reikiFocus === value}
            aria-label={option.label + " · " + option.method}
            onClick={() => { setReikiFocus(value); setMethod(""); setSelectedId(null); setOrderOpen(false); }}>
            <strong>{option.label}</strong><small>{option.method}</small>
          </button>;
        })}
      </div>}
      {consultations && <section className={styles.consultBrowse} aria-label={c.heading}
        data-support-consultation-categories>
        <div className={styles.consultHeading}>
          <h2>{c.heading}</h2><p>{c.subtitle}</p>
          <Link href={"/" + locale + "/services"} prefetch={false}>{c.all}<ArrowRight size={17} aria-hidden="true"/></Link>
        </div>
        <div className={styles.consultCategoryWrap}>
          <div ref={categoryRailRef} className={styles.consultCategoryRail} role="group"
            aria-label={c.heading}>
            {CONSULTATION_CATEGORIES.map(({ id: category, Icon }) =>
              <button type="button" key={category} className={styles.consultCategory}
                data-support-consultation-category={category}
                aria-pressed={consultCategory === category}
                onClick={() => { setConsultCategory(category); setSelectedId(null);
                  setConsultPhotoIndex(0); setConsultDetailsOpen(false); }}>
                <Icon size={25} aria-hidden="true"/>
                <span>{c.categories[category]}</span>
              </button>)}
          </div>
          <button type="button" className={styles.consultCategoryNext} aria-label={c.showNext}
            onClick={() => categoryRailRef.current?.scrollBy({ left: 250, behavior: "smooth" })}>
            <ChevronRight size={22} aria-hidden="true"/>
          </button>
        </div>
        <div className={styles.consultFilters} data-support-consultation-filters>
          <label className={styles.consultField} data-support-consultation-master>
            <span><UserRound size={15} aria-hidden="true"/>{c.master}</span>
            <select value={consultMaster} aria-label={c.master}
              onChange={event => { setConsultMaster(event.target.value); setSelectedId(null); }}>
              <option value="">{c.allMasters}</option>
              {consultationMasters.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className={styles.consultField} data-support-consultation-format>
            <span><PlayCircle size={15} aria-hidden="true"/>{c.format}</span>
            <select value={consultFormat} aria-label={c.format}
              onChange={event => { setConsultFormat(event.target.value); setSelectedId(null); }}>
              <option value="">{c.allFormats}</option>
              {consultationFormats.map(value => <option key={value} value={value}>
                {consultationFormatName(value, locale)}
              </option>)}
            </select>
          </label>
          <label className={styles.consultField} data-support-offer-price-filter>
            <span><ShoppingCart size={15} aria-hidden="true"/>{c.price}</span>
            <select value={priceFilter} aria-label={c.price}
              onChange={event => { setPriceFilter(event.target.value as typeof priceFilter); setSelectedId(null); }}>
              <option value="all">{t.allPrices}</option>
              <option value="free">{t.freeOnly}</option>
              <option value="published">{t.paidOnly}</option>
            </select>
          </label>
          <button type="button" className={styles.consultReset} aria-label={c.reset} title={c.reset}
            onClick={() => { setConsultCategory("all"); setConsultMaster(""); setConsultFormat("");
              setPriceFilter("all"); setSelectedId(null); setConsultPhotoIndex(0); setConsultDetailsOpen(false); }}>
            <SlidersHorizontal size={22} aria-hidden="true"/>
          </button>
        </div>
      </section>}
      {reikiStage}
      {kind === "healing" && reikiFormat !== "session" && ready && !selectedMaster ? <section className={styles.reikiLearning} data-support-reiki-learning>
        <h3>{reikiLearningLabel}</h3>
        <p>{reikiLearningMatches ? reikiLearningIntro : r.learningNone}</p>
        {reikiLearningMatches && <Link href={reikiLearningPath} prefetch={false}>{r.learn}<ArrowRight size={18}/></Link>}
      </section> : !ready ? <div className={styles.status} role={failed ? "alert" : "status"}>
        <p>{failed ? t.unavailable : t.loading}</p>
        {failed && <button type="button" onClick={() => setAttempt(n => n + 1)}>{t.retry}</button>}
        <Link href={"/" + locale + "/masters"}>{t.exploreMasters}<ArrowRight size={16} aria-hidden="true"/></Link>
      </div> : !selected ? <div className={styles.status} role="status">
        <p>{kind === "healing" && reikiPrice !== "all" ? r.learningNone :
          kind === "healing" ? t.reikiUnavailable : t.empty}</p>
        {kind === "healing" && <p className={styles.unavailableMethod} data-support-reiki-unavailable>
          {t.reikiOptions[reikiFocus].label} · {t.reikiOptions[reikiFocus].method}
        </p>}
        <button type="button" onClick={() => {
          setMethod(""); setPriceFilter("all"); setSelectedId(null);
          if (kind === "healing") { setReikiFocus("love"); resetReikiFilters(); }
        }}>{kind === "healing" ? t.reikiSeeAvailable : t.reset}</button>
        <Link href={"/" + locale + (consultations ? "/services" : "/masters")}>{consultations ? t.exploreServices : t.exploreMasters}</Link>
      </div> : <>
        {kind !== "healing" && <section className={styles.hero} data-support-master-hero={id(selected)}
          data-support-consultation-hero={consultations ? "true" : undefined}
          id={consultations ? "support-consultation-featured" : undefined}
          aria-label={selectedMaster?.name || selectedOffer?.title}
          onTouchStart={event => { const touch=event.touches[0]; if(touch) touchStart.current={x:touch.clientX,y:touch.clientY}; }}
          onTouchEnd={endSwipe}>
          {selectedOffer && <Image src={currentConsultPhoto} alt="" fill unoptimized
            className={styles.consultPhoto} sizes="(max-width: 640px) 100vw, 900px"/>}
          {selectedMaster?.photo && <div className={styles.photoStage} aria-hidden="true">
            <Image src={selectedMaster.photo} alt="" fill unoptimized
              sizes="(max-width: 640px) 65vw, 480px" className={styles.photo}/>
          </div>}
          <div className={styles.shade} aria-hidden="true"/>
          {!selectedMaster && !consultations && <div className={styles.symbolArt} aria-hidden="true">
            {consultations ? <TestTube2 size={125} strokeWidth={0.9}/> : <UserRound size={120} strokeWidth={0.9}/>}
          </div>}
          {!consultations && <div className={styles.filters} role="group" aria-label={label}>
            <span className={styles.mode} data-support-master-mode>
              <HandHeart size={17} aria-hidden="true"/>{label}
            </span>
            <label className={styles.filter} data-support-master-method-filter>
              <strong>{t.method}</strong>
              <small>{method || t.allMethods}</small>
              <select value={method} aria-label={t.method} onChange={e => { setMethod(e.target.value); setSelectedId(null); }}>
                <option value="">{t.allMethods}</option>
                {methods.map(value => <option key={value} value={value}>{value}</option>)}
              </select><ChevronDown size={14} aria-hidden="true"/>
            </label>
            <span className={styles.staticFilter}><strong>{t.online}</strong>
              <small>{selectedMaster?.title || t.online}</small></span>
          </div>}
          <div className={styles.copy}>
            <span className={styles.eyebrow}><ShieldCheck size={16} aria-hidden="true"/>
              {consultations ? c.published : t.verified}</span>
            <h2>{selectedOffer?.title || selectedMaster?.name}</h2>
            <p>{selectedOffer?.description || selectedMaster?.description || selectedMaster?.bio || t.description}</p>
            <span className={styles.price}>{displayPrice}</span>
            {selectedOffer && <span className={styles.consultProvider}>{selectedOffer.practitionerName}
              {" · "}{consultationFormatName(selectedOffer.deliveryFormat, locale)}</span>}
          </div>
          {selectedOffer && !!selectedOffer.presentations?.length &&
            <a className={styles.consultMedia} href={selectedOffer.presentations[0].url}
              target="_blank" rel="noopener noreferrer" aria-label={c.media}>
              <PlayCircle size={25} aria-hidden="true"/>
            </a>}
          {selectedOffer && selectedOffer.photos?.length > 1 && <div className={styles.consultPreviews}
            role="group" aria-label={c.photos}>
            {selectedOffer.photos.slice(0,4).map((photo, photoIndex) =>
              <button key={photo} type="button" aria-pressed={photoIndex === consultPhotoIndex}
                onClick={() => setConsultPhotoIndex(photoIndex)}>
                <Image src={photo} alt="" fill unoptimized sizes="70px"/>
                <span className="sr-only">{photoIndex+1}</span>
              </button>)}
          </div>}
          {entries.length > 1 && <div className={styles.arrows} role="group" aria-label={consultations ? t.galleryOffers : t.galleryMasters}>
            <button type="button" onClick={() => step(-1)} aria-label={t.prev} data-support-master-prev><ChevronLeft size={22}/></button>
            <button type="button" onClick={() => step(1)} aria-label={t.next} data-support-master-next><ChevronRight size={22}/></button>
          </div>}
          <div className={styles.actions}>
            {selectedOffer ? <Link className={styles.primary} href={selectedOffer.href} prefetch={false}
              data-support-offer-request>
              <ShoppingCart size={21} aria-hidden="true"/>{c.order}<ArrowRight size={21} aria-hidden="true"/>
            </Link> : selectedMaster && cheapest ? <button type="button" className={styles.primary}
              data-support-master-request onClick={() => setOrderOpen(true)}>
              <HandHeart size={21} aria-hidden="true"/>{t.request}<ArrowRight size={21} aria-hidden="true"/>
            </button> : <Link href={profileLink} className={styles.primary}>{t.details}<ArrowRight size={21}/></Link>}
            {selectedOffer && <button type="button" className={styles.secondary}
              aria-controls="support-consultation-details" aria-expanded={consultDetailsOpen}
              onClick={() => setConsultDetailsOpen(open => !open)}>{c.details}</button>}
            {selectedMaster && <Link className={styles.secondary} href={profileLink}>{t.details}</Link>}
          </div>
        </section>}
        {selectedOffer && consultDetailsOpen && <div id="support-consultation-details"
          className={styles.consultDetails} data-support-consultation-details>
          <strong>{selectedOffer.title}</strong>
          <p>{selectedOffer.description || t.consultNote}</p>
          <p>{selectedOffer.practitionerName} · {consultationFormatName(selectedOffer.deliveryFormat, locale)}</p>
          <small>{c.notice}</small>
        </div>}
        <section className={styles.more} aria-label={consultations ? t.galleryOffers : t.galleryMasters}>
          <div className={styles.heading}>
            <h3>{consultations ? t.galleryOffers : t.galleryMasters}</h3>
            <Link href={"/" + locale + (consultations ? "/services" : "/masters")} prefetch={false}>
              {consultations ? t.exploreServices : t.exploreMasters}<ArrowRight size={17} aria-hidden="true"/>
            </Link>
          </div>
          <div className={consultations ? styles.consultRail : styles.rail} role="group" data-support-master-rail
            data-single={kind === "healing" && entries.length === 1 ? "true" : "false"}>
            {entries.map(entry => {
              const master = !consultations ? entry as EnergySupportMaster : null;
              const offer = consultations ? entry as PublishedConsultation : null;
              return <button type="button" key={id(entry)}
                data-support-master-thumb={id(entry)}
                className={consultations ? styles.consultCard : styles.thumb}
                aria-pressed={id(entry) === id(selected)}
                aria-label={offer?.title || master?.name}
                onClick={() => {
                  select(id(entry));
                  if (consultations) document.getElementById("support-consultation-featured")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}>
                {offer ? <>
                  <span className={styles.consultCardImage}>
                    <Image src={consultationCover(offer)} alt="" fill unoptimized sizes="210px"/>
                  </span>
                  <span className={styles.consultCardCopy}>
                    <strong>{offer.title}</strong>
                    <small>{offer.description}</small>
                    <b>{consultationPrice(offer)}</b>
                  </span>
                </> : <>
                  {master?.photo ? <Image src={master.photo} alt="" fill unoptimized sizes="180px"/> :
                    <span className={styles.thumbFallback} aria-hidden="true"><Sparkles size={38}/></span>}
                  <span className={styles.thumbTitle}>{master?.name}</span>
                </>}
              </button>;
            })}
          </div>
          <p className={styles.note}>{consultations ? t.consultNote : t.description}</p>
          {consultations && <Link className={styles.tests} href={"/" + locale + "/personality-profiles"} prefetch={false}>
            <TestTube2 size={17} aria-hidden="true"/>{t.tests}<ArrowRight size={17} aria-hidden="true"/>
          </Link>}
        </section>
      </>}
      <dialog ref={dialogRef} className={styles.dialog}
        aria-labelledby="support-master-order-title" onClose={() => setOrderOpen(false)}>
        <div className={styles.dialogTop}>
          <h2 id="support-master-order-title">{t.requestTitle}</h2>
          <button type="button" onClick={() => setOrderOpen(false)} aria-label={t.close}><X size={22}/></button>
        </div>
        {orderOpen && selectedMaster && <RemoteEnergySupportBooking key={selectedMaster.serviceId}
          locale={locale} masters={[kind === "healing"
            ? {...selectedMaster, priceOptions: matchingPriceOptions} : selectedMaster]}
          preferredPractitioner={selectedMaster.slug}
          mode="inline" selectedKind="energy" initialGoal=""
          initialIntention={kind === "healing" ? filteredRequest : ""} />}
      </dialog>
    </div>
  );
}
