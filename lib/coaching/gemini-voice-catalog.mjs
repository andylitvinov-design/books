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

// Merlin's recorded RU/EN presentation is the reference for his production voice.
// Preview candidates remain available for explicit auditions, not session overrides.
export function lockedCoachSessionVoice(personaId,locale){
  return personaId==='merlin'?approvedGeminiVoice(personaId,locale):null
}
export const MERLIN_VOCAL_DELIVERY='Warm, soft, mature male mentor voice; gentle resonant tone, relaxed articulation, slightly slower than ordinary conversation (approximately 90% of normal pace), short natural pauses, quietly attentive and grounded. Avoid a bright announcer, theatrical wizard voice, rushed delivery, dramatic gravel or exaggerated whispering.'
