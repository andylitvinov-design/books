/**
 * Deterministic, client-only Assist matching. No network, storage, diagnosis,
 * tracking or model inference. Unknown prices are not verified affordability.
 */
// Published in data/personal-service-pages.ts under servicePageShared.{locale}.price.
// Regression checks prevent either public source from silently drifting.
const VERIFIED_PERSONAL_PRICE_TIERS=Object.freeze([
 Object.freeze({minutes:30,eur:50}),Object.freeze({minutes:60,eur:100}),
]);
export const ASSIST_OFFER_CATALOG = Object.freeze({
  tests:         { topics:['stress','energy','health','growth','general'], modes:['self'], channels:['async'], cost:'free', family:'assessment' },
  review:        { topics:['relationships','health','work','growth','general'], modes:['human'], channels:['async'], cost:'free', family:'assessment' },
  opora:         { topics:['stress','energy','growth'], modes:['self'], channels:['async'], cost:'unknown', family:'course' },
  therapy:       { topics:['stress','relationships','health','work','growth'], modes:['human'], channels:['inperson','online'], cost:'priced', priceOptions:VERIFIED_PERSONAL_PRICE_TIERS, family:'session' },
  constellation: { topics:['relationships','work','growth'], modes:['human'], channels:['inperson','online'], cost:'priced', priceOptions:VERIFIED_PERSONAL_PRICE_TIERS, family:'session' },
  business:      { topics:['work','growth'], modes:['human'], channels:['online'], cost:'priced', priceOptions:VERIFIED_PERSONAL_PRICE_TIERS, family:'session' },
  reiki:         { topics:['stress','energy','growth'], modes:['human'], channels:['online','async'], cost:'unknown', family:'energy' },
  mandala:       { topics:['stress','energy','growth','general'], modes:['self','video'], channels:['async'], cost:'unknown', family:'symbolic' },
  talisman:      { topics:['growth','energy','general'], modes:['self'], channels:['async'], cost:'unknown', family:'symbolic' },
  homeopathy:    { topics:['general'], modes:['human'], channels:['online'], cost:'priced', priceOptions:VERIFIED_PERSONAL_PRICE_TIERS, family:'information', discoverOnly:true },
  masters:       { topics:['general','relationships','growth','work'], modes:['human'], channels:['online'], cost:'unknown', family:'directory' },
  academy:       { topics:['energy','growth','general'], modes:['self'], channels:['async'], cost:'unknown', family:'course' },
  mytube:        { topics:['stress','relationships','energy','growth','general'], modes:['video','self'], channels:['async'], cost:'free', family:'video' },
  aiCoach:       { topics:['stress','relationships','work','growth','general'], modes:['ai'], channels:['online','async'], cost:'unknown', family:'ai' },
});
const has = (text, pattern) => new RegExp(pattern, 'iu').test(text);
// Require a real word boundary: the letters "не" inside "мне" are not negation.
const negated = (text, term) => new RegExp(
  '(?:^|[^\\p{L}])(?:не(?:\\s+(?:хочу|надо|нужен|нужна|нужно))?|без|not|no|without|no quiero|sin)\\s+(?:[\\p{L}-]+\\s+){0,2}(?:' + term + ')',
  'iu',
).test(text);
/** Only explicit user preferences; never infer diagnoses or medical treatment. */
export function inferAssistPreferences(input) {
  const text = String(input || '').slice(0, 280);
  const preferences = {};
  // The €50/€100 Assist caps cannot represent CAD/USD; do not
  // silently treat another currency as euros or fake an exchange rate.
  const explicitOtherCurrency=/(?:\$\s*\d+|\b(?:cad|usd)\b\s*\d+|\b\d+\s*(?:cad|usd)\b)/iu.test(text) &&
    !/(?:€|\beur\b|\beuro\b|евро)/iu.test(text);
  const free = 'бесплатн[а-яё]*|\\bfree\\b|\\bgratis\\b|sin costo|sin coste';
  if (has(text, free) && !negated(text, 'бесплатн[а-яё]*|\\bfree\\b|\\bgratis\\b')) {
    preferences.budget = 'free';
  } else if (!explicitOtherCurrency && has(text, '(?:до|не более|under|up to|hasta|max(?:imum)?)\\s*(?:€|eur|euro|евро)?\\s*50(?:\\s*(?:€|eur|euro|евро))?\\b')) {
    preferences.budget = 'under50';
  } else if (!explicitOtherCurrency && has(text, '(?:до|не более|under|up to|hasta|max(?:imum)?)\\s*(?:€|eur|euro|евро)?\\s*100(?:\\s*(?:€|eur|euro|евро))?\\b')) {
    preferences.budget = 'under100';
  }
  const inPerson = 'очно|личн(?:ая|ую) встреч\\p{L}*|in.person|face.to.face|presencial';
  const online = 'по видеосвязи|видеозвон\\p{L}*|видеосесси\\p{L}*|онлайн\\s+(?:консультац\\p{L}*|сесси\\p{L}*|встреч\\p{L}*)|video.?call|online\\s+(?:consult\\p{L}*|session\\p{L}*|meeting)|(?:consulta|sesión)\\s+online|videollamada';
  const async = 'заочно|письменн\\p{L}*\\s+ответ\\p{L}*|без встречи|asynchronous|written\\s+reply|por escrito|sin cita';
  if (has(text,inPerson) && !negated(text,inPerson)) preferences.channel = 'inperson';
  else if (has(text,online) && !negated(text,online)) preferences.channel = 'online';
  else if (has(text,async)) preferences.channel = 'async';

  const human = 'с человеком|со специалистом|с консультантом|консультац\\p{L}*|консультант\\p{L}*|специалист\\p{L}*|психотерапевт\\p{L}*|психолог\\p{L}*|терапевт\\p{L}*|сесси\\p{L}*|видеозвон\\p{L}*|video.?call|with\\s+a\\s+person|human\\s+therapist|consult\\p{L}*|therap\\p{L}*|specialist\\p{L}*|appointment|con\\s+especialista|(?:consulta|sesión|especialista|profesional)';
  const ai = 'ии(?:\\s*|-)?(?:коуч|консультант|помощник)|с\\s+ии|ai\\s+(?:coach|assistant|guide|chat)|chatbot|con\\s+ia|inteligencia\\s+artificial';
  const viewing = '(?:(?:посмотреть|смотреть|послушать)\\s+(?:\\p{L}+\\s+){0,2}(?:видео|ролик\\p{L}*)|(?:watch|view|ver)\\s+(?:a\\s+|un\\s+|some\\s+)?videos?|mytube|youtube)';
  const video = 'видеоролик\\p{L}*|видео|ролик\\p{L}*|videos?';
  const self = 'самостоятельно|самому|самой|без\\s+(?:консультанта|специалиста)|self.guided|on\\s+my\\s+own|por\\s+mi\\s+cuenta';
  if (has(text,viewing) && !negated(text,video)) preferences.mode = 'video';
  else if (has(text,ai) && !negated(text,ai)) preferences.mode = 'ai';
  else if (has(text,human) && !negated(text,human)) preferences.mode = 'human';
  else if (has(text,video) && !negated(text,video) && !has(text,'видео\\s*консультац\\p{L}*|video\\s*consult\\p{L}*')) preferences.mode = 'video';
  else if (has(text,self)) preferences.mode = 'self';
  if (preferences.channel === 'inperson' || preferences.channel === 'online') preferences.mode ??= 'human';
  return preferences;
}
/** At most three short questions, each optional. */
export function nextAssistQuestion(preferences={}) {
  if(!preferences.mode) return 'mode';
  if(preferences.mode==='human'&&!preferences.channel) return 'channel';
  if(!preferences.budget) return 'budget';
  return null;
}
/** Relative match score only, never a likelihood of clinical effectiveness. */
export function rankAssistOffers(focus='general',preferences={},limit=3){
  const items=[];
  for(const [id,offer] of Object.entries(ASSIST_OFFER_CATALOG)){
    if(offer.discoverOnly) continue;
    if(preferences.budget==='free'&&offer.cost!=='free') continue;
    const budgetCeiling=preferences.budget==='under50'?50:preferences.budget==='under100'?100:null;
    // A hard ceiling requires a verified published tier, never an unknown price.
    if(budgetCeiling!==null&&offer.cost!=='free'&&
      !(offer.cost==='priced'&&offer.priceOptions?.some(tier=>tier.eur<=budgetCeiling)))continue;
    // Do not pad a topic shortlist with unrelated offers just to reach three cards.
    if(focus!=='general'&&!offer.topics.includes(focus)&&!offer.topics.includes('general'))continue;
    // User-selected interaction and delivery are eligibility requirements, not soft boosts.
    if(preferences.mode&&preferences.mode!=='any'&&!offer.modes.includes(preferences.mode)) continue;
    if(preferences.channel&&preferences.channel!=='any'&&!offer.channels.includes(preferences.channel)) continue;
    const topic=offer.topics.includes(focus)?1:(offer.topics.includes('general')||focus==='general'?0.55:0.1);
    const mode=!preferences.mode||preferences.mode==='any'?0.5:(offer.modes.includes(preferences.mode)?1:0);
    const channel=!preferences.channel||preferences.channel==='any'?0.5:(offer.channels.includes(preferences.channel)?1:0);
    const budget=!preferences.budget||preferences.budget==='any'?0.5:(offer.cost==='free'?1:offer.cost==='priced'&&budgetCeiling!==null?1:preferences.budget==='flexible'?0.75:0.25);
    const friction=offer.cost==='free'?1:0.5;
    const score=45*topic+25*mode+15*channel+10*budget+5*friction;
    items.push({id,score:Math.round(score*10)/10,family:offer.family});
  }
  items.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  const selected=[],used=new Set();
  // Diversity is a tie-breaker, not a reason to promote poorly matched offers.
  // Only diversify within eight points of the best scored option.
  const cutoff=(items[0]?.score ?? 0)-8;
  for(const item of items){
    if(item.score<cutoff||used.has(item.family)) continue;
    selected.push({id:item.id,score:item.score}); used.add(item.family);
    if(selected.length===limit) return selected;
  }
  for(const item of items){
    if(selected.some(x=>x.id===item.id)) continue;
    selected.push({id:item.id,score:item.score});
    if(selected.length===limit) break;
  }
  return selected;
}

/** The published price label is explanatory, not a payment, booking or universal fee. */
export function assistPriceLabel(id,locale='en'){
 const offer=ASSIST_OFFER_CATALOG[id];
 const language=['ru','en','es'].includes(locale)?locale:'en';
 if(offer?.cost==='free')return {ru:'Бесплатно',en:'Free',es:'Gratis'}[language];
 if(offer?.cost==='priced'&&offer.priceOptions?.length)return offer.priceOptions.map(tier=>
   language==='ru'?tier.minutes+' минут — €'+tier.eur:
   language==='es'?tier.minutes+' minutos — €'+tier.eur:
   tier.minutes+' minutes — €'+tier.eur).join('; ');
 return {ru:'Цена не подтверждена в общем каталоге — уточните в карточке услуги',
   en:'Price not verified in the general catalogue — check the service listing',
   es:'Precio no confirmado en el catálogo general — consulta la ficha del servicio'}[language];
}
