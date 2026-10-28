import { REIKI_FREE_COURSE_PATH } from "@/lib/academy/reiki-free-course";
import { listPublicReikiAcademyOffers } from "@/lib/academy/reiki-public-offers.mjs";
import { academyDisplayTitle, findAcademyRecord } from "@/data/academy/catalog";
import type { PublicLocale } from "@/lib/public-locales";
import type { LearningCatalogItem, LearningDirection } from "@/components/holistic-support-learning-catalog";
import type { SupportMobileCourse } from "@/components/holistic-support-mobile";

// Public published course snapshots only. Drafts, assets, clients, notes and
// private practitioner profile fields must never reach a learning page.
export type PublishedLearningCourse = {
  id?: string;
  slug?: string;
  practitionerName?: string;
  course?: { title?: string; description?: string; locale?: string; slides?: unknown[] };
};

const text = {
  en: {
    practitioner: "Reiki Practitioner · Free learning path",
    practitionerDescription: "Five source-backed lessons: Sun Flight, Tantra Reiki, Kundalini Reiki, Reiki Yggdrasil and preparation for personal initiation. The lessons are free; a personal initiation needs separate agreement.",
    tantraIntro: "Tantra Reiki · Level 1 introduction",
    tantraIntroDescription: "Free introductory study materials. A personal initiation is arranged separately.",
    yggdrasilIntro: "Reiki Yggdrasil · Level 1 introduction",
    yggdrasilIntroDescription: "Explore the first level for free. This is not an initiation booking.",
    yggdrasil: "Tao Reiki Yggdrasil",
    yggdrasilDescription: "A preserved multi-level study pathway; current pricing and enrollment must be confirmed.",
    tantra: "Tantra Reiki · full learning path",
    tantraDescription: "Nine-level school program; check current enrollment and pricing.",
    kundalini: "Kundalini Reiki · full learning path",
    kundaliniDescription: "Three-level program and preparatory materials; check current enrollment and pricing.",
    temple: "Temple Studies · seven-stage program",
    templeDescription: "An existing study path through ancient mysteries, symbols and archetypal practices. Check current enrollment before committing.",
    egypt: "Egyptian Priesthood · Osiris",
    egyptDescription: "Seven preserved Osiris lessons with guided reflection in the free educational course.",
    mystery: "Preserved original Russian-language course recordings; historical enrollment and prices have not been verified.",
    archive: "Historical Academy program. Source retained; enrollment and current price unconfirmed.",
  },
  ru: {
    practitioner: "Практик Рейки · бесплатная программа",
    practitionerDescription: "Пять уроков: Солнце, Тантра Рейки, Кундалини Рейки, Иггдрасиль и подготовка к личной инициации. Уроки бесплатные; личная инициация согласовывается отдельно.",
    tantraIntro: "Тантра Рейки · введение в 1-ю ступень",
    tantraIntroDescription: "Бесплатные вводные учебные материалы. Личная инициация — отдельно, по согласованию.",
    yggdrasilIntro: "Рейки Иггдрасиль · введение в 1-ю ступень",
    yggdrasilIntroDescription: "Бесплатные материалы первой ступени. Это не запись на личную инициацию.",
    yggdrasil: "Дао Рейки Иггдрасиль",
    yggdrasilDescription: "Существующая многоступенчатая программа обучения. Актуальные стоимость и набор необходимо уточнить.",
    tantra: "Тантра Рейки · полная программа",
    tantraDescription: "Девятиступенчатая программа школы. Набор и стоимость уточняются.",
    kundalini: "Кундалини Рейки · полная программа",
    kundaliniDescription: "Трёхступенчатая программа и подготовительные материалы. Набор и стоимость уточняются.",
    temple: "Temple Studies · 7 этапов обучения",
    templeDescription: "Существующая учебная программа о мистериях, символах и архетипических практиках. Актуальный набор уточняется.",
    egypt: "Египетское жречество · Осирис",
    egyptDescription: "Семь сохранённых уроков Осириса с рефлексией в бесплатной учебной программе.",
    mystery: "Оригинальные видеоуроки на русском из сохранённого архива. Набор и исторические цены не подтверждены.",
    archive: "Историческая программа Академии: материалы сохранены, актуальный набор и цены не подтверждены.",
  },
  es: {
    practitioner: "Practicante de Reiki · programa gratuito",
    practitionerDescription: "Cinco lecciones: Vuelo al Sol, Tantra Reiki, Kundalini Reiki, Yggdrasil y preparación para la iniciación personal. Las lecciones son gratuitas; la iniciación se acuerda por separado.",
    tantraIntro: "Tantra Reiki · introducción al nivel 1",
    tantraIntroDescription: "Materiales introductorios gratuitos. La iniciación personal se acuerda por separado.",
    yggdrasilIntro: "Reiki Yggdrasil · introducción al nivel 1",
    yggdrasilIntroDescription: "Materiales del primer nivel gratis. No es una reserva para la iniciación.",
    yggdrasil: "Tao Reiki Yggdrasil",
    yggdrasilDescription: "Ruta formativa de varios niveles. Es necesario confirmar precios e inscripción.",
    tantra: "Tantra Reiki · programa completo",
    tantraDescription: "Programa de nueve niveles; confirma el precio y la inscripción.",
    kundalini: "Kundalini Reiki · programa completo",
    kundaliniDescription: "Programa de tres niveles con materiales preparatorios. Precio e inscripción por confirmar.",
    temple: "Temple Studies · programa de siete etapas",
    templeDescription: "Ruta existente sobre misterios, símbolos y prácticas arquetípicas. Consulta la inscripción actual.",
    egypt: "Sacerdocio egipcio · Osiris",
    egyptDescription: "Siete lecciones originales de Osiris y reflexiones en un curso educativo gratuito.",
    mystery: "Vídeolecciones originales en ruso del archivo. Inscripción y precios no confirmados.",
    archive: "Programa histórico de la Academia; la inscripción y el precio actuales no están confirmados.",
  },
} as const;

