import {coachOpeningProgress,coachOpeningNextReply} from './coach-opening-protocol.mjs'
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
 if(previous.completed)return null
 const next=coachOpeningProgress({...scope,turns:[...history,String(input.message||'')]})
 let message=coachOpeningNextReply(next)
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
