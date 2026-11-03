/**
 * Project Intelligence: a bounded, read-only project knowledge retrieval contract.
 * This module contains ONLY publicly safe overview text. The private Google Drive
 * knowledge registry is NOT copied to this public repository.
 * Client-facing Holistic Mind/psychologist routes must never import this module.
 */
export const KNOWLEDGE_VERSION = "hh-project-knowledge-v1";
export const KNOWLEDGE_TOPICS = Object.freeze([
  { id:"brand", ru:"Бренд и цвета", en:"Brand & visual identity", summary:"Holistic Light / Warm & Alive, Warm Sunrise, семантические токены, мобильный Design QA.", keys:"бренд стиль дизайн цвет цвета цвета палитра логотип шрифт warm light ivory brand design colors palette logo typography" },
  { id:"marketing", ru:"Маркетинговая стратегия", en:"Marketing strategy", summary:"Ясность → Опора → Действие; ценность, позиционирование, пользовательский путь, добровольная воронка.", keys:"маркетинг стратегия продвижение продажи воронка seo спрос аудитория marketing strategy funnel audience growth" },
  { id:"competition", ru:"Конкуренты и исследования", en:"Competitors & research", summary:"Видео- и медитативные продукты, сравнение UX и проверяемые продуктовые преимущества. Исследования датированы.", keys:"конкурент анализ рынок сравнение benchmark selfstudio enai vibo competition research alternative" },
  { id:"technology", ru:"Техническая реализация", en:"Technical architecture", summary:"Next.js, существующий Video Studio, VideoProjectV2, RenderPlanV2, Canvas/MediaRecorder и проверки экспорта.", keys:"техника архитектура github nextjs vercel supabase video renderer code implementation architecture stack" },
  { id:"intelligence", ru:"Holistic Intelligence", en:"Holistic Intelligence", summary:"Разделение Psychologist Mind, Meditation Director, Writer, Editor и проверяющего контура.", keys:"психолог интеллект агент медитация ум psychologist mind writer editor ai intelligence affirmation" },
  { id:"delivery", ru:"CI, PR и публикация", en:"CI, PR & live delivery", summary:"От актуального HEAD и обязательного CI до merge, Vercel READY и независимой LIVE-проверки.", keys:"ci pr merge релиз деплой release runner живой сайт head deployment vercel automation repair" },
  { id:"analytics", ru:"SEO и аналитика", en:"SEO & analytics", summary:"GSC, consent-based analytics, CRM и платежи как разные источники данных; NO_DATA не равно нулю.", keys:"seo gsc ga4 crm analytics traffic трафик сео статистика лиды метрики конверсия" },
  { id:"roadmap", ru:"Планы и решения", en:"Plans & decisions", summary:"Утверждённые решения, задачи P0–P2, критерии приёмки и подтверждённые статусы отдельно.", keys:"планы план задачи приоритет road map roadmap task decision p0 p1 p2 status решение" },
  { id:"privacy", ru:"Приватность и доступ", en:"Privacy & access", summary:"Приватные документы остаются в Google Drive; личные клиентские данные и секреты не входят в базу проекта.", keys:"безопасность приватность доступ consent разрешение секрет клиент authentication security privacy access" },
]);
const squash = value => String(value ?? "").normalize("NFKC").toLocaleLowerCase("ru")
  .replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim().slice(0,250);
