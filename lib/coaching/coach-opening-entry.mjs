import {coachOpeningProgress,coachOpeningNextReply} from './coach-opening-protocol.mjs'
import {coachEarlyTopicReaction} from './coach-early-contact.mjs'
import {coachProfileProgress,coachProfileNextReply} from './coach-profile-intake.mjs'
const privateProfileHandoff={ru:'Мы завершили знакомство. Вы можете начать приватное исследование профиля кнопкой ниже. Каждый ответ будет привязан к своему вопросу; любой пункт можно пропустить.',en:'We have finished the introduction. You can start the private profile check-in below. Each answer belongs to its own question, and you may skip any point.',es:'Terminamos la introducción. Puedes iniciar la revisión privada del perfil abajo. Cada respuesta se vincula a su pregunta y puedes omitir cualquier punto.'}
/**
 * One deterministic opening response, identical for Groq, text Gemini,
 * offline fallback and a server-reviewed Gemini Live checkpoint.
 * Never consumes a model call or accepts assistant prose as stage evidence.
 */
export function coachOpeningTurn(input={},personaId='mira'){
 const locale=input.locale||'en'
 const history=Array.isArray(input.openingHistory)?input.openingHistory:
   (Array.isArray(input.turns)?input.turns.filter(turn=>turn?.role==='user').map(turn=>turn.content):[])
 const scope={locale,personaId:input.openingEvidencePersonaId||personaId,priorSession:input.openingPrior||null,allowPrior:input.allowOpeningPrior===true}
 const evidence=Array.isArray(input.openingTurns)?input.openingTurns:history
 const previous=coachOpeningProgress({...scope,turns:evidence})
 const wantsReview=/(?:провер|доработ|обнов|уточн|дополн|заполн|проясн|review|update|complete|refine|finish|fill|revisar|actualizar|completar|rellenar)/iu
  .test(previous.answers.focus?.quote||'')
 // After the six opt-in gates, Personal Profile is a distinct deterministic
 // branch. Its eight current/desired questions never invoke goal-method LLMs.
 if(previous.completed){
  if(previous.answers.focus?.kind!=='profile')return null
  if(input.deferProfileToPrivateDirector===true)return {
   mode:'offline',stage:'profile_handoff',message:privateProfileHandoff[locale]||privateProfileHandoff.en,
   reflection:'',question:'',hypothesis:'',planSuggestion:'',evidenceQuote:'',
   offlineReason:'structured_profile',sessionProgress:null,openingProgress:previous,
  }
  // Saved values are never assumed absent or inserted without owner consent.
  if(wantsReview)return {
   mode:'offline',stage:'profile_access',
   message:({ru:'Разрешите проверить сохранённые смысловые оси в «Памяти коуча». Тогда начнём только с пустых пунктов. Можно продолжить без истории.',
     en:'Allow private Profile access in Coach memory to review existing axes and fill only the gaps. You may continue without past data.',
     es:'Autoriza la lectura privada del Perfil en Memoria del coach para completar solo lo que falta. También puedes continuar sin historial.'})[locale],
   reflection:'',question:'',hypothesis:'',planSuggestion:'',evidenceQuote:'',
   offlineReason:'structured_profile',sessionProgress:null,
   openingProgress:previous,
  }
  const profileTurns=history.flatMap(turn=>typeof turn==='string'?[turn]:turn?.role==='user'&&turn.unanswered!==true?[turn.content]:[]).slice(previous.consumedTurns)
  const priorProfile=coachProfileProgress({turns:profileTurns,locale})
  if(priorProfile.completed)return {
   mode:'offline',stage:'profile_complete',message:coachProfileNextReply(priorProfile).slice(0,900),
   reflection:'',question:'',hypothesis:'',planSuggestion:'',evidenceQuote:'',
   offlineReason:'structured_profile',sessionProgress:null,
   openingProgress:previous,profileProgress:priorProfile,
  }
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
 const next=coachOpeningProgress({...scope,turns:[...evidence,Array.isArray(input.openingTurns)?{role:'user',content:String(input.message||'')}:String(input.message||'')]})
 let message=next.completed&&next.answers.focus?.kind==='profile'
  ?(input.deferProfileToPrivateDirector===true?(privateProfileHandoff[locale]||privateProfileHandoff.en):/(?:провер|доработ|обнов|уточн|дополн|заполн|проясн|review|update|complete|refine|finish|fill|revisar|actualizar|completar|rellenar)/iu
    .test(next.answers.focus?.quote||'')
   ?({ru:'Сначала можем проверить сохранённые ответы. Разрешите просмотр профиля в «Памяти коуча», чтобы не повторять уже заполненные пункты.',
      en:'First we can review what is saved. Allow private profile access in Coach memory so I do not ask completed questions again.',
      es:'Primero podemos revisar lo guardado. Autoriza la lectura privada del perfil para evitar preguntas repetidas.'})[locale]
   :coachProfileNextReply(coachProfileProgress({locale,turns:[]}))):coachOpeningNextReply({...next,personaId})
 if(previous.current==='invitation'&&next.current==='invitation'&&!next.declined&&
    /(?:\?|what is|how does|how long|зачем|что такое|как (?:проходит|работает)|сколько времени|qué es|cómo funciona|cuánto dura)/iu.test(String(input.message||''))){
   const context={
    ru:'Это добровольный разговор: сначала мы определим тему и ваше состояние, затем спокойно исследуем её. Никаких обязательств или оценок.',
    en:'It is a voluntary conversation: we agree on a focus and how you feel, then explore it together. No obligations or judgment.',
    es:'Es una conversación voluntaria: elegimos un tema, hablamos de cómo te sientes y lo exploramos. Sin obligaciones ni juicios.',
   }[locale]||''
   message=context+' '+coachOpeningNextReply({...next,personaId,attempts:0})
 }
 const reaction=coachEarlyTopicReaction({message:input.message,personaId,locale,previous,next,turns:input.turns})
 if(reaction)message=reaction+' '+message
 // coachOpeningNextReply already provides the optional feelings reflection
 // before confirmation. Never speak it twice.
 return {
  mode:'offline',stage:'opening',message:message.trim().slice(0,900),
  reflection:'',question:'',hypothesis:'',planSuggestion:'',evidenceQuote:'',
  offlineReason:'structured_opening',sessionProgress:null,
  openingProgress:next,
 }
}
