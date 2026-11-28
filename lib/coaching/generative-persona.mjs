import {buildCoachBehaviorPolicy, getCoachPersona, normalizeCoachSettings} from './persona-registry.mjs'
import {normalizeCoachingBrainInput} from '../personal-coaching/coaching-brain.mjs'
import {normalizeCoachCharacterSeenIds} from './coach-character-signature.mjs'
import {normalizeCoachElapsedSeconds} from './session-timebox.mjs'
import {verifiedPriorCoachHints} from './semantic-evidence.mjs'
import {normalizeCoachCourseSessionId} from './coach-course-journey.mjs'

// A signed-in My Coach conversation is ephemeral, not a saved Personal Coaching
// session. This internal pointer is used only to reuse the reviewed validator.
const ephemeralSessionId='00000000-0000-4000-8000-000000000001'
const fields=new Set(['personaId','settings','locale','consent','message','turns','elapsedSeconds','sessionContext','semanticHints','voiceTurn','engine','geminiConsent','geminiFreeDataConsent','contextTopic','contextAssessments','openingHistory','openingPrior','allowOpeningPrior','memoryStageToken','memorySharePrior','memoryShareGoals','memoryShareTests','memoryShareReviewedFields','contextSessionToken','courseSessionId','characterSeenIds','contactElapsedSeconds'])
const settingFields=new Set(['warmth','directness','pace','depth','questionsPerTurn'])

export function normalizeGenerativeCoachInput(body) {
  if (!body || typeof body!=='object' || Array.isArray(body) ||
      Object.keys(body).some(key=>!fields.has(key)) ||
      typeof body.personaId!=='string' || !getCoachPersona(body.personaId))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.engine!==undefined&&!['gemini_free','gemini_paid'].includes(body.engine))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.contextTopic!==undefined&&(typeof body.contextTopic!=='string'||!/^[a-z_]{1,32}$/.test(body.contextTopic)))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.contextAssessments!==undefined&&typeof body.contextAssessments!=='boolean')
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.engine&&(body.geminiConsent!==true||
    (body.engine==='gemini_free'&&body.geminiFreeDataConsent!==true)))
    throw Error('COACHING_GEMINI_CONSENT_REQUIRED')
  if(!body.engine&&(body.geminiConsent!==undefined||body.geminiFreeDataConsent!==undefined))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if (body.voiceTurn!==undefined && typeof body.voiceTurn!=='boolean')
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if (body.settings!==undefined &&
      (!body.settings || typeof body.settings!=='object' || Array.isArray(body.settings) ||
       Object.keys(body.settings).some(key=>!settingFields.has(key)) ||
       (body.settings.questionsPerTurn!==undefined && body.settings.questionsPerTurn!==1)))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  // Reuse one consent, length, history, secret and language validator; never
  // accept caller-supplied session or system instructions.
  const input=normalizeCoachingBrainInput({
    sessionId:ephemeralSessionId,locale:body.locale,consent:body.consent,
    message:body.message,turns:body.turns,
  })
  // Memory snippets are untrusted data, never method/stage/consent evidence.
  // Validate with the SAME sensitive-text gate used for live client messages.
  const sessionContext=body.sessionContext===undefined?[]:body.sessionContext
  if(!Array.isArray(sessionContext)||sessionContext.length>3||
    sessionContext.some(text=>typeof text!=='string'||text.trim().length<8||
      text.length>220||text!==text.trim()))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(sessionContext.length)normalizeCoachingBrainInput({
    sessionId:ephemeralSessionId,locale:body.locale,consent:body.consent,
    message:sessionContext.join('\n'),turns:[],
  })
  // The first 6 gates must survive a bounded sliding provider window. These
  // entries are user-only, per-tab statements, not AI-proven consent or a DB
  // archive. They never enter the model context just because they exist.
  const openingHistory=body.openingHistory===undefined?undefined:body.openingHistory
  if(openingHistory!==undefined&&(!Array.isArray(openingHistory)||openingHistory.length>32||
    openingHistory.some(v=>typeof v!=='string'||v.length>500||!v.trim())))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.memoryStageToken!==undefined&&(
    typeof body.memoryStageToken!=='string'||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[0-9]{13}\.[np]\.[0-9a-f]{64}$/.test(body.memoryStageToken)))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.contextSessionToken!==undefined&&(
    !body.memoryStageToken||typeof body.contextSessionToken!=='string'||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.[0-9]{13}\.[0-9a-f]{64}$/.test(body.contextSessionToken)))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  for(const flag of ['memorySharePrior','memoryShareGoals','memoryShareTests','memoryShareReviewedFields']){
    if(body[flag]!==undefined&&typeof body[flag]!=='boolean')
      throw Error('COACHING_BRAIN_INPUT_INVALID')
    if(body[flag]===true&&!body.memoryStageToken)
      throw Error('COACHING_BRAIN_INPUT_INVALID')
  }
  if(body.memoryShareReviewedFields===true&&(body.memorySharePrior!==true||body.allowOpeningPrior!==true))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.allowOpeningPrior!==undefined&&typeof body.allowOpeningPrior!=='boolean')
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  if(body.openingPrior!==undefined&&(
    body.allowOpeningPrior!==true||!body.openingPrior||
    typeof body.openingPrior!=='object'||Array.isArray(body.openingPrior)||
    Object.keys(body.openingPrior).some(k=>!['name','topic'].includes(k))||
    ['name','topic'].some(k=>body.openingPrior[k]!==undefined&&(
      typeof body.openingPrior[k]!=='string'||body.openingPrior[k].length>150))))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  // Only user-authored quotes already in the validated recent history survive.
  // These hints never represent consent, a chosen action or a saved state.
  const requestedHints=body.semanticHints===undefined?[]:body.semanticHints
  if(!Array.isArray(requestedHints)||requestedHints.length>3||
    requestedHints.some(v=>!v||typeof v!=='object'||Array.isArray(v)||
      Object.keys(v).some(k=>!['kind','quote'].includes(k))||
      typeof v.kind!=='string'||typeof v.quote!=='string'||v.quote.length>180))
    throw Error('COACHING_BRAIN_INPUT_INVALID')
  const semanticHints=verifiedPriorCoachHints({...input,semanticHints:requestedHints})
  const settings=normalizeCoachSettings(body.personaId,body.settings)
  const persona=buildCoachBehaviorPolicy(body.personaId,settings,input.locale)
  // Browser time is an OPTIONAL, strictly bounded coaching hint. It does not
  // authorize or persist anything and never overrides user consent/safety.
  const elapsedSeconds=normalizeCoachElapsedSeconds(body.elapsedSeconds)
  const contactElapsedSeconds=normalizeCoachElapsedSeconds(body.contactElapsedSeconds)
  // Selected course is a whitelisted preference, never verified session evidence.
  const courseSessionId=body.courseSessionId===undefined?undefined:normalizeCoachCourseSessionId(body.courseSessionId)
  return {input:{...input,elapsedSeconds,contactElapsedSeconds,sessionContext,semanticHints,characterSeenIds:normalizeCoachCharacterSeenIds(body.characterSeenIds),voiceTurn:body.voiceTurn===true,
    ...(courseSessionId===undefined?{}:{courseSessionId}),
    openingHistory,openingPrior:body.allowOpeningPrior===true?body.openingPrior||null:null,
    allowOpeningPrior:body.allowOpeningPrior===true},persona}
}
