import {coachAudioDirection} from './coach-audio-profiles.mjs'

// Approved by the Holistic House owner on 2026-11-20; EN pairs swapped on 2026-11-24.
// These are voice ID selections, not certification of native-sounding RU/EN
// or authorization to activate Gemini providers, data processing, or spending.
// Spanish has not been selected and must not silently inherit the English voice.
export const APPROVED_GEMINI_VOICES = Object.freeze({
  mira: Object.freeze({ru:'Erinome',en:'Sulafat'}),
  max: Object.freeze({ru:'Alnilam',en:'Charon'}),
  sofia: Object.freeze({ru:'Vindemiatrix',en:'Gacrux'}),
  alex: Object.freeze({ru:'Enceladus',en:'Orus'}),
  merlin: Object.freeze({ru:'Sadaltager',en:'Algenib'}),
  harry: Object.freeze({ru:'Achird',en:'Orus'}),
  genie: Object.freeze({ru:'Puck',en:'Achird'}), // RU retained; EN exchanged with Harry on 2026-11-24.
  caesar: Object.freeze({ru:'Algenib',en:'Alnilam'}),
  meditations: Object.freeze({ru:'Algieba',en:'Algieba'}),
})

// Compatibility export; the owner-selected locale voices are authoritative.
export const GENIE_INITIAL_GEMINI_VOICE=APPROVED_GEMINI_VOICES.genie
export function approvedGeminiVoice(personaId,locale) {
  if(locale!=='ru' && locale!=='en')return null
  return APPROVED_GEMINI_VOICES[personaId]?.[locale] ?? (personaId==='genie'?GENIE_INITIAL_GEMINI_VOICE[locale]:null) ?? null
}

// Candidates are for opt-in preview/QA only; the owner-approved defaults above
// are the source of truth for each coaching persona and selected language.
export const GEMINI_COACH_VOICE_OPTIONS=Object.freeze({
  mira:['Erinome','Gacrux','Sulafat','Vindemiatrix','Charon','Achird'],
  max:['Alnilam','Orus','Charon','Puck','Laomedeia','Fenrir','Zephyr'],
  sofia:['Vindemiatrix','Sulafat','Gacrux','Kore','Despina','Orus','Callirrhoe'],
  alex:['Enceladus','Alnilam','Charon','Orus','Iapetus','Aoede'],
  merlin:['Sadaltager','Algenib','Gacrux','Rasalgethi','Achernar','Algieba'],
  harry:['Achird','Orus','Puck','Leda','Fenrir'],
  genie:['Puck','Orus','Algieba','Algenib','Achird'],
  caesar:['Algenib','Alnilam'],
  lea:['Leda','Autonoe','Rasalgethi','Zephyr'],
  noah:['Achird','Callirrhoe','Puck','Aoede'],
  iris:['Zephyr','Laomedeia','Orus','Sulafat'],
  ray:['Algenib','Puck','Aoede','Sadachbia'],
})
export function coachGeminiVoiceOptions(personaId){
  return GEMINI_COACH_VOICE_OPTIONS[personaId]||GEMINI_COACH_VOICE_OPTIONS.mira
}
export function allowedGeminiCoachVoice(personaId,name){
  return Object.hasOwn(GEMINI_COACH_VOICE_OPTIONS,personaId)&&
    typeof name==='string'&&GEMINI_COACH_VOICE_OPTIONS[personaId].includes(name)
}

// Every approved public coach uses the same RU/EN voice as the recorded presentation.
// Preview candidates remain available for explicit auditions, not session overrides.
export function lockedCoachSessionVoice(personaId,locale){
  return Object.hasOwn(GEMINI_COACH_VOICE_OPTIONS,personaId)?approvedGeminiVoice(personaId,locale):null
}
export const MERLIN_VOCAL_DELIVERY='Warm, soft, mature male mentor voice; gentle resonant tone, relaxed articulation, slightly slower than ordinary conversation (approximately 90% of normal pace), short natural pauses, quietly attentive and grounded. Avoid a bright announcer, theatrical wizard voice, rushed delivery, dramatic gravel or exaggerated whispering.'

/** Shared recorded/turn TTS and duplex Live speech direction.
 * Preserve the existing style of recorded tracks. Character dialogue policy
 * independently controls vocabulary, empathy and interventions. */
export function coachVocalDelivery(personaId,locale,voiceName,mode='coaching'){
  const direction=coachAudioDirection(personaId,locale,mode)
  if(direction){
    // Retain the original approved Merlin recording direction in Coaching.
    return personaId==='merlin'&&mode!=='therapy'?MERLIN_VOCAL_DELIVERY+' '+direction:direction
  }
  if(personaId==='merlin')return ({ru:'Natural native Russian. ',en:'Natural English. ',es:'Natural Spanish. '}[locale]||'')+MERLIN_VOCAL_DELIVERY
  if(personaId==='caesar'&&locale==='ru')return 'Native Russian, mature masculine gravelly baritone, calm authority and firm measured delivery; clear articulation, restrained emphasis, natural pauses, never harsh toward the listener or shouted'
  if(personaId==='caesar'&&locale==='en')return 'Native English, mature masculine firm resonant voice, measured pace, calm authority and precise articulation; restrained expressive pauses, no shouting, no commands or theatrical exaggeration'
  if(personaId==='genie'&&locale==='ru'&&voiceName==='Puck')return 'Natural native Russian, youthful confident male adventurer, playful warmth, audible smile, elegant light irony and lively natural rhythm; never shout or exaggerate'
  if(personaId==='genie'&&locale==='en'&&['Orus','Achird'].includes(voiceName))return 'Natural English, charismatic confident young adult male adventurer, playful warmth, audible smile and light theatrical wit; never shout or exaggerate'
  return locale==='ru'?'Natural clear Russian speech, calm conversational pace':locale==='es'?'Natural clear Spanish speech, calm conversational pace':'Natural clear English speech, calm conversational pace'
}
