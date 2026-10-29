/**
 * Holistic Intelligence v1: an opt-in, deterministic orchestration layer.
 *
 * This is a single decision contract across existing matching algorithms,
 * NOT a second diagnosis, psychometric scorer, AI provider or media catalogue.
 * The caller supplies already-authorized private measurements and already-
 * permitted public catalogue rows. Never log, store, send or serialize client
 * answers, measurements, free text or client identifiers to URLs/telemetry.
 */
import { AXIS_REFS, rankAxisOffers } from "./axis-offer-matcher.mjs";
import { rankClientServices, CLIENT_GOALS } from "./client-intent-model.mjs";
import { rankMeditationCatalog } from "./meditation-catalog-ranker.mjs";
import { interpretSupportUtterance } from "./guide-dialogue.mjs";
import { recommendMandalaAudio } from "../mandala/audio-recommendations.mjs";

export const HOLISTIC_INTELLIGENCE_VERSION = "hi-core-v1";
export const HI_FORMATS = Object.freeze([
  "meditation", "video", "audio", "test", "course", "service",
]);
const KINDS = new Set(HI_FORMATS);
const GOALS = new Set(CLIENT_GOALS);
const LANGUAGE = new Set(["en", "ru", "es"]);
const AUDIO_LESSONS = Object.freeze({
  flight: { axes: ["meaning::meaning", "support::resources", "goal::motivation"], goals: ["meaning", "goals"] },
  tantra: { axes: ["body::body_awareness", "support::resources"], goals: ["energy", "meaning"] },
  kundalini: { axes: ["body::body_energy", "recovery::energy"], goals: ["energy"] },
  yggdrasil: { axes: ["meaning::meaning", "support::resources"], goals: ["meaning"] },
  initiation: { axes: ["meaning::meaning", "goal::confidence"], goals: ["meaning", "goals"] },
});
const AUDIO_TITLES = Object.freeze({
  en: { flight: "Sun Flight · course introduction", tantra: "Tantra Reiki · course introduction",
    kundalini: "Kundalini Reiki · course introduction", yggdrasil: "Reiki Yggdrasil · course introduction",
    initiation: "Reiki initiation · course introduction" },
  ru: { flight: "Полёт к Солнцу · вступительное аудио", tantra: "Тантра Рейки · вступительное аудио",
    kundalini: "Кундалини Рейки · вступительное аудио", yggdrasil: "Рейки Иггдрасиль · вступительное аудио",
    initiation: "Инициация Рейки · вступительное аудио" },
});
const AUDIO_ID = /^[a-f0-9]{32}$/;
const SAFE_AUDIO_ORIGIN = /^https:\/\/[a-z0-9]{20}\.supabase\.co$/;
const SAFE_AUDIO_SUFFIX = /\.(?:mp3|m4a|wav)$/;
const bounded = (value, fallback = 5, max = 20) =>
  Number.isInteger(value) ? Math.max(0, Math.min(max, value)) : fallback;
const ids = (input, allowed, max = 20) => Array.isArray(input)
  ? [...new Set(input.filter(value => typeof value === "string" && allowed.has(value)))].slice(0, max) : [];
const cleanStrings = (input, max = 50) => Array.isArray(input)
  ? [...new Set(input.filter(x => typeof x === "string" && /^[a-z0-9_:.-]{1,90}$/.test(x)))].slice(0, max) : [];
const asArray = x => Array.isArray(x) ? x : [];
const formatKind = kind => ({
  video: "video", test: "test", course: "course", service: "service",
})[kind] || null;

function safePublishedAudio(entry, requestedLocale) {
  // Only trusted /api/reiki-intro-audio manifest replies may set verifiedPublicManifest.
  // The URL check is defence-in-depth, not proof of publication or ownership.
  if (!entry || entry.verifiedPublicManifest !== true ||
    !Object.hasOwn(AUDIO_LESSONS, entry.lesson) ||
    entry.locale !== requestedLocale || !["en", "ru"].includes(entry.locale) ||
    typeof entry.publishedAt !== "string" || !Number.isFinite(Date.parse(entry.publishedAt)) ||
    typeof entry.src !== "string") return false;
  try {
    const url = new URL(entry.src);
    if (!SAFE_AUDIO_ORIGIN.test(url.origin) || url.username || url.password ||
      url.search || url.hash || url.port || !SAFE_AUDIO_SUFFIX.test(url.pathname)) return false;
    const prefix = "/storage/v1/object/public/hh-reiki-course-audio/reiki-practitioner/intros/";
    const parts = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length).split("/") : [];
    return parts.length === 3 && parts[0] === entry.lesson &&
      parts[1] === entry.locale && AUDIO_ID.test(parts[2].split(".")[0]) &&
      ["mp3", "m4a", "wav"].includes(parts[2].split(".")[1]);
  } catch { return false; }
}

