/**
 * Acquaintance is a personal, optional introduction, not express_intro,
 * introductory (Wheel of Life), therapy, or a paid course.
 * Pure domain contract: NO provider authorization, storage or UI side effects.
 * Do not expose a launch until private provider + authenticated persistence are wired.
 */
export const COACH_ACQUAINTANCE_ID = 'acquaintance'
export const COACH_ACQUAINTANCE_VERSION = 'hh-coach-acquaintance-v1'
export const COACH_ACQUAINTANCE_TARGET_SECONDS = 300
const C = (en,ru,es) => Object.freeze({en,ru,es})
const local = locale => ['en','ru','es'].includes(locale) ? locale : 'en'
export const ACQUAINTANCE_COPY = Object.freeze({
 title:C('Get to know me','Знакомство','Conóceme'),
 description:C('A conversation to understand you and how to support you.','Разговор, чтобы лучше понять вас и то, какая поддержка вам подходит.','Una conversación para conocerte y entender qué apoyo te sirve.'),
 review:C('Have I understood the important things about you correctly?','Я правильно понял главное о вас?','¿He entendido bien lo más importante sobre ti?'),
 share:C('May I save the information you approve in your private profile so your other AI coaches can use it when you allow them?','Можно сохранить сведения, которые вы подтвердите, в вашем личном профиле, чтобы другие AI-коучи могли учитывать их с вашего разрешения?','¿Puedo guardar los datos que apruebes en tu perfil privado para que otros coaches de IA los usen cuando lo autorices?')
})
const stage = (id,start,end,fields,title,question) => Object.freeze({id,start,end,fields:Object.freeze(fields),title,question})
export const ACQUAINTANCE_STAGES = Object.freeze([
 stage('contact',0,40,['preferred_name'],C('Contact and name','Контакт и имя','Contacto y nombre'),C('What would you like me to call you?','Как мне лучше к вам обращаться?','¿Cómo prefieres que te llame?')),
 stage('life_context',40,90,['life_context'],C('Life context','Личный контекст','Contexto vital'),C('Tell me a little about yourself. What fills your life these days?','Расскажите немного о себе. Чем сейчас наполнена ваша жизнь?','Cuéntame un poco de ti. ¿Qué ocupa tu vida estos días?')),
 stage('priorities',90,140,['priorities'],C('What matters now','Что сейчас важно','Qué importa ahora'),C('What has been on your mind most recently?','Что сейчас занимает ваши мысли больше всего?','¿Qué ha ocupado más tus pensamientos últimamente?')),
 stage('direction',140,190,['aspirations','values'],C('Hopes and values','Желания и ценности','Deseos y valores'),C('What would you like to have more of in your life?','Чего вам хотелось бы больше в своей жизни?','¿Qué te gustaría tener más en tu vida?')),
 stage('support',190,250,['support_preferences','resources','boundaries'],C('Support that suits you','Индивидуальная поддержка','Apoyo a tu medida'),C('What kind of support or conversation tends to be most helpful for you?','Какой формат поддержки или разговора вам больше подходит?','¿Qué tipo de apoyo o conversación suele ayudarte más?')),
 stage('review',250,300,[],C('Review and close','Понимание и завершение','Revisión y cierre'),ACQUAINTANCE_COPY.review)
])
export const ACQUAINTANCE_FIELDS = Object.freeze(ACQUAINTANCE_STAGES.flatMap(s=>s.fields))
export function acquaintanceScenario(locale='en'){
 const l=local(locale)
 return {id:COACH_ACQUAINTANCE_ID,version:COACH_ACQUAINTANCE_VERSION,targetSeconds:COACH_ACQUAINTANCE_TARGET_SECONDS,title:ACQUAINTANCE_COPY.title[l],description:ACQUAINTANCE_COPY.description[l],stages:ACQUAINTANCE_STAGES.map(s=>({id:s.id,start:s.start,end:s.end,fields:[...s.fields],title:s.title[l],question:s.question[l]}))}
}
// Compose with the registered persona/voice and safety policy only after
// the provider is approved for personal data. Do not compose with express,
// mandatory course questionnaire, assessment, or therapy instructions.
export function acquaintanceInstruction(locale='en'){
 const l=local(locale)
 return [
  'ACQUAINTANCE ONLY: optional supportive first contact. Speak '+({en:'English',ru:'Russian',es:'Spanish'})[l]+'. Introduce yourself accurately as an AI coach. Ask explicit consent to begin; choice of mode alone is not consent.',
  'Use the registered persona and locked voice, with genuine warmth and respect. One question at a time. Respond to what the client actually said first: specific reflection, tentative emotional understanding, then a natural relevant question. Do not assume feelings, diagnose, flatter, promise outcomes, simulate human attachment, or pressure the client to disclose.',
  'Use an already authorized confirmed preferred name when available; otherwise ask how to address the client. On explicit correction, ask whether the new name is correct. Never repeatedly ask an already answered or skipped field.',
  'Stages and suggested active seconds (not quotas, consent, or evidence): '+acquaintanceScenario(l).stages.map(s=>s.title+' '+s.start+'–'+s.end+': '+s.question).join(' / '),
  'If the client offers several relevant facts naturally, do not interrogate them for each slot. Allow skips and explicit stop; do not propose a pause or postponement during ordinary dialogue. Follow the safety policy for risk. Do not initiate therapy, scores, homework, sales, or a full coaching course.',
  'Keep transient feelings and priorities dated, not permanent traits. Distinguish the client’s own words from reflections or third-party claims. No inferred diagnosis, intimate history, government ID, address, or other unnecessary details.',
  'Before normal close, reflect only the key information the client actually shared, ask '+ACQUAINTANCE_COPY.review[l]+' and accept corrections. Ask separately '+ACQUAINTANCE_COPY.share[l]+' Consent to chat, autosave, profile sharing, and sending personal data to an approved provider are distinct. Do not claim to have saved anything until the server acknowledges it.',
  'Five minutes is a suggested target, not a hard end or obligation. Missing/declined fields remain unknown. Never sacrifice a meaningful emotional response to complete the checklist.'
 ].join('\n')
}
const clean = v => typeof v==='string' ? v.trim() : ''
const validId = v => typeof v==='string' && /^[a-z0-9][a-z0-9._:-]{0,95}$/iu.test(v)
const iso = v => typeof v==='string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null
const invalid = ()=>{throw Error('COACH_ACQUAINTANCE_INVALID')}
/**
 * Server-side domain reducer. Caller MUST load the authenticated owner's
 * current encrypted singleton within a transaction, verify explicit sharing
 * consent + exact reviewed client evidence, then compare-and-swap revision.
 * Never call directly on model output/browser claims. No DB/authorization here.
 * Incoming events are explicitly approved field-level patches. Omission is
 * not deletion; clearing writes a tombstone so older data cannot resurface.
 */
