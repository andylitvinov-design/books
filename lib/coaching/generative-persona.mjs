import {buildCoachBehaviorPolicy, getCoachPersona, normalizeCoachSettings} from './persona-registry.mjs'
import {normalizeCoachingBrainInput} from '../personal-coaching/coaching-brain.mjs'

// A signed-in My Coach conversation is ephemeral, not a saved Personal Coaching
// session. This internal pointer is used only to reuse the reviewed validator.
const ephemeralSessionId='00000000-0000-4000-8000-000000000001'
const fields=new Set(['personaId','settings','locale','consent','message','turns'])
const settingFields=new Set(['warmth','directness','pace','depth','questionsPerTurn'])

export function normalizeGenerativeCoachInput(body) {
  if (!body || typeof body!=='object' || Array.isArray(body) ||
      Object.keys(body).some(key=>!fields.has(key)) ||
      typeof body.personaId!=='string' || !getCoachPersona(body.personaId))
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
  const settings=normalizeCoachSettings(body.personaId,body.settings)
  const persona=buildCoachBehaviorPolicy(body.personaId,settings,input.locale)
  return {input,persona}
}
