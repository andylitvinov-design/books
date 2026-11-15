/** 
 * Ephemeral, zero-inference My Coach context.
 * Only verbatim client-authored statements may be recalled. Never infer
 * consent, a diagnosis, an achieved stage or a commitment from these hints.
 * The browser keeps this in React memory; no storage, network or extra LLM.
 */
import {understandCoachingTurn} from '../personal-coaching/coaching-turn-understanding.mjs'

const statedGoal=/(?:\b(?:my goal|my priority|i want to|i would like to|i'm trying to|i need to)\b|моя цель|мой запрос|мой приоритет|я хочу|мне важно|мне нужно|(?:mi objetivo|mi prioridad|quiero|me gustaría|necesito))/iu
const constraint=/(?:\b(?:because|i can't|i cannot|not enough time|lack of|the obstacle|the constraint|the challenge is)\b|потому что|мне мешает|ограничени|препятстви|не хватает|нет времени|no tengo tiempo|porque|el obstáculo|me impide|me falta)/iu
const concreteExample=/(?:\b(?:for example|for instance|yesterday|last week|when i spoke|last time)\b|например|вчера|на прошлой неделе|в прошлый раз|когда я говорил|por ejemplo|ayer|la semana pasada|la última vez)/iu
const importantValue=/(?:\b(?:what matters to me|most important to me|i value|my values|i prefer)\b|для меня важно|я ценю|я предпочитаю|мои ценности|para mí es importante|mis valores|prefiero)/iu

const resetMessage=(message,locale)=>{
  const act=understandCoachingTurn({message,locale}).act
  return act==='correction'||act==='topic_shift'
}

/**
 * Select up to three EARLIER client statements not already in the ten-turn
 * request window. Corrections and new topics invalidate the older topic.
 * There are no generated summaries, model-written facts or persisted records.
 */
export function coachEphemeralContext(turns=[],recentTurns=[],locale='en',currentMessage=''){
  if(!Array.isArray(turns)||!Array.isArray(recentTurns)||!['ru','en','es'].includes(locale))return []
  if(typeof currentMessage!=='string'||resetMessage(currentMessage,locale))return []
  const messages=turns.slice(-96).filter(x=>x?.role==='user'&&typeof x.content==='string')
    .map(x=>x.content.trim()).filter(x=>x.length>=8&&x.length<=220)
  let lastReset=-1
  for(let i=0;i<messages.length;i++)if(resetMessage(messages[i],locale))lastReset=i
  const alreadySent=new Set(recentTurns.filter(x=>x?.role==='user'&&typeof x.content==='string')
    .map(x=>x.content.trim()))
  const available=messages.slice(lastReset+1).map((content,index)=>({content,index}))
    .filter(x=>!alreadySent.has(x.content))
  const picked=[]
  for(const test of [statedGoal,constraint,concreteExample,importantValue]){
    for(let i=available.length-1;i>=0;i--){
      const candidate=available[i]
      if(test.test(candidate.content)&&!picked.some(x=>x.content===candidate.content)){
        picked.push(candidate)
        break
      }
    }
    if(picked.length===3)break
  }
  return picked.sort((a,b)=>a.index-b.index).map(x=>x.content)
}
