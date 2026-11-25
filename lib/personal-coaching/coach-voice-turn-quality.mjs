/*
 * Ephemeral guard for uncertain spoken coach turns. No persistence or model calls.
 */
const SHORT_COMPLETE=new Set([
  'да','нет','ага','угу','ок','окей','ну','не','sí','si','no','yes','ok','okay',
  'sure','vale','bien','oui','ja','1','2','3','4','5','6','7','8','9','10',
])
export function coachVoiceFragmentNeedsReview(input){
  const text=String(input||'').normalize('NFC').trim()
    .replace(/^[¿¡]+/gu,'').replace(/[.!?¡¿…,;:]+$/gu,'').trim().toLowerCase()
  return /^[\p{L}]+$/u.test(text)&&Array.from(text).length<=5&&!SHORT_COMPLETE.has(text)
}
export function coachDraftWithoutUncertainSpeech(current,uncertain=null){
  const draft=String(current||'').trim()
  return uncertain?.visible===draft?String(uncertain.prior||'').trim():draft
}
