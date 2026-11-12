/**
 * Deterministic, client-only Assist matching. No network, storage, diagnosis,
 * tracking or model inference. Unknown prices are not verified affordability.
 */
export const ASSIST_OFFER_CATALOG = Object.freeze({
  tests:         { topics:['stress','energy','health','growth','general'], modes:['self'], channels:['async'], cost:'free', family:'assessment' },
  review:        { topics:['relationships','health','work','growth','general'], modes:['human'], channels:['async'], cost:'free', family:'assessment' },
  opora:         { topics:['stress','energy','growth'], modes:['self'], channels:['async'], cost:'unknown', family:'course' },
  therapy:       { topics:['stress','relationships','health','work','growth'], modes:['human'], channels:['inperson','online'], cost:'unknown', family:'session' },
  constellation: { topics:['relationships','work','growth'], modes:['human'], channels:['inperson','online'], cost:'unknown', family:'session' },
  business:      { topics:['work','growth'], modes:['human'], channels:['online'], cost:'unknown', family:'session' },
  reiki:         { topics:['stress','energy','growth'], modes:['human'], channels:['online','async'], cost:'unknown', family:'energy' },
  mandala:       { topics:['stress','energy','growth','general'], modes:['self','video'], channels:['async'], cost:'unknown', family:'symbolic' },
  talisman:      { topics:['growth','energy','general'], modes:['self'], channels:['async'], cost:'unknown', family:'symbolic' },
  homeopathy:    { topics:['general'], modes:['human'], channels:['online'], cost:'unknown', family:'information', discoverOnly:true },
  masters:       { topics:['general','relationships','growth','work'], modes:['human'], channels:['online'], cost:'unknown', family:'directory' },
  academy:       { topics:['energy','growth','general'], modes:['self'], channels:['async'], cost:'unknown', family:'course' },
  mytube:        { topics:['stress','relationships','energy','growth','general'], modes:['video','self'], channels:['async'], cost:'free', family:'video' },
  aiCoach:       { topics:['stress','relationships','work','growth','general'], modes:['ai'], channels:['online','async'], cost:'unknown', family:'ai' },
});
const negative = (text, term) => new RegExp('(?:не хочу|не надо|без|not|no|sin|no quiero)\\s+(?:\\w+\\s+){0,2}(?:'+term+')','i').test(text);
/** Do not repeat preferences already stated by the visitor. */
export function inferAssistPreferences(input) {
  const text=String(input||'').slice(0,280);
  const preferences={};
  if (/(?:^|[^\p{L}])(?:бесплатно|бесплатный|free|gratis|sin costo)(?=$|[^\p{L}])/iu.test(text)) preferences.budget='free';
  else if (/(?:до|under|hasta)\s*(?:€|eur|euro|евро|\$|cad)?\s*50\b/i.test(text)) preferences.budget='under50';
  else if (/(?:до|under|hasta)\s*(?:€|eur|euro|евро|\$|cad)?\s*100\b/i.test(text)) preferences.budget='under100';
  if (/(?:очно|личная встреча|in.person|face.to.face|presencial)/i.test(text) && !negative(text,'очно|встреча|in.person|presencial')) preferences.channel='inperson';
  else if (/(?:по видеосвязи|онлайн встреч|онлайн сесс|video.?call|online session|videollamada)/i.test(text) && !negative(text,'онлайн|video|online')) preferences.channel='online';
  else if (/(?:заочно|письменный ответ|без встречи|asynchronous|written reply|por escrito|sin cita)/i.test(text)) preferences.channel='async';
  if (/(?:с человеком|со специалистом|с консультантом|психотерапевт|with a person|human therapist|con especialista)/i.test(text) && !negative(text,'человеком|специалистом|консультантом|person|therapist')) preferences.mode='human';
  else if (/(?:ии.коуч|ии консультант|с ии|ai coach|ai assistant|con ia)/i.test(text) && !negative(text,'ии|ai|ia')) preferences.mode='ai';
  else if (/(?:посмотреть видео|видеоролик|смотреть ролик|watch videos?|ver videos?)/i.test(text) && !negative(text,'видео|ролик|videos?')) preferences.mode='video';
  else if (/(?:самостоятельно|самому|самой|self.guided|on my own|por mi cuenta)/i.test(text)) preferences.mode='self';
  if(preferences.channel==='inperson'||preferences.channel==='online') preferences.mode??='human';
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
    if(preferences.mode==='human'&&preferences.channel==='inperson'&&!offer.channels.includes('inperson')) continue;
    const topic=offer.topics.includes(focus)?1:(offer.topics.includes('general')||focus==='general'?0.55:0.1);
    const mode=!preferences.mode||preferences.mode==='any'?0.5:(offer.modes.includes(preferences.mode)?1:0);
    const channel=!preferences.channel||preferences.channel==='any'?0.5:(offer.channels.includes(preferences.channel)?1:0);
    const budget=!preferences.budget||preferences.budget==='any'?0.5:(offer.cost==='free'?1:preferences.budget==='flexible'?0.75:0.25);
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
