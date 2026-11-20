// Different timbre candidates per coach, for separate RU/EN listening QA.
// No claim that a suggested voice has passed Russian accent testing.
export const GEMINI_COACH_VOICE_OPTIONS=Object.freeze({
  mira:['Sulafat','Vindemiatrix','Charon','Achird'],
  max:['Puck','Laomedeia','Fenrir','Zephyr'],
  sofia:['Kore','Despina','Orus','Callirrhoe'],
  alex:['Iapetus','Charon','Aoede','Alnilam'],
  merlin:['Gacrux','Rasalgethi','Achernar','Algieba'],
  harry:['Puck','Achird','Leda','Fenrir'],
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