function topicOfTitle(direction: LearningDirection, value: string) {
  const s = value.toLocaleLowerCase();
  if (direction === "reiki") {
    if (/usu[ií]|усуи/.test(s)) return "usui";
    if (/tantra|тантра/.test(s)) return "tantra";
    if (/kundalini|кундалин/.test(s)) return "kundalini";
    if (/yggdrasil|иггдрас|йггдрас/.test(s)) return "yggdrasil";
  }
  if (direction === "temple") {
    if (/egypt|егип|egipt/.test(s)) return "egypt";
    if (/gree|грец|греч|grec|hellen|эллин/.test(s)) return "greece";
    if (/maya|майя|aztec|ацтек/.test(s)) return "maya";
  }
  if (direction === "magic") {
    if (/rune|рун|futhark|футарк/.test(s)) return "runes";
    if (/tarot|таро|arcana|аркан/.test(s)) return "tarot";
    if (/magia|magic|маг|ritual|ритуал|стихи|element/.test(s)) return "rituals";
  }
  return "other";
}
function classifyCourse(title: string, description: string): LearningDirection | null {
  const s = (title + " " + description).toLocaleLowerCase();
  if (/reiki|рейки|kundalini|кундалин|иггдрас|yggdrasil/.test(s)) return "reiki";
  if (/temple|храм|mysteries|мистер|егип|egypt|грец|gree|maya|майя|aztec|ацтек/.test(s)) return "temple";
  if (/rune|рун|tarot|таро|arcana|аркан|магия|magic|magia|ritual|ритуал/.test(s)) return "magic";
  return null;
}