const terms = value => squash(value).split(" ").filter(term => term.length >= 2).slice(0,15);
const bounded = (value, max=480) => typeof value === "string" ? value.trim().slice(0,max) : "";
const CATEGORIES = new Set(["all","topic","source","decision","plan","palette"]);
const safeId = x => /^[A-Z]{2,8}-[A-Za-z0-9_-]{2,40}$/.test(String(x||""));
const validUrl = u => {
  if(typeof u !== "string" || u.length > 500) return null;
  try {
    const x = new URL(u);
    if(x.protocol !== "https:" || x.username || x.password || x.port) return null;
    if(!["docs.google.com","drive.google.com"].includes(x.hostname)) return null;
    if(!/^\/(?:document|spreadsheets|presentation)\/d\/[A-Za-z0-9_-]{15,}(?:\/|$)/.test(x.pathname) &&
       !/^\/drive\/folders\/[A-Za-z0-9_-]{15,}$/.test(x.pathname) &&
       !/^\/file\/d\/[A-Za-z0-9_-]{15,}(?:\/|$)/.test(x.pathname)) return null;
    x.hash = ""; return x.toString();
  } catch { return null; }
};
export { validUrl as validKnowledgeSourceUrl };
export function prepareKnowledgeRecord(row) {
  if(!row || typeof row !== "object") return null;
  const category = CATEGORIES.has(row.category) && row.category !== "all" ? row.category : null;
  const id = bounded(row.id,60);
  const title = bounded(row.title,200);
  if(!category || !title || !(safeId(id) || category==="topic" && /^[a-z]{3,32}$/.test(id))) return null;
  return Object.freeze({
    id, category, title,
    summary:bounded(row.summary,700),
    status:bounded(row.status,90),
    priority:/^P[0-4]$/.test(row.priority) ? row.priority : "",
    date:/^20\d\d-\d\d-\d\d$/.test(row.date) ? row.date : "",
    sourceId:bounded(row.sourceId,60),
    sourceUrl:validUrl(row.sourceUrl),
    tags:bounded(row.tags,220),
  });
}
function topicRecords(locale) {
  const lang = locale==="en"?"en":"ru";
  return KNOWLEDGE_TOPICS.map(x=>prepareKnowledgeRecord({
    id:x.id, category:"topic", title:x[lang], summary:x.summary, tags:x.keys,
    status:"curated_overview", sourceId:"Drive:Knowledge-Center"
  }));
}
function score(row,q,tokens) {
  if(!tokens.length) return 1;
  const title=squash(row.title), summary=squash(row.summary),
        tag=squash(row.tags), id=squash(row.id), source=squash(row.sourceId);
  let total=0;
  if(q && title.includes(q)) total+=12;
  for(const term of tokens){
    if(title.includes(term)) total+=7;
    if(tag.includes(term)) total+=4;
    if(id.includes(term) || source.includes(term)) total+=4;
    if(summary.includes(term)) total+=2;
  }
  return total;
}
/** Pure, bounded search; external Google Sheet values are untrusted TEXT. */
export function searchProjectKnowledge({ query="", category="all", locale="ru", records=[], limit=12 }={}) {
  const q=squash(typeof query==="string"?query.slice(0,160):"");
  const tokens=terms(q);
  const kind=CATEGORIES.has(category)?category:"all";
  const max=Number.isInteger(limit)?Math.max(1,Math.min(30,limit)):12;
  const collection=[...topicRecords(locale),...(
    Array.isArray(records)?records.slice(0,700).map(prepareKnowledgeRecord).filter(Boolean):[]
  )];
  return collection.filter(row=>kind==="all"||kind===row.category)
    .map(row=>({row,rank:score(row,q,tokens)}))
    .filter(item=>item.rank>0)
    .sort((a,b)=>b.rank-a.rank ||
      (a.row.category==="topic"?-1:0) - (b.row.category==="topic"?-1:0) ||
      a.row.id.localeCompare(b.row.id))
    .slice(0,max).map(x=>x.row);
}
/** For an owner-only project assistant. Never call this from a client agent. */
export function buildOwnerProjectContext({ownerAuthorized=false,query="",locale="ru",records=[]}={}) {
  if(ownerAuthorized!==true) return {status:"access_denied",results:[]};
  const hits=searchProjectKnowledge({query,locale,records,limit:6});
  return {
    status:hits.length?"matched":"no_match",
    provenance:records.length?"private_drive_readonly":"curated_overview_only",
    verifiedLive:false,
    results:hits.map(({id,category,title,summary,status,sourceId,date})=>({
      id,category,title,summary,status,sourceId,date
    })),
    caution:"Project decisions are not evidence of a production release; check exact GitHub HEAD, CI, Vercel and real E2E.",
  };
}