export function applyReviewedAcquaintance(previous,{expectedRevision,protocolId,recordedAt,changes,shareApproved}={}){
 if(shareApproved!==true)throw Error('COACH_ACQUAINTANCE_CONSENT_REQUIRED')
 const time=iso(recordedAt)
 if(!validId(protocolId)||!time||!Array.isArray(changes)||!changes.length||changes.length>ACQUAINTANCE_FIELDS.length)invalid()
 const current=previous??{version:COACH_ACQUAINTANCE_VERSION,revision:0,fields:{}}
 if(current.version!==COACH_ACQUAINTANCE_VERSION||!Number.isSafeInteger(current.revision)||current.revision<0||!current.fields||Array.isArray(current.fields)||typeof current.fields!=='object')invalid()
 if(expectedRevision!==current.revision)throw Error('COACH_ACQUAINTANCE_REVISION_CONFLICT')
 const fields={...current.fields},seen=new Set()
 for(const change of changes){
  if(!change||!ACQUAINTANCE_FIELDS.includes(change.field)||seen.has(change.field)||!validId(change.turnId))invalid()
  seen.add(change.field)
  if(!['confirmed','cleared'].includes(change.status))invalid()
  const prior=fields[change.field]
  if(prior&&(!iso(prior.recordedAt)||Date.parse(prior.recordedAt)>Date.parse(time)))throw Error('COACH_ACQUAINTANCE_STALE_EVIDENCE')
  const value=clean(change.value),quote=clean(change.quote)
  if(!quote||quote.length>600||/[\u0000-\u001f\u007f]/u.test(quote))invalid()
  if(change.status==='confirmed'){
   // Exact source, not an AI paraphrase. Name must use the existing trusted
   // identity preference path before this adapter is permitted to commit.
   if(!value||value.length>(change.field==='preferred_name'?60:400)||value!==quote)invalid()
  }else if(value)invalid()
  fields[change.field]={status:change.status,value:change.status==='confirmed'?value:null,recordedAt:time,source:{protocolId,turnId:change.turnId,quote}}
 }
 return {version:COACH_ACQUAINTANCE_VERSION,revision:current.revision+1,fields}
}
/** Narrow historical projection, only after current owner/recipient consent.
 * Do not send the source quote, protocol ID, or raw transcript to a model. */
export function projectAcquaintanceProfile(record,{allowedFields=[],shareApproved=false}={}){
 if(shareApproved!==true||record?.version!==COACH_ACQUAINTANCE_VERSION||!Array.isArray(allowedFields))return []
 return ACQUAINTANCE_FIELDS.filter(id=>allowedFields.includes(id)).flatMap(id=>{
  const entry=record.fields?.[id]
  if(entry?.status!=='confirmed'||!iso(entry.recordedAt)||!clean(entry.value)||entry.value.length>(id==='preferred_name'?60:400)||!validId(entry.source?.protocolId)||!validId(entry.source?.turnId)||entry.source?.quote!==entry.value)return []
  return [{id,value:entry.value,recordedAt:entry.recordedAt,source:'client_reviewed_acquaintance',historical:true}]
 })
}