export function publishedReikiAudioRecommendations({
  locale = "en", chosenAxes = [], goal = null, publishedAudio = [], limit = 3,
} = {}) {
  if (!["en", "ru"].includes(locale)) return [];
  const axes = ids(chosenAxes, new Set(Object.keys(AXIS_REFS)), 3);
  const selectedGoal = GOALS.has(goal) ? goal : null;
  if (!axes.length && !selectedGoal) return [];
  const seen = new Set();
  return asArray(publishedAudio).flatMap(entry => {
    if (!safePublishedAudio(entry, locale) || seen.has(entry.lesson)) return [];
    const metadata = AUDIO_LESSONS[entry.lesson];
    const matchedAxes = axes.filter(axis => metadata.axes.includes(axis));
    const goalMatched = Boolean(selectedGoal && metadata.goals.includes(selectedGoal));
    if (!matchedAxes.length && !goalMatched) return [];
    seen.add(entry.lesson);
    return [{
      id: "audio:reiki:" + entry.lesson + ":" + locale, kind: "audio",
      audioType: "approved_course_introduction", source: "public_reiki_course_manifest",
      title: AUDIO_TITLES[locale][entry.lesson], href: entry.src,
      originalLanguage: locale, matchedAxes, goalMatched,
      playable: true, publishedAt: entry.publishedAt, free: true,
    }];
  }).sort((a,b) => b.matchedAxes.length-a.matchedAxes.length ||
    Number(b.goalMatched)-Number(a.goalMatched) || a.id.localeCompare(b.id))
    .slice(0, bounded(limit,3,10));
}

function soundtrackTheme(goal, axes) {
  // Pure editorial correspondence; never infer a health problem from a score.
  if (goal === "money") return "money";
  if (goal === "relationships") return "relationships";
  if (goal === "goals") return "goals";
  if (goal === "meaning") return "life";
  if (goal === "energy") return "energy";
  const topic = AXIS_REFS[axes[0]]?.topic;
  if (["emotions", "recovery", "body"].includes(topic)) return "energy";
  if (topic === "connection") return "relationships";
  if (["work", "money"].includes(topic)) return "money";
  if (["goal", "meaning"].includes(topic)) return "goals";
  if (["support", "traits"].includes(topic)) return "life";
  return null;
}
export function editorSoundtrackRecommendations({
  locale = "en", goal = null, chosenAxes = [], audioPreferences = {}, limit = 3,
} = {}) {
  const lang = LANGUAGE.has(locale) ? locale : "en";
  const axes = ids(chosenAxes, new Set(Object.keys(AXIS_REFS)),3);
  const theme = soundtrackTheme(GOALS.has(goal) ? goal : null, axes);
  if (!theme) return [];
  // These are site-owned synthetic sound choices IN THE EXISTING EDITOR,
  // NOT downloadable standalone guided audios or verified client treatment.
  const safe = {
    theme,
    kind: ["tones", "pulse", "nature"].includes(audioPreferences?.kind) ? audioPreferences.kind : "all",
    mood: ["calm", "focus", "uplift"].includes(audioPreferences?.mood) ? audioPreferences.mood : "all",
    pace: ["slow", "steady", "active"].includes(audioPreferences?.pace) ? audioPreferences.pace : "all",
    voiceFriendly: audioPreferences?.voiceFriendly === true,
    // No client free text is passed into the audio matcher.
  };
  return recommendMandalaAudio(safe).slice(0, bounded(limit,3,10)).map(track=>({
    id: "audio:editor:" + track.id, kind: "audio",
    audioType: "on_site_video_soundtrack", source: "site_original_synthetic_audio",
    title: track.name[lang], detail: track.detail[lang], editorTrackId:track.id,
    href: "/" + lang + "/holistic-support/mandala",
    playable: false, free: true, goalMatched: Boolean(goal),
    // Explicitly DO NOT claim clicking this link automatically attaches a track.
  }));
}

