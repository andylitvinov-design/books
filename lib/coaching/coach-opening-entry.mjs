import {coachOpeningProgress,coachOpeningNextReply} from './coach-opening-protocol.mjs'
import {coachProfileProgress,coachProfileNextReply} from './coach-profile-intake.mjs'
/**
 * One deterministic opening response, identical for Groq, text Gemini,
 * offline fallback and a server-reviewed Gemini Live checkpoint.
 * Never consumes a model call or accepts assistant prose as stage evidence.
 */
export function coachOpeningTurn(input={},personaId='mira'){
 const locale=input.locale||'en'
 const history=Array.isArray(input.openingHistory)?input.openingHistory:
   (Array.isArray(input.turns)?input.turns.filter(turn=>turn?.role==='user').map(turn=>turn.content):[])
 const scope={locale,personaId,priorSession:input.openingPrior||null,allowPrior:input.allowOpeningPrior===true}
 const previous=coachOpeningProgress({...scope,turns:history})
 // After the six opt-in gates, Personal Profile is a distinct deterministic
 // branch. Its eight current/desired questions never invoke goal-method LLMs.
 if(previous.completed){
  if(previous.answers.focus?.kind!=='profile')return null
  const profileTurns=history.slice(previous.consumedTurns)
  const priorProfile=coachProfileProgress({turns:profileTurns,locale})
  if(priorProfile.completed)return null
  const profileProgress=coachProfileProgress({
   turns:[...profileTurns,String(input.message||'')],locale
  })
  return {
   mode:'offline',stage:'profile',message:coachProfileNextReply(profileProgress).slice(0,900),
   reflection:'',question:'',hypothesis:'',planSuggestion:'',evidenceQuote:'',
   offlineReason:'structured_profile',sessionProgress:null,
   openingProgress:previous,profileProgress,
  }
 }
 const next=coachOpeningProgress({...scope,turns:[...history,String(input.message||'')]})
 let message=next.completed&&next.answers.focus?.kind==='profile'
  ?coachProfileNextReply(coachProfileProgress({locale,turns:[]})):coachOpeningNextReply(next)
 if(previous.current==='invitation'&&next.current==='invitation'&&!next.declined&&
    /(?:\?|what is|how does|how long|зачем|что такое|как (?:проходит|работает)|сколько времени|qué es|cómo funciona|cuánto dura)/iu.test(String(input.message||''))){
   const context={
    ru:'Это добровольный разговор: сначала мы определим тему и ваше состояние, затем спокойно исследуем её. Никаких обязательств или оценок.',
    en:'It is a voluntary conversation: we agree on a focus and how you feel, then explore it together. No obligations or judgment.',
    es:'Es una conversación voluntaria: elegimos un tema, hablamos de cómo te sientes y lo exploramos. Sin obligaciones ni juicios.',
   }[locale]||''
   message=context+' '+coachOpeningNextReply({...next,attempts:0})
 }
 // coachOpeningNextReply already provides the optional feelings reflection
 // before confirmation. Never speak it twice.
 return {
  mode:'offline',stage:'opening',message:message.trim().slice(0,900),
  reflection:'',question:'',hypothesis:'',planSuggestion:'',evidenceQuote:'',
  offlineReason:'structured_opening',sessionProgress:null,
  openingProgress:next,
 }
}
