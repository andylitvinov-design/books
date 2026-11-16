/**
 * Ephemeral semantic hints from the EXISTING My Coach language-model turn.
 * These are not permissions, commitments, diagnoses, verified outcomes, or
 * evidence of consent. No model call, persistence, or vendor integration.
 */
import {understandCoachingTurn} from '../personal-coaching/coaching-turn-understanding.mjs'
export const COACH_SEMANTIC_EVIDENCE_VERSION='hh-coach-semantic-hint-v1'
export const COACH_SEMANTIC_KINDS=Object.freeze([
  'none','goal_focus','desired_outcome','concrete_example','constraint',
  'internal_obstacle','past_exception','existing_strength','positive_experience'
])
const kinds=new Set(COACH_SEMANTIC_KINDS)
const maxHint=180
const controls=/[\u0000-\u001f\u007f]/u
const doubt=/(?:\b(?:perhaps|maybe|might|suppose|hypothetically|what if|do i|could i|should i|not sure|i don't|i do not|i never|no longer)\b|(?:может быть|возможно|наверное|а если|вдруг|не знаю|пока не|не уверен|не уверена|я не|мне не)|(?:quiz[aá]s|tal vez|supongamos|y si|no s[eé]|no quiero|no estoy seguro|no estoy segura))/iu
const norm=s=>String(s||'').normalize('NFC').toLocaleLowerCase()
export function verifyCoachSemanticHint(candidate,source){
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate)||
    Object.keys(candidate).some(key=>!['kind','quote'].includes(key))||
    typeof candidate.kind!=='string'||!kinds.has(candidate.kind)||
    typeof candidate.quote!=='string')return null
  if(candidate.kind==='none')return null
  const quote=candidate.quote.trim()
  if(quote.length<10||quote.length>maxHint||quote!==candidate.quote||
    controls.test(quote)||/[?？]/u.test(quote)||doubt.test(quote))return null
  const text=typeof source==='string'?source:''
  if(!text||!norm(text).includes(norm(quote)))return null
  return Object.freeze({kind:candidate.kind,quote})
}
/** A browser-submitted hint is only a quoted label backed by a RECENT user turn.
 * It cannot grant an action/consent/review, change methods, or assert truth.
 * A correction or topic switch revokes older hints. Never read assistant text.
 */
export function verifiedPriorCoachHints(input={}){
 const submitted=input?.semanticHints
 if(!Array.isArray(submitted)||submitted.length>3)return []
 const turns=(Array.isArray(input.turns)?input.turns:[])
 const history=turns.filter(x=>x?.role==='user'&&typeof x.content==='string')
 const locale=input.locale||'en'
 const resetCurrent=understandCoachingTurn({locale,message:input.message||''}).act
 if(['topic_shift','correction'].includes(resetCurrent))return []
 let reset=-1
 for(let i=0;i<history.length;i++){
   const act=understandCoachingTurn({locale,message:history[i].content}).act
   if(['topic_shift','correction'].includes(act))reset=i
 }
 const remaining=history.slice(reset+1).map(row=>row.content)
 const accepted=[]
 for(const row of submitted){
  const verified=remaining.map(text=>verifyCoachSemanticHint(row,text)).find(Boolean)
  if(verified&&!accepted.some(x=>x.kind===verified.kind&&x.quote===verified.quote))
    accepted.push(verified)
 }
 return accepted.slice(-3)
}
export function applyCoachSemanticHints(input={},base={}){
 const soft=verifiedPriorCoachHints(input)
 const has=kind=>soft.some(row=>row.kind===kind)
 // Goal confirmation, user-selected action, timing, feasibility, if/then plan,
 // summary review, and consent are NEVER inferred from semantic model hints.
 return Object.freeze({
  ...base,
  goalRestated:Boolean(base.goalRestated||has('goal_focus')),
  keyFactsCaptured:Boolean(base.keyFactsCaptured||has('concrete_example')),
  constraintsReviewed:Boolean(base.constraintsReviewed||has('constraint')),
  desiredOutcome:Boolean(base.desiredOutcome||has('desired_outcome')),
  internalObstacle:Boolean(base.internalObstacle||has('internal_obstacle')),
  pastException:Boolean(base.pastException||has('past_exception')),
  existingStrength:Boolean(base.existingStrength||has('existing_strength')),
  positiveExperience:Boolean(base.positiveExperience||has('positive_experience')),
 })
}
