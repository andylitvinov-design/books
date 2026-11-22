// Approved by the Holistic House owner on 2026-11-20.
// These are voice ID selections, not certification of native-sounding RU/EN
// or authorization to activate Gemini providers, data processing, or spending.
// Spanish has not been selected and must not silently inherit the English voice.
export const APPROVED_GEMINI_VOICES = Object.freeze({
  mira: Object.freeze({ru:'Erinome',en:'Gacrux'}),
  max: Object.freeze({ru:'Orus',en:'Orus'}),
  sofia: Object.freeze({ru:'Vindemiatrix',en:'Sulafat'}),
  alex: Object.freeze({ru:'Alnilam',en:'Charon'}),
  merlin: Object.freeze({ru:'Sadaltager',en:'Algenib'}),
  harry: Object.freeze({ru:'Achird',en:'Achird'}),
  meditations: Object.freeze({ru:'Algieba',en:'Algieba'}),
})

// Provisional new character setting, not among the six owner-reviewed 20 Nov presets.
// The existing consent, privacy and cost gates remain authoritative.
export const GENIE_INITIAL_GEMINI_VOICE=Object.freeze({ru:'Puck',en:'Puck'})
export function approvedGeminiVoice(personaId,locale) {
  if(locale!=='ru' && locale!=='en')return null
  return APPROVED_GEMINI_VOICES[personaId]?.[locale] ?? (personaId==='genie'?GENIE_INITIAL_GEMINI_VOICE[locale]:null) ?? null
}

// Candidates are for opt-in preview/QA only; the owner-approved defaults above
// are the source of truth for each coaching persona and selected language.
export const GEMINI_COACH_VOICE_OPTIONS=Object.freeze({
  mira:['Erinome','Gacrux','Sulafat','Vindemiatrix','Charon','Achird'],
  max:['Orus','Puck','Laomedeia','Fenrir','Zephyr'],
  sofia:['Vindemiatrix','Sulafat','Kore','Despina','Orus','Callirrhoe'],
  alex:['Alnilam','Charon','Iapetus','Aoede'],
  merlin:['Sadaltager','Algenib','Gacrux','Rasalgethi','Achernar','Algieba'],
  harry:['Achird','Puck','Leda','Fenrir'],
  genie:['Puck','Algenib','Orus','Charon','Achird'],
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