function normalizeIntent(intent = {}, locale = "en") {
  const language = LANGUAGE.has(intent.language) ? intent.language : locale;
  const goal = GOALS.has(intent.goal) ? intent.goal : null;
  const chosenAxes = ids(
    Array.isArray(intent.chosenAxes) ? intent.chosenAxes : intent.axisRefs,
    new Set(Object.keys(AXIS_REFS)), 3,
  );
  // "formats: []" is an explicit opt-out of ALL formats. Missing means all.
  const enabledFormats = intent.enabledFormats === undefined ? [...HI_FORMATS] :
    ids(intent.enabledFormats, KINDS, HI_FORMATS.length);
  const dismissed = new Set(Array.isArray(intent.dismissedIds)
    ? intent.dismissedIds.filter(x => typeof x === "string" && /^[A-Za-z0-9_:-]{1,100}$/.test(x)).slice(0,50)
    : []);
  const request = {
    goal, language,
    axisRefs:chosenAxes, situations:cleanStrings(intent.situations,25),
    desiredStates:cleanStrings(intent.desiredStates,25),techniques:cleanStrings(intent.techniques,25),
    paymentPreference:intent.paymentPreference === "free" ? "free" : "any",
    exactOnly:intent.exactOnly === true, allowRelated:intent.allowRelated === true,
    maxDurationMinutes:Number.isFinite(intent.maxDurationMinutes) && intent.maxDurationMinutes > 0
      ? Math.min(180, intent.maxDurationMinutes) : undefined,
    allowUnverifiedDuration:intent.allowUnverifiedDuration === true,
    sourceKind:["all", "original", "external"].includes(intent.sourceKind) ? intent.sourceKind : "all",
    maxRisk:["low", "moderate", "unknown"].includes(intent.maxRisk) ? intent.maxRisk : "unknown",
    avoidBinaural:intent.avoidBinaural !== false,
    limit:bounded(intent.videoLimit,5,20),
  };
  for (const key of ["timeOfDay","spiritualStyle","experienceLevel","intensity","posture","musicStyle"]) {
    if (typeof intent[key] === "string" && /^[a-z_]{1,40}$/.test(intent[key])) request[key] = intent[key];
  }
  return { goal, chosenAxes, enabledFormats, dismissed, request, language };
}

/**
 * Single recommendation decision for a published-content caller.
 * Client profile data must be passed only from a real authenticated owner view,
 * AND after explicit consent. Never use a questionnaire value as a ranking
 * proxy for need/urgency/sales; source presence only informs context.
 */