export function buildSupportLearningCatalog(locale: PublicLocale,
  mysteries: SupportMobileCourse[], published: PublishedLearningCourse[]): LearningCatalogItem[] {
  const t = text[locale];
  const andrey = locale === "ru" ? "Андрей Литвинов" : "Andrey Litvinov";
  const items: LearningCatalogItem[] = [
    { id: "reiki-practitioner", direction: "reiki", topic: "other",
      title: t.practitioner, description: t.practitionerDescription,
      href: REIKI_FREE_COURSE_PATH, image: "/academy/reiki-yggdrasil/source/program-overview.jpg",
      teacher: andrey, language: "en", kind: "course", cost: "free", lessons: 5 },
    { id: "reiki-tantra-intro", direction: "reiki", topic: "tantra",
      title: t.tantraIntro, description: t.tantraIntroDescription,
      href: "/" + locale + "/academy/reiki/tantra-reiki/free-initiation",
      image: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
      teacher: andrey, kind: "course", cost: "free" },
    { id: "reiki-yggdrasil-intro", direction: "reiki", topic: "yggdrasil",
      title: t.yggdrasilIntro, description: t.yggdrasilIntroDescription,
      href: "/" + locale + "/academy/reiki/yggdrasil/free-initiation",
      image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
      teacher: andrey, kind: "course", cost: "free" },
    { id: "reiki-yggdrasil-full", direction: "reiki", topic: "yggdrasil",
      title: t.yggdrasil, description: t.yggdrasilDescription,
      href: "/" + locale + "/academy/reiki/yggdrasil",
      image: "/academy/reiki-yggdrasil/source/basic-program.jpg",
      teacher: andrey, kind: "program", cost: "ask" },
    { id: "reiki-tantra-full", direction: "reiki", topic: "tantra",
      title: t.tantra, description: t.tantraDescription,
      href: "/" + locale + "/academy/reiki/tantra-reiki",
      image: "/images/holistic-house/tantra-reiki-yin-yang-cover.svg",
      teacher: andrey, kind: "program", cost: "ask" },
    { id: "reiki-kundalini-full", direction: "reiki", topic: "kundalini",
      title: t.kundalini, description: t.kundaliniDescription,
      href: "/" + locale + "/academy/reiki/kundalini-reiki",
      image: "/academy/kundalini-reiki/kundalini-manual-level-2.jpg",
      teacher: andrey, kind: "program", cost: "ask" },
    { id: "temple-studies", direction: "temple", topic: "other",
      title: t.temple, description: t.templeDescription,
      href: "/" + locale + "/academy/temple-studies",
      image: "/academy/reiki-yggdrasil/source/temple-studies.png",
      kind: "program", cost: "ask" },
  ];
  if (locale === "ru") items.push({
    id: "egypt-osiris-free", direction: "temple", topic: "egypt",
    title: t.egypt, description: t.egyptDescription,
    href: "/ru/academy/egyptian-priesthood/learn",
    image: "/academy/reiki-yggdrasil/source/temple-studies.png",
    language: "ru", kind: "course", cost: "free", lessons: 7,
  });
  // Reuse already published canonical personal Level-1 initiation pricing.
  // The FREE introduction is not the paid personal appointment. Do not
  // invent payment success, provider schedule or course tuition.
  for (const offer of listPublicReikiAcademyOffers(locale)) {
    if (offer.kind !== "initiation") continue;
    const personal = offer.priceOptions.find(option => option.id === "personal");
    if (!personal || typeof personal.amountEur !== "number" || personal.amountEur <= 0) continue;
    const topic = topicOfTitle("reiki", offer.method);
    items.push({
      id: "personal-" + offer.id, direction: "reiki", topic,
      title: offer.title + " · " + personal.label, description: offer.description,
      href: offer.href, teacher: andrey, kind: "initiation",
      cost: "priced", price: { amount: personal.amountEur, currency: "EUR" },
    });
  }
  for (const course of mysteries) items.push({
    id: "mystery-" + course.id, direction: "temple",
    topic: course.id === "greek" ? "greece" : course.id,
    title: course.title, description: t.mystery, href: course.href,
    image: course.poster, language: "ru", kind: "video", cost: "archive",
    lessons: course.videoCount,
  });
  // All historical records below resolve through the canonical Academy
  // manifest and routeKey. No copied curriculum, media, enrollment or price.
  const archive: { logicalId: string; direction: LearningDirection; topic: string }[] = [
    { logicalId: "symbolic/scandinavian-mysteries", direction: "magic", topic: "runes" },
    { logicalId: "symbolic/tarot/major-arcana-mysteries", direction: "magic", topic: "tarot" },
    { logicalId: "elements/elemental-magic", direction: "magic", topic: "rituals" },
    { logicalId: "runes/northern-runes", direction: "magic", topic: "runes" },
    { logicalId: "mysteries/zoroastrism/eastern-magic", direction: "magic", topic: "rituals" },
  ];
  for (const entry of archive) {
    const record = findAcademyRecord(entry.logicalId, "ru");
    if (!record || record.sourceLocale !== "ru" || record.status === "needs_review") continue;
    items.push({
      id: "archive-" + entry.logicalId, direction: entry.direction, topic: entry.topic,
      title: academyDisplayTitle(record, locale), description: t.archive,
      href: "/ru/academy/" + record.routeKey,
      image: entry.topic === "tarot" ? "/academy/reiki-yggdrasil/source/western-tradition.png" :
        "/academy/reiki-yggdrasil/source/advanced-runes.png",
      language: "ru", kind: "program", cost: "archive",
    });
  }
  // The existing repository returns published courses of approved, active
  // practitioners. It does not have a trusted public price field: never mark
  // these as paid/free or infer a tuition amount from arbitrary description.
  for (const entry of published) {
    if (!entry.course || typeof entry.course.title !== "string" ||
        typeof entry.slug !== "string" || !/^[a-z0-9][a-z0-9-]{2,119}$/.test(entry.slug)) continue;
    const description = typeof entry.course.description === "string" ? entry.course.description : "";
    const direction = classifyCourse(entry.course.title, description);
    if (!direction) continue;
    const language = entry.course.locale === "en" || entry.course.locale === "ru" ||
      entry.course.locale === "es" ? entry.course.locale : undefined;
    if (!language) continue;
    items.push({
      id: "master-" + (entry.id ?? entry.slug), direction,
      topic: topicOfTitle(direction, entry.course.title + " " + description),
      title: entry.course.title, description,
      href: "/" + language + "/courses/masters/" + entry.slug,
      teacher: typeof entry.practitionerName === "string" && entry.practitionerName.trim() ?
        entry.practitionerName.trim() : undefined,
      language, kind: "course", cost: "ask", lessons: entry.course.slides?.length,
    });
  }
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
