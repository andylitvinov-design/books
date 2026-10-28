// Shared, explainable editorial relevance for existing published offers and
// source-verified private questionnaire summaries. Not a medical or outcome score.
// Never log, persist, transmit, or attach private values to destination URLs.
import { PROFILE_RESEARCH_AXES } from "../profile/profile-scale-selection.js";

export const AXIS_REFS = Object.freeze(
  Object.fromEntries(Object.entries(PROFILE_RESEARCH_AXES).flatMap(([topic, axes]) =>
    axes.map(axis => [topic + "::" + axis.id, Object.freeze({
      topic, id: axis.id, label: axis.label, sourceAxis: axis.sourceAxis,
    })]))),
);
export const LIFE_AREAS = Object.freeze({
  wellbeing: ["emotions", "recovery", "body"],
  relationships: ["connection"],
  work: ["work", "money"],
  identity: ["traits", "support", "meaning", "goal"],
});
const SOURCE_REF = Object.freeze({
  stress: "emotions::stress", anxiety: "emotions::anxiety",
  mood: "emotions::mood", emotional_regulation: "emotions::regulation",
  sleep: "recovery::sleep", energy: "recovery::energy",
  embodiment: "body::body_awareness", relationships: "connection::social_connection",
  intimacy: "connection::intimacy", boundaries: "connection::boundaries",
  sexual_wellbeing: "connection::sexual_wellbeing",
  clarity: "work::clarity", focus: "work::focus",
  functioning: "work::functioning", resource: "support::resources",
  self_support: "support::self_support", meaning: "meaning::meaning",
});
// Exact dimension overrides must precede any broad portrait display axis.
// A generic resource/stress scale is NEVER a financial-wellbeing measurement.
const EXACT_DIMENSION_REF = Object.freeze({
  "resources.financial_wellbeing.cfpb_short": "money::financial_wellbeing",
  "state.money_pressure.difficulty": "money::money_pressure",
  "resources.money_pressure.coping": "money::financial_coping",
});
// An explicit source match is context for exploration, not a reason to target
// someone with paid services or call a value "below average".
export function verifiedAxisEvidence(measurements = []) {
  if (!Array.isArray(measurements)) return [];
  const seen = new Set();
  return measurements.flatMap(item => {
    if (!item || typeof item.resultId !== "string" || !item.resultId ||
      typeof item.dimensionKey !== "string" || !item.dimensionKey ||
      typeof item.measuredAt !== "string" || !Number.isFinite(Date.parse(item.measuredAt)) ||
      ![item.rawValue, item.min, item.max].every(Number.isFinite) ||
      item.max <= item.min || item.rawValue < item.min || item.rawValue > item.max ||
      !["directional", "descriptive"].includes(item.mode)) return [];
    const ref = EXACT_DIMENSION_REF[item.dimensionKey] || SOURCE_REF[item.key];
    if (!AXIS_REFS[ref]) return [];
    const identity = item.resultId + ":" + item.dimensionKey;
    if (seen.has(identity)) return [];
    seen.add(identity);
    return [{
      axisRef: ref, resultId: item.resultId, dimensionKey: item.dimensionKey,
      rawValue: item.rawValue, min: item.min, max: item.max,
      measuredAt: item.measuredAt, sourceTitle: item.sourceTitle || "",
      interpretation: "source_score_only",
    }];
  });
}

// Never interpret positions on a questionnaire scale as population norms.
// Only an independently reviewed, matching versioned reference interval can
// provide a below / within / above label. Otherwise: unknown.
export function sourceBandPosition(measurement, band) {
  if (!measurement || !band || band.reviewed !== true ||
    band.dimensionKey !== measurement.dimensionKey ||
    band.definitionKey !== measurement.definitionKey ||
    band.definitionVersion !== measurement.definitionVersion ||
    band.instrumentLocale !== measurement.instrumentLocale ||
    ![band.lower, band.upper, measurement.rawValue].every(Number.isFinite) ||
    band.lower > band.upper) return "unknown";
  return measurement.rawValue < band.lower ? "below_reference" :
    measurement.rawValue > band.upper ? "above_reference" : "within_reference";
}