export function buildHolisticIntelligencePlan({
  locale = "en", intent = {}, profile = {}, catalogs = {}, limits = {},
} = {}) {
  const lang = LANGUAGE.has(locale) ? locale : "en";
  const parsed = typeof intent.rawUtterance === "string" ?
    interpretSupportUtterance(intent.rawUtterance,lang) : null;
  const base = { version:HOLISTIC_INTELLIGENCE_VERSION, locale:lang,
    meditations:[], services:[], axisOffers:[], audio:[], primary:null,
    status:"needs_focus", context:{
      usedVerifiedSourceEvidence:false, chosenAxes:[], goal:null,
      // Deliberately no raw measurement, chat text, client ID or saved notes.
    } };
  if (parsed?.kind === "safety" || intent.safetyStop === true) return {
    ...base, status:"safety_stop", safetyAction:"human_support_required",
  };
  const { goal, chosenAxes, enabledFormats, dismissed, request, language } =
    normalizeIntent(intent,lang);
  const context = {
    usedVerifiedSourceEvidence: profile.ownerAuthorized === true &&
      profile.consentToUseResults === true,
    chosenAxes, goal,
  };
  if (!goal && !chosenAxes.length) return { ...base, context };
  const requested = new Set(enabledFormats);
  const freeOnly = request.paymentPreference === "free";
  const measurements = context.usedVerifiedSourceEvidence ? asArray(profile.measurements) : [];
  const hasDetailedFacets = request.situations.length > 0 ||
    request.desiredStates.length > 0 || request.techniques.length > 0;
  // Each underlying matcher applies its OWN rights, publication and relevance rules.
  const axisOffers = chosenAxes.length ? rankAxisOffers({
    chosenAxes, goalRatings:intent.goalRatings || {},
    offers:asArray(catalogs.axisOffers),
    measurements, preferredKinds:enabledFormats,
    limit:bounded(limits.axisOffers,20,30),
  }).filter(item => requested.has(formatKind(item.kind)) &&
    (!freeOnly || item.free === true) && !dismissed.has(item.id) &&
    (!request.exactOnly || (!hasDetailedFacets &&
      item.matchedAxes.length === chosenAxes.length))) : [];
  const meditations = requested.has("meditation") && goal
    ? rankMeditationCatalog({
        videos:asArray(catalogs.meditationVideos),
        publishedSourceIds:asArray(catalogs.publishedSourceIds),
        request,
      }).filter(item => !dismissed.has("youtube:" + item.video.youtube_id)) : [];
  const services = requested.has("service") && goal ? rankClientServices({
    offers:asArray(catalogs.services), request, limit:bounded(limits.services,3,5),
  }).filter(item => !dismissed.has("service:"+item.offer.id) &&
    (!request.exactOnly || (hasDetailedFacets ?
      item.matchType === "exact" : item.matchType === "topic"))) : [];
  // A published course intro or editor loop has no verified duration, posture,
  // intensity or exact situation match. Never silently satisfy hard filters
  // with missing metadata; abstain instead of inventing compatibility.
  const unverifiedAudioConstraint = request.exactOnly ||
    request.maxDurationMinutes !== undefined || request.sourceKind === "external" ||
    request.musicStyle === "voice_only" ||
    ["timeOfDay","spiritualStyle","experienceLevel","intensity","posture"].some(key =>
      request[key] && !["any","unknown","unspecified"].includes(request[key]));
  const audio = requested.has("audio") && !unverifiedAudioConstraint
    ? [...publishedReikiAudioRecommendations({
      locale:language,goal,chosenAxes,publishedAudio:catalogs.publishedReikiAudio,
      limit:bounded(limits.publicAudio,3,10),
    }),...editorSoundtrackRecommendations({
      locale:lang,goal,chosenAxes,audioPreferences:intent.audioPreferences,
      limit:bounded(limits.editorAudio,3,10),
    })].filter(item=>!dismissed.has(item.id))
    : [];
  // Scores from different matchers are NOT commensurate. Keep results grouped
  // and choose the first step by explicit format preference, never by paid value.
  const groups = {
    meditation:meditations.map(x=>({id:"youtube:"+x.video.youtube_id,kind:"meditation",href:"https://www.youtube.com/watch?v="+x.video.youtube_id,source:"published_meditation"})),
    video:axisOffers.filter(x=>x.kind==="video").map(x=>({id:x.id,kind:"video",href:x.href,source:"reviewed_axis_offer"})),
    audio:audio.map(x=>({id:x.id,kind:"audio",href:x.href,source:x.source})),
    test:axisOffers.filter(x=>x.kind==="test").map(x=>({id:x.id,kind:"test",href:x.href,source:"published_test_picker"})),
    course:axisOffers.filter(x=>x.kind==="course").map(x=>({id:x.id,kind:"course",href:x.href,source:"published_course"})),
    service:services.map(x=>({id:"service:"+x.offer.id,kind:"service",href:x.offer.href,source:"published_service"})),
  };
  const order = intent.preferredFormat && requested.has(intent.preferredFormat)
    ? [intent.preferredFormat,...enabledFormats.filter(x=>x!==intent.preferredFormat)]
    : enabledFormats;
  const primary = order.flatMap(kind=>groups[kind] || [])[0] || null;
  const status = primary ? "ready" : "no_reviewed_match";
  return {version:HOLISTIC_INTELLIGENCE_VERSION,locale:lang,status,context,
    axisOffers,meditations,services,audio,primary};
}

// Shared methodology for eight-session planning and supportive client dialogue.
export { consultPsychologistMind, buildPsychologyProgram, buildPsychologyDialogueTurn,
  PSYCHOLOGIST_MIND_VERSION, PSYCHOLOGIST_APPROACHES, PSYCHOLOGIST_METHODS,
  PSYCHOLOGIST_FOCI } from "./psychologist-mind.mjs";
export { PSYCHOLOGY_VIDEO_COURSES, PSYCHOLOGY_VIDEO_SKILLS,
  COURSE_EVIDENCE_REFERENCES, listPsychologyVideoCourseOptions } from
  "./psychologist-video-curricula.mjs";
export { KIP_MOTIFS, KIP_SYMBOLS, KIP_REFERENCE_SOURCES,
  listKipMotifs, exploreKipSymbol } from "./kip-symbol-registry.mjs";
export { PERSONAL_MEDITATION_VERSION } from
  "./psychologist-meditation-composer.mjs";
