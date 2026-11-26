/** Search Console query/page opportunities, Unicode-aware EN/RU/ES.
 * Inputs are visible GSC rows, not complete search demand. No traffic forecasts or writes.
 */
const word = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const match = pattern => new RegExp('(?:^|[^\\p{L}\\p{N}])(?:'+pattern+')(?:$|[^\\p{L}\\p{N}])','iu');
const starts = pattern => new RegExp('^(?:'+pattern+')(?:$|[^\\p{L}\\p{N}])','iu');
const rules = [
 ['questions','Questions','Вопросы','Preguntas',starts('who|what|when|where|why|how|which|can|could|should|would|will|do|does|did|is|are|was|were|has|have|кто|что|когда|где|куда|зачем|почему|как|како[йеая]|какие|можно ли|нужно ли|сколько|qué|que|quién|quien|cuándo|cuando|dónde|donde|por qué|por que|cómo|como|cuál|cual|cuánto|cuanto|puedo|debo|es|son')],
 ['ai_style','Prompt-style','Запросы в стиле ИИ','Estilo de prompt',starts('give me|show me|help me|explain|list|tell me|объясни|покажи|расскажи|помоги|перечисли|дай|dame|muéstrame|explica|ayúdame|lista|dime')],
 ['how_to','How-to / guides','Инструкции','Guías',match('how to|guide|tutorial|step by step|как|инструкци[яи]|руководство|пошагово|cómo|como|guía|guia|tutorial|paso a paso')],
 ['learning','Learning','Обучение','Aprendizaje',match('learn|learning|training|course[s]?|lesson[s]?|обуч[\\p{L}]*|курс[\\p{L}]*|урок[\\p{L}]*|науч[\\p{L}]*|aprender|aprendizaje|curso[s]?|formación|formacion|clase[s]?')],
 ['definition','Definitions','Определения','Definiciones',match('meaning of|definition|define|what is|means?|что такое|значение|определение|qué es|que es|significado|definición|definicion')],
 ['faq','FAQ-style','Частые вопросы','Preguntas frecuentes',starts('can|could|should|would|does|is|are|можно ли|нужно ли|стоит ли|является ли|как часто|puedo|puede|debo|debería|es|son|se puede')],
 ['troubleshooting','Problems','Проблемы','Problemas',match('problem[s]?|issue[s]?|fix|error[s]?|not working|проблем[\\p{L}]*|ошибк[\\p{L}]*|не работает|исправить|problema[s]?|error[\\p{L}]*|no funciona|solucionar')],
 ['comparison','Comparisons','Сравнения','Comparaciones',match('vs|versus|compare|comparison|alternative[s]?|сравн[\\p{L}]*|разниц[\\p{L}]*|отлич[\\p{L}]*|альтернатив[\\p{L}]*|comparar|comparación|comparacion|diferencia[s]?|alternativa[s]?')],
 ['pricing','Price','Стоимость','Precio',match('price[s]?|pricing|cost[s]?|fee[s]?|how much|стоимость|цен[аыуе]|сколько стоит|тариф[\\p{L}]*|precio[s]?|costo[s]?|coste[s]?|tarifa[s]?|cuánto cuesta|cuanto cuesta')],
 ['reviews','Reviews','Отзывы','Reseñas',match('review[s]?|rating[s]?|testimonial[s]?|отзыв[\\p{L}]*|рейтинг[\\p{L}]*|reseña[s]?|opinión|opiniones|valoración|valoracion')],
 ['best','Recommendations','Рекомендации','Recomendaciones',match('best|top|better|cheapest|recommended|лучш[\\p{L}]*|топ|рекоменд[\\p{L}]*|недорог[\\p{L}]*|mejor[\\p{L}]*|recomendad[\\p{L}]*|barat[\\p{L}]*')],
 ['transaction','Transactional','Запись / покупка','Reserva / compra',match('buy|purchase|book|booking|reserve|appointment|discount|deal|купить|покупк[\\p{L}]*|записа[\\p{L}]*|запись|забронировать|скидк[\\p{L}]*|comprar|reservar|reserva|cita|descuento')],
 ['freshness','Freshness','Актуальность','Actualidad',match('latest|new|updated|recent|20[2-9][0-9]|нов[\\p{L}]*|свеж[\\p{L}]*|актуальн[\\p{L}]*|últim[\\p{L}]*|ultim[\\p{L}]*|nuevo[s]?|actualizado[s]?|reciente[s]?')],
 ['trust','Support / trust','Доверие / поддержка','Confianza / soporte',match('support|warranty|refund|legit|safe|поддержк[\\p{L}]*|гаранти[\\p{L}]*|возврат|безопасн[\\p{L}]*|soporte|garantía|garantia|reembolso|segur[\\p{L}]*')],
 ['features','Features','Характеристики','Características',match('feature[s]?|specification[s]?|option[s]?|format[s]?|формат[\\p{L}]*|вариант[\\p{L}]*|характеристик[\\p{L}]*|característica[s]?|caracteristica[s]?|opci[oó]n|opciones|formato[s]?')],
 ['tools','Tools','Инструменты','Herramientas',match('tool[s]?|software|app[s]?|platform[s]?|инструмент[\\p{L}]*|приложени[\\p{L}]*|платформ[\\p{L}]*|herramienta[s]?|aplicación|aplicacion|aplicaciones|plataforma[s]?')],
 ['availability','Local / availability','Локальные / доступность','Local / disponibilidad',match('available|online|near me|in stock|toronto|canada|доступ[\\p{L}]*|онлайн|рядом|торонто|канада|disponible[s]?|en línea|en linea|cerca de mí|cerca de mi|toronto|canadá')],
 ['free','Free','Бесплатно','Gratis',match('free|no cost|бесплат[\\p{L}]*|gratis|gratuit[\\p{L}]*|sin costo')],
 ['initiation','Reiki / initiation','Рейки / инициации','Reiki / iniciación',match('reiki|initiation[s]?|attunement[s]?|рейки|инициа[\\p{L}]*|iniciaci[oó]n|sintonizaci[oó]n')],
 ['consultation','Consultation','Консультации','Consultas',match('consultation[s]?|session[s]?|coaching|therap[\\p{L}]*|консультац[\\p{L}]*|сесси[\\p{L}]*|коуч[\\p{L}]*|терап[\\p{L}]*|consulta[s]?|sesi[oó]n|sesiones|terapia')]
];
const long = [['long4','4+ words','4+ слов','4+ palabras',4],['long8','8+ words','8+ слов','8+ palabras',8],['long10','10+ words','10+ слов','10+ palabras',10]];
const insights = [
 ['quick_win','Quick wins','Быстрые улучшения','Mejoras rápidas'],
 ['low_ctr','Low CTR','Низкий CTR','CTR bajo'],
 ['rising','Rising demand','Рост показов','Impresiones crecientes'],
 ['decay','Declining visibility','Падение видимости','Visibilidad decreciente'],
 ['overlap','Potential overlap','Возможная каннибализация','Posible solapamiento'],
 ['conversion','Commercial intent','Коммерческий запрос','Intención comercial'],
 ['content_review','Content / answer review','Проверка полноты ответа','Revisar contenido'],
 ['language_review','Query / page language review','Проверка языка страницы','Revisar idioma de página']
];
export const opportunityFilters = [...long,...rules,...insights].map(([id,en,ru,es])=>({id,en,ru,es}));
export function classifyQuery(input) {
 const q=String(input??'').normalize('NFKC').trim().replace(/\s+/gu,' ');
 const count=(q.match(word)||[]).length;
 return [...long.filter(r=>count>=r[4]).map(r=>r[0]),...rules.filter(r=>r[4].test(q)).map(r=>r[0])];
}
const site='https://holistichouse.vercel.app';
const privateSegment=/^(?:admin|api|app|client|clients|report|reports|prescriptions|documents|document-preview|cabinet|account|login|auth|checkout|payment|payments|assessment|assessments|result|results|daybook|session|sessions)$/i;
export function canonicalOpportunityPath(raw, allowlist) {
 try {
  const u=new URL(raw);
  if(u.origin!==site||u.username||u.password||u.search||u.hash||u.pathname.includes('%')||u.pathname.includes('//'))return null;
  const p=u.pathname.replace(/\/$/,'')||'/';
  if(p.split('/').some(s=>privateSegment.test(s))||!allowlist.has(p))return null;
  return p;
 } catch{return null}
}
function safeQuery(value) {
 if(typeof value!=='string'||value.length>160||/[\p{Cc}\p{Cf}]/u.test(value)||/@|https?:\/\/|(?:\+?\d[\d .()-]{7,}\d)/iu.test(value))return null;
 return value.normalize('NFKC').trim().replace(/\s+/gu,' ')||null;
}
function normalizeRows(rows, allowlist) {
 const byKey=new Map();
 for(const r of rows||[]) {
  const q=safeQuery(r?.keys?.[0]),path=canonicalOpportunityPath(r?.keys?.[1],allowlist);
  const {clicks,impressions,position}=r||{};
  if(!q||!path||!Number.isSafeInteger(clicks)||!Number.isSafeInteger(impressions)||impressions<=0||clicks<0||clicks>impressions||!Number.isFinite(position)||position<1)continue;
  const key=JSON.stringify([q,path]);
  if(!byKey.has(key))byKey.set(key,{key,query:q,path,clicks,impressions,position,ctr:clicks/impressions,locale:path.match(/^\/(en|ru|es)(?:\/|$)/)?.[1]||'other'});
 }
 return byKey;
}
const commercial=['pricing','transaction','consultation','free','initiation','learning','availability'];
const answers=['questions','faq','how_to','definition','ai_style','long8'];
// Heuristic thresholds, not industry benchmarks; no promised incremental clicks.
const target=p=>p<=3?.08:p<=10?.025:p<=20?.01:0;
function language(q) {
 if(/\p{Script=Cyrillic}/u.test(q))return 'ru';
 if(/[¿¡ñáéíóúü]/iu.test(q)||match('qué|que es|cómo|como|por qué|precio|gratis|curso|terapia|consulta|cerca de').test(q))return 'es';
 if(match('what|how|where|why|free|price|cost|training|near me|book|session').test(q))return 'en';
 return null;
}
export function buildOpportunityReport({current=[],previous=[],allowlist,previousAvailable=true}) {
 const now=normalizeRows(current,allowlist),before=normalizeRows(previous,allowlist),groups=new Map();
 for(const row of now.values()){
  const key=row.locale+'|'+row.query.toLowerCase();
  const g=groups.get(key)||[];g.push(row);groups.set(key,g);
 }
 const items=[];
 for(const row of now.values()){
  const tags=classifyQuery(row.query),prior=previousAvailable?before.get(row.key):null;
  const low=row.impressions>=30&&row.ctr<target(row.position)*.7;
  const quick=row.impressions>=10&&row.position>=4&&row.position<=20;
  const intent=tags.some(t=>commercial.includes(t)),answer=tags.some(t=>answers.includes(t));
  const candidates=groups.get(row.locale+'|'+row.query.toLowerCase())||[];
  const overlap=candidates.filter(r=>r.impressions>=10).sort((a,b)=>b.impressions-a.impressions);
  const competing=overlap.length>=2&&overlap[1].impressions>=overlap[0].impressions*.25;
  const rising=!!prior&&prior.impressions>=10&&row.impressions>=prior.impressions*1.3&&row.impressions-prior.impressions>=10;
  const decay=!!prior&&prior.impressions>=20&&row.impressions<=prior.impressions*.7;
  const detected=language(row.query);
  const languageReview=detected&&row.locale!=='other'&&row.locale!==detected;
  if(quick)tags.push('quick_win');if(low)tags.push('low_ctr');if(rising)tags.push('rising');if(decay)tags.push('decay');
  if(competing&&row.impressions>=10)tags.push('overlap');if(intent)tags.push('conversion');if(answer)tags.push('content_review');if(languageReview)tags.push('language_review');
  const score=Math.min(100,Math.round(Math.min(40,Math.log10(1+row.impressions)*13)+(quick?22:0)+(low?15:0)+(intent?10:0)+(rising?8:0)+(decay?12:0)+(competing?8:0)+(answer?5:0)));
  const action=tags.includes('overlap')?'review_overlap':decay?'review_decay':languageReview?'review_language':low?'review_snippet':answer?'review_answer':intent?'review_offer':'review_relevance';
  items.push({...row,tags,score,action,priorImpressions:prior?.impressions??null,priorClicks:prior?.clicks??null,priorPosition:prior?.position??null,competingPaths:competing?overlap.filter(r=>r.path!==row.path).map(r=>r.path):[]});
 }
 items.sort((a,b)=>b.score-a.score||b.impressions-a.impressions||a.key.localeCompare(b.key));
 const counts=Object.fromEntries(opportunityFilters.map(f=>[f.id,items.filter(r=>r.tags.includes(f.id)).length]));
 return {items,counts,visibleRows:items.length,discardedRows:current.length-now.size};
}
export function selectOpportunities(report,{filter='all',locale='all',limit=40}={}) {
 const rows=report.items.filter(r=>(filter==='all'||r.tags.includes(filter))&&(locale==='all'||r.locale===locale));
 return {total:rows.length,items:rows.slice(0,limit)};
}