const tag = (ref, strength = 3) => Object.freeze({ ref, strength });
const meta = (refs, strength = 3) => Object.freeze(refs.map(ref => tag(ref, strength)));
const ALL = Object.freeze({
  emotions: ["emotions::stress", "emotions::anxiety", "emotions::mood", "emotions::regulation"],
  recovery: ["recovery::sleep", "recovery::energy", "body::body_awareness", "body::body_energy"],
  connection: ["connection::social_connection", "connection::intimacy", "connection::boundaries", "connection::sexual_wellbeing", "connection::relational_traits"],
  work: ["work::focus", "work::clarity", "work::functioning", "work::workload", "work::working_style", "money::financial_wellbeing", "money::money_pressure", "money::financial_coping"],
  identity: ["traits::extraversion", "traits::agreeableness", "traits::conscientiousness", "traits::emotional_reactivity", "traits::openness", "traits::other_traits", "traits::typologies", "support::resources", "support::self_support", "meaning::meaning", "goal::clarity", "goal::motivation", "goal::confidence"],
});
export const SERVICE_AXIS_LINKS = Object.freeze({
  situation: [...meta(["work::clarity", "support::resources", "meaning::meaning"], 2)],
  dao: [...meta(["support::resources", "meaning::meaning", "body::body_awareness"], 2)],
  alchemy: [...meta(["connection::social_connection", "connection::intimacy", "support::self_support", "emotions::regulation"], 2)],
  hypnotherapy: [...meta(["support::self_support", "emotions::regulation", "meaning::meaning"], 2)],
  business: [...meta(["work::clarity", "work::focus", "work::functioning", "goal::clarity"], 3),
    ...meta(["money::money_pressure", "money::financial_coping"], 2)],
});
// Exact published recordings from the existing teacher-source manifests only.
// Content relevance is editorial, NOT proven effectiveness or a promise.
export const ORIGINAL_VIDEO_AXIS_LINKS = Object.freeze({
  HqfixazXqRY: meta(["meaning::meaning", "support::resources", "goal::motivation"], 2),
  "w2BN-HYmHUk": meta(["body::body_awareness", "support::resources"], 2),
  "80xZ7jN6o2Y": meta(["body::body_awareness", "meaning::meaning"], 2),
  "_IOX0E8N-To": meta(["body::body_energy", "support::resources"], 2),
});
const TITLES = Object.freeze({
  en: {
    opora: "OPORA · 14-day stress support", academy: "Reiki & guided courses",
    tests_body: "Explore wellbeing questionnaires", tests_relationships: "Explore relationship questionnaires",
    tests_work: "Explore work and money questionnaires", tests_growth: "Explore growth questionnaires",
  },
  ru: {
    opora: "ОПОРА · антистресс 14 дней", academy: "Рейки и обучающие курсы",
    tests_body: "Подобрать тесты состояния", tests_relationships: "Подобрать тесты отношений",
    tests_work: "Подобрать тесты работы и денег", tests_growth: "Подобрать тесты развития",
  },
  es: {
    opora: "OPORA · 14 días antiestrés", academy: "Reiki y cursos guiados",
    tests_body: "Explorar pruebas de bienestar", tests_relationships: "Explorar pruebas de relaciones",
    tests_work: "Explorar pruebas de trabajo y dinero", tests_growth: "Explorar pruebas de desarrollo",
  },
});
const safeLocale = locale => ["en", "ru", "es"].includes(locale) ? locale : "en";
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const safeServiceUrl = (value, locale) => typeof value === "string" &&
  value.startsWith("/" + locale + "/services/") &&
  /^\/(en|ru|es)\/services\/[a-z][a-z-]+$/.test(value);
const videoLinks = (video, locale) => {
  const id = video?.youtubeId || video?.id;
  if (!YOUTUBE_ID.test(id || "") || typeof video.title !== "string") return [];
  const authored = ORIGINAL_VIDEO_AXIS_LINKS[id];
  // Original RU legacy playlist is source-verified but its broad topic tags
  // are only weak thematic hints; they must not become precise test matches.
  const broad = video.sourceLanguage === "ru" && Array.isArray(video.topics) &&
    video.topics.includes("energy") ? meta(["recovery::energy", "body::body_energy"], 1) : [];
  const axisLinks = authored || broad;
  if (!axisLinks?.length) return [];
  const originalLanguage = video.sourceLanguage || "en";
  // No claim of ES/RU dubbing for original EN sound.
  return [{
    id: "youtube:" + id, kind: "video", title: video.title,
    href: "https://www.youtube.com/watch?v=" + id,
    originalLanguage, axisLinks, status: "published", free: true,
  }];
};

