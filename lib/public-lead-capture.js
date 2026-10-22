import { whatsappEnquiryUrl } from "./whatsapp-enquiry.js";

// Conversion surfaces are public only. This is a deliberately conservative router:
// client results, accounts, medical records, tests, and administration never receive lead marketing.
const LOCALE = /^\/(en|ru|es)(?=\/|$)/;
const PRIVATE = /^\/(?:admin|api|app|auth|login|signup|register|account|settings|profile|dashboard|prescriptions|document-preview|practitioner|private|checkout|payments|pwa)(?:\/|$)/;
const LOCAL_PRIVATE = /^\/(?:client|app|admin|auth|login|signup|account|settings|profile|dashboard|prescriptions|document-preview|practitioner|private|tests|test-results|reports|checkout|payments)(?:\/|$)/;

export function classifyPublicLead(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/") || pathname.includes("//")) return null;
  if (PRIVATE.test(pathname)) return null;
  const match = pathname.match(LOCALE);
  // Legacy /books/:id readers are Russian by default; /books index is English-first.
  const locale = match ? match[1] : /^\/books\/[^/]+/.test(pathname) ? "ru" : "en";
  const relative = match ? pathname.slice(match[0].length) || "/" : pathname;
  // This dedicated six-stage landing already ends with one complete initiation form.
  // Do not append the generic sitewide training enquiry after it.
  if (/^\/academy\/reiki\/yggdrasil\/free-initiation\/?$/.test(relative)) return null;
  if (LOCAL_PRIVATE.test(relative) || relative === "/" || relative === "") return null;
  if (/^\/(?:privacy|terms|cookie-policy|legal|contact|about)(?:\/|$)/.test(relative)) return null;
  // These landings already end in the same consented lead-capture component.
  if (/^\/services\/(?:free-situation-review|dao-health-profile)\/?$/.test(relative)) return null;
  if (/^\/(?:academy|courses|training)(?:\/|$)/.test(relative)) return { locale, kind: "training" };
  if (/^\/(?:library|books|book|homeopathy|wu-xing|remedies|articles|stories|guides)(?:\/|$)/.test(relative)) return { locale, kind: "reading" };
  if (/^\/masters(?:\/|$)/.test(relative)) return { locale, kind: /^\/masters\/andy-litvinov(?:\/|$)/.test(relative) ? "personal" : "network" };
  if (/^\/services\/[a-z0-9-]+\/[a-z0-9-]+(?:\/|$)/.test(relative)) return { locale, kind: /^\/services\/andy-litvinov\//.test(relative) ? "personal" : "network" };
  if (/^\/(?:services|master)(?:\/|$)/.test(relative)) return { locale, kind: "personal" };
  return null;
}

const courseNames = {
  "tantra-reiki": "Tantra Reiki",
  "kundalini-reiki": "Kundalini Reiki",
  "yggdrasil": "DAO Reiki Yggdrasil",
  "temple-studies": "Temple Studies",
  "mysteries": "Mysteries & Ancient Traditions",
  "symbolic": "Runes, Elements & Symbolic Arts",
  "applied": "Applied Archetypal Practice",
  "reiki": "Reiki",
  "academy": "Academy training",
  "history": "Academy",
  "archive": "Academy archive",
  "videos": "Academy videos",
  "school": "Academy school",
};
export function courseTopicForPath(pathname) {
  const segments = (pathname || "").split("/").filter(Boolean);
  for (const name of ["kundalini-reiki", "tantra-reiki", "yggdrasil", "temple-studies", "mysteries", "symbolic", "applied"]) {
    if (segments.includes(name)) return courseNames[name];
  }
  const afterAcademy = segments.indexOf("academy");
  const course = afterAcademy >= 0 ? segments[afterAcademy + 1] : "";
  return courseNames[course] || "Holistic House Academy";
}

export function trainingEnquiryUrl(locale, pathname) {
  const course = courseTopicForPath(pathname);
  const request = locale === "ru"
    ? "Хочу узнать программу, подходящий уровень, формат, даты и актуальную стоимость обучения. Подскажите, доступна ли запись."
    : locale === "es"
      ? "Quisiera conocer el programa, nivel de entrada, modalidad, fechas y precio actual. ¿Hay plazas disponibles?"
      : "I would like the course programme, entry level, learning format, dates and current tuition, and to know whether enrolment is available.";
  return whatsappEnquiryUrl({
    locale,
    service: course,
    request,
    option: locale === "ru" ? "Узнать об обучении" : locale === "es" ? "Consultar formación" : "Enquire about training",
    pagePath: pathname,
  });
}
