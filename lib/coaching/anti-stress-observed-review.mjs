// Exact first-party evidence adapter for the Therapy protocol. No fuzzy
// matching, provider tool claim, guessed consent, or automatic clinical fact.
import {antiStressScenario} from './anti-stress-course.mjs'
const norm=s=>typeof s==='string'?s.normalize('NFKC').toLocaleLowerCase().replace(/[¿¡“”«»]/gu,'').replace(/[.!?…:]+$/u,'').replace(/\s+/gu,' ').trim():''
const yes=new Set(['yes','correct','yes that is correct','да','верно','да верно','sí','correcto','sí es correcto'].map(norm))
const skip=new Set(['skip','skip it','пропустить','пропустим','omitir','omítelo'].map(norm))
const aliases={
 accepted:['accepted','try','adapt','i want to try','попробовать','изменить','согласен','согласна','probar','adaptar','acepto'],
 declined:['declined','no','skip','decline','отказ','нет','пропустить','rechazo','omitir'],
 imagery:['imagery','image','образ','imagen'],
 nonvisual:['nonvisual','nonvisual anchor','невизуальная опора','anclaje no visual'],
 comfortable:['comfortable','комфортно','комфортным','cómodo','cómoda'],
 neutral:['neutral','нейтрально','нейтральным','neutro','neutra'],
 uncomfortable:['uncomfortable','некомфортно','некомфортным','incómodo','incómoda'],
 not_tried:['not tried','не пробовал','не пробовала','no probado','no probé'],
 attempted:['attempted','i tried','попробовал','попробовала','probé'],
 adapted:['adapted','i adapted','изменил','изменила','adapté'],
 stopped:['stopped','i stopped','остановился','остановилась','detuve'],
 not_attempted:['not attempted','не делал','не делала','no lo intenté']
}
export function antiStressReviewEcho(answer,locale='en'){
 return ({en:'I recorded: ',ru:'Я записал: ',es:'He anotado: '}[locale]||'I recorded: ')+answer+({en:'. Is that correct?',ru:'. Верно?',es:'. ¿Es correcto?'}[locale]||'. Is that correct?')
}
function valueFor(field,answer){
 const v=norm(answer)
 if(!v||answer.length>2000)return null
 if(skip.has(v))return {status:'skipped',value:null}
 if(field.kind==='rating')return /^(?:10|[0-9])$/.test(v)?{status:'confirmed',value:Number(v)}:null
 if(field.kind==='text')return !yes.has(v)&&!['no','нет'].includes(v)?{status:'confirmed',value:answer.trim()}:null
 if(field.kind!=='choice')return null
 // The try/adapt/skip question is not a yes/no question. A bare yes cannot
 // establish practice permission. Meditation has its own yes/no question.
 if(field.id==='meditation_consent'&&yes.has(v))return {status:'confirmed',value:'accepted'}
 const matches=field.choices.filter(x=>[x.replaceAll('_',' '),...(aliases[x]||[])].map(norm).includes(v))
 return matches.length===1?{status:'confirmed',value:matches[0]}:null
}
export function antiStressExactObservedReview({sessionId,turns,locale='en'}={}){
 const scenario=antiStressScenario(sessionId,locale)
 if(!scenario||!Array.isArray(turns)||turns.length<4)return null
 const [q,a,echo,ack]=turns.slice(-4)
 if([q,a,echo,ack].some(t=>t?.kind!=='turn'||t.proof!=='server_observed_final_turn'||typeof t.turnId!=='string'||t.scenarioVersion!==scenario.version||t.sessionId!==sessionId||
  t.courseRunId!==ack.courseRunId||t.protocolId!==ack.protocolId||t.segmentId!==ack.segmentId||t.connectionId!==ack.connectionId||t.coachId!==ack.coachId)||
  new Set([q,a,echo,ack].map(t=>t.turnId)).size!==4||q.role!=='coach'||a.role!=='client'||echo.role!=='coach'||ack.role!=='client'||
  !(q.atMs<=a.atMs&&a.atMs<=echo.atMs&&echo.atMs<=ack.atMs)||!yes.has(norm(ack.text))||
  norm(echo.text)!==norm(antiStressReviewEcho(a.text,locale)))return null
 const field=scenario.fields.find(f=>norm(f.question)===norm(q.text))
 if(!field)return null
 const answer=valueFor(field,a.text)
 if(!answer)return null
 return {kind:'review',proof:'server_observed_explicit_field_review',role:'client',fieldId:field.id,...answer,
  questionTurnId:q.turnId,answerTurnId:a.turnId,confirmationTurnId:ack.turnId,
  courseRunId:ack.courseRunId,sessionId,protocolId:ack.protocolId,scenarioVersion:scenario.version,segmentId:ack.segmentId,connectionId:ack.connectionId,coachId:ack.coachId,atMs:ack.atMs}
}