// Offers are BUILT only from the caller's known, published catalogues.
// No paywall bypass, inferred checkout, new course enrolment or private media.
export function publishedAxisOffers({ locale = "en", services = [], videos = [] } = {}) {
  const lang = safeLocale(locale);
  const root = "/" + lang;
  const titles = TITLES[lang];
  const serviceRows = (Array.isArray(services) ? services : []).flatMap(item =>
    SERVICE_AXIS_LINKS[item?.id] && safeServiceUrl(item.href, lang)
      ? [{
        id: "service:" + item.id, kind: "service", title: item.title,
        href: item.href, axisLinks: SERVICE_AXIS_LINKS[item.id],
        free: ["situation", "dao"].includes(item.id), status: "published",
      }] : []);
  const lessons = [
    {
      id: "course:opora", kind: "course", title: titles.opora,
      href: root + "/courses/antistress", status: "published", free: false,
      axisLinks: [...meta(["emotions::stress", "emotions::regulation", "recovery::sleep"], 3),
        ...meta(["support::resources", "recovery::energy"], 2)],
    },
    {
      id: "course:academy", kind: "course", title: titles.academy,
      href: root + "/courses", status: "published", free: false,
      axisLinks: meta(["body::body_awareness", "support::resources", "meaning::meaning"], 2),
    },
  ];
  const testRows = [
    ["body", titles.tests_body, [...ALL.emotions, ...ALL.recovery]],
    ["relationships", titles.tests_relationships, ALL.connection],
    ["work", titles.tests_work, ALL.work],
    ["growth", titles.tests_growth, ALL.identity],
  ].map(([id, title, refs]) => ({
    id: "test:" + id, kind: "test", title, href: root + "/client/tests",
    status: "published", free: true, // Picker determines rights/availability of each test.
    axisLinks: meta(refs, 2),
  }));
  const videoRows = (Array.isArray(videos) ? videos : []).flatMap(video => videoLinks(video, lang));
  return [...serviceRows, ...lessons, ...testRows, ...videoRows];
}
const axisLinksFor = offer => Array.isArray(offer?.axisLinks)
  ? offer.axisLinks.filter(x => AXIS_REFS[x?.ref] && [1, 2, 3].includes(x.strength))
  : [];

// This score is ONLY editorial topic-fit, never an outcome probability or
// an evaluation of a person. Explicit chosen research facet dominates.
// Measured source scores contribute presence/provenance, NOT deficit urgency.
export function rankAxisOffers({
  chosenAxis = "", offers = [], measurements = [], preferredKinds = [],
  includeRelated = false, limit = 12,
} = {}) {
  if (!AXIS_REFS[chosenAxis]) return [];
  const evidence = verifiedAxisEvidence(measurements);
  const measuredRefs = new Set(evidence.map(x => x.axisRef));
  const preference = new Set(Array.isArray(preferredKinds) ? preferredKinds : []);
  const rows = (Array.isArray(offers) ? offers : []).flatMap(offer => {
    if (offer?.status !== "published" || typeof offer.id !== "string" ||
      typeof offer.title !== "string" || !["video", "test", "course", "service"].includes(offer.kind) ||
      typeof offer.href !== "string" ||
      !(offer.href.startsWith("/") || /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(offer.href))) return [];
    const links = axisLinksFor(offer);
    const exact = links.filter(link => link.ref === chosenAxis);
    const strength = exact.length ? Math.max(...exact.map(x => x.strength)) : 0;
    if (!strength && (!includeRelated || !links.some(x => AXIS_REFS[x.ref].topic === AXIS_REFS[chosenAxis].topic))) return [];
    // Sensitive relationship data is not a trigger for a paid service.
    if (chosenAxis === "connection::sexual_wellbeing" && offer.kind !== "test") return [];
    const related = strength ? strength : 0;
    const matchLevel = related === 3 ? "primary" : related === 2 ? "supporting" : "related";
    const measured = measuredRefs.has(chosenAxis);
    const score = Math.min(100, (strength === 3 ? 72 : strength === 2 ? 55 : strength === 1 ? 32 : 15) +
      (measured ? 5 : 0) + (preference.has(offer.kind) ? 8 : 0) + (offer.free ? 2 : 0));
    return [{ ...offer, score, matchLevel, axisRef: chosenAxis, hasSourceMeasurement: measured }];
  });
  const seen = new Set();
  return rows.sort((a,b) => b.score - a.score ||
      ["video", "test", "course", "service"].indexOf(a.kind) -
      ["video", "test", "course", "service"].indexOf(b.kind) ||
      a.id.localeCompare(b.id))
    .filter(row => !seen.has(row.id) && seen.add(row.id))
    .slice(0, Number.isInteger(limit) ? Math.min(30, Math.max(0, limit)) : 12);
}
