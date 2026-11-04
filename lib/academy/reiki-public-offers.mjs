/**
 * Public Academy entry points for the existing Reiki practice, initiation and
 * learning flows. These are NOT new practitioner service rows or bookings.
 * Values are sourced only from already published Academy captures, and personal
 * initiation fees from the one canonical Reiki level-price table.
 */
import { REIKI_LEVEL_PRICES } from "./reiki-level-pricing.js";
import { matchesReikiEuroPrice } from "../practitioners/reiki-offer.mjs";

const names = {
  en: {
    tantraInitiation: ["Tantra Reiki — Level 1 initiation", "Free introductory request or a personal first-level initiation. Choose the option on the existing programme page."],
    yggInitiation: ["Reiki Yggdrasil — Level 1 initiation", "Free introductory request or guided personal initiation. Dates and method are confirmed separately."],
    kundaliniInitiation: ["Kundalini Reiki — introduction and initiation", "Free introductory request or personal Level 1 enquiry through the existing course form."],
    practitioner: ["Reiki Practitioner — free programme", "Five guided introductory lessons exploring Tantra, Kundalini and Yggdrasil Reiki."],
    tantraCourse: ["Tantra Reiki — learning programme", "Explore original first-level learning materials, practices and available guidance."],
    kundaliniCourse: ["Kundalini Reiki — three levels", "Original training pathway and materials for levels 1–3; ask about personal teaching."],
    yggCourse: ["Reiki Yggdrasil — basic training", "Explore the existing basic course and the longer Yggdrasil learning path."],
    free: "Free introduction", personal: "Personal Level 1", programme: "Training fee on request",
  },
  ru: {
    tantraInitiation: ["Тантра Рейки — инициация 1-й ступени", "Бесплатный вводный запрос или личная инициация первой ступени через существующую форму."],
    yggInitiation: ["Рейки Иггдрасиль — инициация 1-й ступени", "Бесплатный вводный запрос или личная инициация с подтверждением времени и условий."],
    kundaliniInitiation: ["Кундалини Рейки — вводная инициация", "Бесплатная вводная ступень или запрос личной инициации через форму курса."],
    practitioner: ["Reiki Practitioner — бесплатная программа", "Пять вводных уроков: Тантра Рейки, Кундалини Рейки и Рейки Иггдрасиль."],
    tantraCourse: ["Тантра Рейки — программа обучения", "Оригинальные материалы первой ступени, практики и варианты личного сопровождения."],
    kundaliniCourse: ["Кундалини Рейки — обучение 3 ступеням", "Программа трёх ступеней и оригинальная методичка. Личное обучение — по запросу."],
    yggCourse: ["Рейки Иггдрасиль — базовый курс", "Оригинальная базовая программа и продолжение обучения Рейки Иггдрасиль."],
    free: "Вводная бесплатно", personal: "Личная 1-я ступень", programme: "Стоимость обучения уточняется",
  },
  es: {
    tantraInitiation: ["Tantra Reiki — iniciación Nivel 1", "Introducción gratuita o iniciación personal, mediante el formulario existente."],
    yggInitiation: ["Reiki Yggdrasil — iniciación Nivel 1", "Introducción gratuita o iniciación personal; horario y condiciones se confirman aparte."],
    kundaliniInitiation: ["Kundalini Reiki — introducción e iniciación", "Introducción gratuita o consulta de iniciación personal mediante el curso."],
    practitioner: ["Reiki Practitioner — programa gratuito", "Cinco lecciones introductorias sobre Tantra, Kundalini y Yggdrasil Reiki."],
    tantraCourse: ["Tantra Reiki — programa de formación", "Materiales originales de nivel inicial y opciones de acompañamiento."],
    kundaliniCourse: ["Kundalini Reiki — tres niveles", "Camino de formación de tres niveles con manual original; clases personales por consulta."],
    yggCourse: ["Reiki Yggdrasil — curso básico", "Curso básico existente y camino de aprendizaje Reiki Yggdrasil."],
    free: "Introducción gratuita", personal: "Nivel 1 personal", programme: "Precio de formación a consultar",
  },
};

const option = (id, price, durationMinutes, label) =>
  ({ id, amountEur: price, durationMinutes, label });

/** Academy-backed programmes and initiation choices, never synthetic provider availability. */
export function listPublicReikiAcademyOffers(locale = "en") {
  const lang = ["en", "ru", "es"].includes(locale) ? locale : "en";
  const c = names[lang];
  const root = "/" + lang + "/academy/reiki/";
  const ownPrice = REIKI_LEVEL_PRICES;
  const make = (id, kind, copy, method, href, options) => ({
    id, kind, title: copy[0], description: copy[1], method,
    href, priceOptions: options, source: "public_academy",
    // These attributes are deliberately unverified for all Academy entries.
    deliveryTiming: null, reportMode: null, certificateAvailable: null,
  });
  return [
    make("tantra-initiation", "initiation", c.tantraInitiation, "Tantra Reiki",
      root + "tantra-reiki#tantra-next-steps",
      [option("intro", 0, null, c.free),
        option("personal", ownPrice.tantra.amountEur, ownPrice.tantra.durationMinutes, c.personal)]),
    make("yggdrasil-initiation", "initiation", c.yggInitiation, "Reiki Yggdrasil",
      root + "yggdrasil#reiki-free-level-one",
      [option("intro", 0, null, c.free),
        option("personal", ownPrice.yggdrasil.amountEur, ownPrice.yggdrasil.durationMinutes, c.personal)]),
    make("kundalini-initiation", "initiation", c.kundaliniInitiation, "Kundalini Reiki",
      root + "kundalini-reiki#kundalini-enquire",
      [option("intro", 0, null, c.free), option("personal", null, null, c.personal)]),
    make("reiki-practitioner-course", "course", c.practitioner, "Reiki Practitioner",
      root + "free-practitioner-course", [option("free-course", 0, null, c.free)]),
    make("tantra-reiki-course", "course", c.tantraCourse, "Tantra Reiki",
      root + "tantra-reiki", [option("programme", null, null, c.programme)]),
    make("kundalini-reiki-course", "course", c.kundaliniCourse, "Kundalini Reiki",
      root + "kundalini-reiki", [option("programme", null, null, c.programme)]),
    make("yggdrasil-reiki-course", "course", c.yggCourse, "Reiki Yggdrasil",
      root + "yggdrasil/basic-course", [option("programme", null, null, c.programme)]),
  ];
}

/** Hard-filter only confirmed Academy fees; unknown tuition remains visible under All. */
export function filterPublicReikiAcademyOffers(locale, {kind, price = "all"} = {}) {
  return listPublicReikiAcademyOffers(locale)
    .filter(entry => !kind || entry.kind === kind)
    .map(entry => ({...entry, priceOptions: entry.priceOptions.filter(variant =>
      price === "all" || matchesReikiEuroPrice("EUR", price, variant.amountEur))}))
    .filter(entry => entry.priceOptions.length > 0);
}
