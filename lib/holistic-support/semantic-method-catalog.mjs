/**
 * Wave Magic Director · semantic method catalogue (v1).
 * No second database or external inference: adapt ONLY already published,
 * reviewed, rights-cleared source records. Relative relevance is not efficacy.
 * No client input, measured scores, diagnoses or identifiers are persisted.
 */
export const METHOD_CATALOG_VERSION = "hh-semantic-method-v1";
export const METHOD_KINDS = Object.freeze([
  "test", "practice", "video", "koan", "specialist", "course", "service", "audio",
]);
export const METHOD_TAG_FIELDS = Object.freeze([
  "problem", "goal", "state", "language", "durationMinutes",
  "depth", "cost", "availability",
]);
const KINDS = new Set(METHOD_KINDS);
const LANGUAGES = new Set(["ru", "en", "es"]);
const ID = /^(?:test|practice|video|koan|specialist|course|service|audio|youtube):[A-Za-z0-9_:-]{1,95}$/;
const TOKEN = /^[a-z][a-z0-9_]{0,49}$/;
const YOUTUBE = /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/;
const COSTS = new Set(["free", "paid", "unknown"]);
const AVAILABILITY = new Set(["available", "booking_required", "unverified", "unavailable"]);
const obj = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const items = value => Array.isArray(value) ? value : [];
const unique = value => [...new Set(items(value).filter(x => typeof x === "string" && TOKEN.test(x)))].slice(0,24);
const bounded = (value, fallback = 2) => Number.isInteger(value) ? Math.max(0, Math.min(12, value)) : fallback;
const localHref = (href,locale) => typeof href === "string" &&
  href.startsWith("/" + locale + "/") && !/[\s?#]/.test(href) &&
  !href.includes("//") && !href.includes("..") && href.length <= 300;
const verifiedHref = (href,locale,kind) =>
  localHref(href,locale) || kind === "video" && YOUTUBE.test(href);

/**
 * Normalizes the same eight tags for every method. Unknown data stays unknown.
 * sourcePublished/rightsCleared/editorialReviewed must be authoritative
 * server-side facts from the actual source, never client JSON.
 */
export function normalizeMethodRecord(value, { locale = "en" } = {}) {
  const x = obj(value);
  if (!KINDS.has(x.kind) || !ID.test(x.id || "") ||
    x.sourcePublished !== true || x.rightsCleared !== true ||
    x.editorialReviewed !== true || x.safetyApproved !== true ||
    typeof x.title !== "string" || !x.title.trim() || x.title.length > 180 ||
    !verifiedHref(x.href,locale,x.kind)) return null;
  const original = obj(x.tags);
  const costValue = obj(original.cost);
  const availabilityValue = obj(original.availability);
  const cost = COSTS.has(costValue.kind) ? costValue.kind : "unknown";
  const availability = AVAILABILITY.has(availabilityValue.status)
    ? availabilityValue.status : "unverified";
  if (availability === "unavailable" || availability === "unverified") return null;
  const languages = items(original.language).filter(x => LANGUAGES.has(x));
  // A translated card never implies a translated recording.
  if (!languages.includes(locale)) return null;
  const duration = Number.isFinite(original.durationMinutes) && original.durationMinutes > 0
    ? original.durationMinutes : null;
  const depth = Number.isInteger(original.depth) && original.depth >= 1 &&
    original.depth <= 3 ? original.depth : null;
  const price = cost === "paid" && Number.isFinite(costValue.amount) &&
    costValue.amount > 0 && typeof costValue.currency === "string" &&
    /^[A-Z]{3}$/.test(costValue.currency)
    ? { amount: costValue.amount, currency: costValue.currency } : null;
  return Object.freeze({
    id:x.id, kind:x.kind, title:x.title.trim(), href:x.href,
    sourceRef:typeof x.sourceRef === "string" ? x.sourceRef : x.id,
    sourcePublished:true,rightsCleared:true,editorialReviewed:true,safetyApproved:true,
    tags:Object.freeze({
      problem:unique(original.problem), goal:unique(original.goal),
      state:unique(original.state), language:[...new Set(languages)],
      durationMinutes:duration, depth,
      cost:{kind:cost,price}, availability:{status:availability},
    }),
  });
}

/** Six canonical libraries + service/audio extensions, no duplicate store. */
export function buildMethodCatalog(sources = {}, { locale = "en" } = {}) {
  const keys = {
    tests:"test", practices:"practice", videos:"video", koans:"koan",
    specialists:"specialist", courses:"course", services:"service", audios:"audio",
  };
  const out = [], seen = new Set();
  for (const [key,kind] of Object.entries(keys)) {
    for (const source of items(sources[key])) {
      const normalized = normalizeMethodRecord({ ...obj(source), kind }, { locale });
      if (normalized && !seen.has(normalized.id)) {
        seen.add(normalized.id);
        out.push(normalized);
      }
    }
  }
  return out;
}

// Concept normalization connects related requests across languages and forms.
// These are editorial discovery themes, NOT psychological diagnoses or traits.
const CONCEPT_PATTERNS = Object.freeze({
  confidence: /стыд|осужд|неуверенн|самооцен|страх оценки|критик|self.doubt|self.esteem|fear of judg|judg|disapprov|criticis|shame|confidence|verguenza|vergüenza|autoestima|cr[ií]tic/iu,
  stress: /тревог|стресс|беспоко|напряж|пережива|выгора|anxious|anxiety|stress|overwhelm|burnout|worr|ansiedad|estr[eé]s|preocup/iu,
  relationships: /отношен|партнер|партнёр|семь|одиноч|расстав|любов|relationship|partner|lonel|breakup|family|relaci[oó]n|pareja|soledad|familia/iu,
  money: /финанс|денег|деньг|долг|доход|money|income|debt|financial|dinero|ingreso|deuda|finanzas/iu,
  work: /работ|бизнес|карьер|коллег|work|business|career|colleague|trabajo|negocio|carrera/iu,
  energy: /устал|нет сил|энерг|истощ|fatigu|tired|exhaust|energy|cansad|agotad|energ[ií]a/iu,
  sleep: /бессон|сон|спать|sleep|insomnia|dormir|insomnio|sue[nñ]o/iu,
  meaning: /смысл|предназначен|призван|meaning|purpose|values|sentido|prop[oó]sito/iu,
  direction: /цель|решени|выбор|ясност|не знаю чего|goal|decision|direction|clarity|choice|meta|decisi[oó]n|direcci[oó]n/iu,
});
const SELECTED_GOALS = Object.freeze({
  energy:["energy"], relationships:["relationships"], money:["money"],
  goals:["direction"], meaning:["meaning"],
});
const RELATED = Object.freeze({
  confidence:["stress","self_support"], stress:["energy","sleep","self_support"],
  relationships:["self_support","confidence"], money:["work","direction"],
  work:["money","direction"], energy:["sleep","stress"],
  sleep:["energy","stress"], meaning:["direction","self_support"],
  direction:["work","meaning","confidence"], self_support:["confidence","stress"],
});
export function inferRequestSemantics({message = "", selectedGoal = null} = {}) {
  const text = typeof message === "string" ? message.slice(0,3000) : "";
  const explicit = Object.entries(CONCEPT_PATTERNS).filter(([,re])=>re.test(text)).map(([k])=>k);
  return [...new Set([...items(SELECTED_GOALS[selectedGoal]), ...explicit])];
}
const intersection = (a,b) => a.filter(x=>b.includes(x));

/** Relative discovery score only; no claims about success rate or improvement. */
export function rankMethodCatalog({ catalog = [], message = "", selectedGoal = null,
  locale = "en", freeOnly = true, maxDurationMinutes = null, maxDepth = null,
  excludedIds = [], limit = 2 } = {}) {
  if (!LANGUAGES.has(locale)) return [];
  const intent = inferRequestSemantics({message,selectedGoal});
  const excludes = new Set(items(excludedIds));
  const ranked = items(catalog).flatMap((raw,index)=>{
    const x = normalizeMethodRecord(obj(raw), {locale});
    if (!x || excludes.has(x.id)) return [];
    const t=x.tags;
    if (freeOnly && t.cost.kind !== "free" ||
      maxDurationMinutes != null && (!Number.isFinite(t.durationMinutes) ||
        t.durationMinutes > maxDurationMinutes) ||
      maxDepth != null && (!Number.isInteger(t.depth) || t.depth > maxDepth)) return [];
    const concepts=[...new Set([...t.problem,...t.goal,...t.state])];
    const primary=intersection(intent,concepts);
    const secondary=intent.flatMap(k=>items(RELATED[k]).filter(x=>concepts.includes(x)));
    const score=primary.length*48 + new Set(secondary).size*14 +
      (t.cost.kind==="free"?4:0) - Math.max(0,concepts.length-3);
    // Never invent a personalized match to fill a second slot.
    if (intent.length>0 && primary.length===0 && secondary.length===0) return [];
    return [{item:x,score,index,matched:primary.length+secondary.length,
      quick:t.depth!==null&&t.depth<=1 && t.cost.kind==="free"}];
  }).sort((a,b)=>b.score-a.score || a.index-b.index);
  const selected=[];
  for (const x of ranked) {
    if (selected.length >= bounded(limit)) break;
    if (selected.some(y=>y.item.id===x.item.id)) continue;
    selected.push(x);
  }
  return selected.map(x=>({...x.item, relevance:{matchedThemes:x.matched,
    score:x.score, description:"relative_topic_relevance_not_efficacy"}}));
}
const axisToConcepts = ref => {
  if (typeof ref !== "string") return [];
  if (ref === "goal::confidence") return ["confidence"];
  if (ref.startsWith("goal::")) return ["direction"];
  if (ref.startsWith("emotions::")) return ["stress"];
  if (ref === "recovery::sleep") return ["sleep"];
  if (ref.startsWith("recovery::")) return ["energy"];
  if (ref.startsWith("connection::")) return ["relationships"];
  if (ref.startsWith("money::")) return ["money"];
  if (ref.startsWith("work::")) return ["work"];
  if (ref.startsWith("meaning::")) return ["meaning"];
  if (ref.startsWith("support::")) return ["self_support"];
  return [];
};
const semanticTagsFromSource = x => {
  const concepts=[...new Set(items(x.axisLinks).flatMap(link=>axisToConcepts(link?.ref)))];
  return {problem:concepts,goal:concepts,state:[], language:[
    // Actual recording language takes precedence over localized UI.
    x.kind==="video" ? x.originalLanguage : x.locale,
  ],durationMinutes:Number.isFinite(x.verifiedDurationMinutes)
    ? x.verifiedDurationMinutes : null,
    depth:x.kind==="test"||x.kind==="video" ? 1 :
      x.kind==="course"?2:3,
    cost:{kind:x.free===true?"free":x.free===false?"unknown":"unknown"},
    availability:{status:x.kind==="service"?"booking_required":"available"}};
};

/**
 * The upstream signed, consent-gated guide already decides which suggestions
 * are allowed. This function NEVER creates a candidate. It ranks only their
 * exact IDs/links against the already published source-derived axis catalogue.
 * Unindexed but upstream-approved items retain their order as a safe fallback.
 */
export function rankVerifiedSuggestions({ suggestions = [], sourceOffers = [],
  message = "", selectedGoal = null, locale = "en", limit = 2 } = {}) {
  // A known source's unpaid/rights/URL/language restrictions cannot be
  // bypassed by recategorising it as an "unindexed" fallback.
  const known=new Map(items(sourceOffers).filter(x=>x && typeof x.id==="string")
    .map(x=>[x.id,{...x,locale}]));
  const requested = items(suggestions).filter(x=>x && typeof x.id==="string" &&
    ID.test(x.id) && typeof x.title==="string" && typeof x.href==="string")
    .filter(x=>{
      const source=known.get(x.id);
      return !source || source.status==="published" && source.free===true &&
        source.href===x.href && source.kind===x.kind &&
        (source.kind!=="video" || !source.originalLanguage ||
          source.originalLanguage===locale);
    });
  const sources=new Map([...known].filter(([,x])=>x.status==="published"));
  const normalized=[], backed=new Set();
  for (const suggestion of requested) {
    const source=sources.get(suggestion.id);
    if (!source || source.href!==suggestion.href || source.kind!==suggestion.kind ||
      source.free!==true) continue;
    const record=normalizeMethodRecord({
      id:suggestion.id,kind:suggestion.kind,title:suggestion.title,href:suggestion.href,
      sourceRef:source.id,sourcePublished:true,rightsCleared:true,
      editorialReviewed:true,safetyApproved:true,tags:semanticTagsFromSource(source),
    }, {locale});
    if (record) { normalized.push(record);backed.add(record.id); }
  }
  const ranked=rankMethodCatalog({catalog:normalized,message,selectedGoal,
    locale,freeOnly:true,limit});
  const chosen=new Set();
  const result=[];
  // Prefer clearly relevant verified options, preserving upstream authority.
  for (const row of ranked) {
    const original=requested.find(x=>x.id===row.id);
    if (original && !chosen.has(original.id)) {result.push(original);chosen.add(original.id);}
  }
  // Do not pad a semantic no-match with unrelated indexed catalogue entries.
  // Keep upstream approved audio and other unindexed kinds intact if space remains.
  // Unknown entries were already approved upstream, but must not become
  // an unrelated second option when semantic evidence already exists.
  const hasExplicitMeaning=inferRequestSemantics({message,selectedGoal}).length>0;
  if (!hasExplicitMeaning || !ranked.length) {
    for (const row of requested) {
      if (result.length>=bounded(limit)) break;
      if (!backed.has(row.id) && !chosen.has(row.id)) {
        result.push(row);chosen.add(row.id);
      }
    }
  }
  // If nothing has semantic evidence, honor upstream's already approved ordering.
  if (!result.length && normalized.length && !inferRequestSemantics({message,selectedGoal}).length)
    return requested.slice(0,bounded(limit));
  return result.slice(0,bounded(limit));
}
