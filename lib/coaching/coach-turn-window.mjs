/**
 * Ephemeral My Coach history selection. Preserve only the client's actual words;
 * no model inference, private persistence, generated summary or network access.
 * Input rows are already bounded by the existing authenticated route validator.
 */
const contextReset=/(?:\b(?:change (?:the )?(?:subject|topic)|switch (?:the )?topic|something else|different topic|rather (?:talk|discuss) about|not about .{1,70} (?:but|instead) about)\b|(?:смен(?:ить|им|ите|имте) тему|поговор(?:им|ить) о другом|обсуд(?:им|ить) другое|другая тема|новая тема|не (?:о|про) .{1,70} а (?:о|про) )|(?:cambiemos de tema|cambiar de tema|otro tema|otra cosa|no (?:se trata|hablo) de .{1,70} sino de))/iu
const correction=/(?:\b(?:you misunderstood|not what i meant|that's not what i meant|i meant something else|let me correct|actually i meant)\b|(?:вы меня не поняли|ты меня не понял|я имел(?:а)? в виду другое|я хотел(?:а)? сказать другое|нет[,;:]\s*(?:я имел|не так|это не))|(?:no me entendiste|no era eso|quise decir otra cosa|me refiero a otra cosa))/iu
const explicitGoal=/(?:\b(?:i want to|i would like to|i'd like to|my goal(?: is)?|my priority(?: is)?|i need to|i am trying to|i'm trying to|i feel stuck|i'm stuck|i am stuck|i struggle with|i'm struggling with|i'm worried about)\b|(?:хочу (?:разобраться|изменить|понять|начать|улучшить|обсудить|найти|сделать|решить|поговорить|перестать)|моя цель|мой приоритет|мне важно|мне нужно|я (?:застрял|застряла|не могу решиться)|меня беспокоит)|(?:quiero (?:hablar|cambiar|entender|mejorar|resolver|empezar|explorar)|me gustaría|mi objetivo|mi prioridad|necesito|me siento estancad[oa]|me preocupa))/iu
const noAdvice=/(?:\b(?:no advice|without advice|don't (?:give me )?advice|do not (?:give me )?advice|don't suggest exercises|do not suggest exercises)\b|(?:без советов|не (?:дава(?:й|йте)|нужно) совет|не советуй|не предлагай упражнения)|(?:sin consejos|no me aconsejes|no quiero consejos))/iu
const acceptAdvice=/(?:\b(?:give me advice|i want advice|please advise|what do you recommend)\b|(?:дай(?:те)? (?:мне )?совет|можно совет|что (?:вы|ты) совету(?:ете|ешь))|(?:dame un consejo|quiero consejos))/iu
const goalDenial=/(?:\b(?:don't want to|do not want to|i want to (?:stop|end|leave)|i don't want to talk about)\b|(?:не хочу (?:обсуждать|продолжать|говорить|рассказывать)|хочу закончить)|(?:no quiero hablar|no quiero continuar))/iu
const rowText=(row)=>row?.role==='user'&&typeof row.content==='string'?row.content.trim():''
const isGoal=(row)=>{
  const s=rowText(row)
  return s.length>=9&&s.length<=900&&explicitGoal.test(s)&&!goalDenial.test(s)
}
const findLast=(rows,test)=>{
  for(let i=rows.length-1;i>=0;i--)if(test(rows[i]))return i
  return -1
}
/**
 * Keep newest turns intact and at most two earlier, unmodified user utterances:
 * the active stated topic/goal plus a correction or explicit no-advice boundary.
 * An explicit topic reset invalidates an earlier goal; a simple correction does not.
 */
export function coachTurnWindow(turns,maxTurns=10){
  if(!Array.isArray(turns))return []
  const limit=Number.isInteger(maxTurns)?Math.min(24,Math.max(1,maxTurns)):10
  if(turns.length<=limit)return turns.slice()
  const resetIndex=findLast(turns,row=>contextReset.test(rowText(row)))
  const goalIndex=findLast(turns,(row)=>isGoal(row))
  // The most recent explicitly stated goal is usable only after a topic reset.
  const activeGoal=goalIndex>=resetIndex&&goalIndex>=0?goalIndex:-1
  const noAdviceIndex=findLast(turns,row=>noAdvice.test(rowText(row)))
  const adviceOverride=findLast(turns,row=>acceptAdvice.test(rowText(row)))
  const correctionIndex=findLast(turns,row=>correction.test(rowText(row)))
  const boundaryIndex=noAdviceIndex>adviceOverride?noAdviceIndex:-1
  // Explicit no-advice boundaries outrank corrections; topic-specific corrections
  // become stale after a client-selected subject change.
  const secondaryIndex=boundaryIndex>=0?boundaryIndex:(correctionIndex>=resetIndex?correctionIndex:-1)
  // Recent conversation always wins. Do not pin an old utterance if the current
  // bounded window already contains a newer replacement of the same kind.
  const pinned=[]
  const candidates=[activeGoal,secondaryIndex]
  // Reserving one earlier statement moves the recent cutoff forward; recheck
  // the other candidate so a goal at the old cutoff cannot accidentally vanish.
  while(pinned.length<Math.min(2,limit-1)){
    const cutoff=turns.length-(limit-pinned.length)
    const next=candidates.find(idx=>idx>=0&&idx<cutoff&&!pinned.includes(idx))
    if(next===undefined)break
    pinned.push(next)
  }
  const start=turns.length-(limit-pinned.length)
  return [...pinned.filter(i=>i<start).sort((a,b)=>a-b).map(i=>turns[i]),...turns.slice(start)]
}
