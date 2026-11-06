import 'server-only'
import { randomUUID } from 'node:crypto'
import { getDefinitionById } from '../assessments/definitions.js'
import { scoreAssessment } from '../assessments/scoring.js'
import { safetySignal } from '../assessments/safety.js'
import { chatPermittedOptions } from '../assessments/test-chat-flow.mjs'
import { seal, openSealed } from './crypto.js'
import { PRACTITIONER_ID } from '../../data/app-services.js'
import {
  quizLocale, quizCopy, subscriberQuizCatalog, subscriberQuizMenu,
  subscriberQuizConsent, subscriberQuizQuestion, subscriberQuizSafety,
  subscriberQuizResult,
} from './subscriber-quiz-policy.mjs'

const TABLE='app_private.subscriber_quiz_runs'
const token=(id,kind)=>({accountId:PRACTITIONER_ID,recordId:id,field:'subscriber_ai.quiz.'+kind})
const sealedAnswers=(id,answers,config)=>seal(answers,token(id,'answers'),config)
const readAnswers=(row,config)=>{
  if(!row?.answers_ciphertext)return {}
  const value=openSealed(row.answers_ciphertext,token(row.id,'answers'),config)
  return value && typeof value==='object' && !Array.isArray(value)?value:{}
}
const readResult=(row,config)=>row?.result_ciphertext?
  openSealed(row.result_ciphertext,token(row.id,'result'),config):null
const getSupported=(id,locale)=> {
  let definition
  try { definition=getDefinitionById(id) } catch { return null }
  return ['en','ru','es'].some(lang=>subscriberQuizCatalog(lang)
    .some(entry=>entry.definition.id===id))?definition:null
}
async function save(db,row,patch){
  const set=Object.keys(patch)
  if(!set.length)throw Error('EMPTY_QUIZ_UPDATE')
  const allowed=new Set(['status','revision','progress','answers_ciphertext',
    'result_ciphertext','consent_at','safety_pending','expires_at'])
  if(set.some(k=>!allowed.has(k)))throw Error('QUIZ_INVALID_PATCH')
  const args=[row.id]
  const fields=set.map((key,i)=>{
    args.push(patch[key])
    return key+'=$'+(i+2)
  })
  const result=await db.query(`update ${TABLE} set ${fields.join(',')},updated_at=now()
    where id=$1 returning *`,args)
  return result.rows[0]
}
function view(row,locale,config,ack=''){
  const definition=getSupported(row.definition_id,locale)
  if(!definition)return {text:quizCopy(locale).unavailable}
  if(row.status==='pending')return subscriberQuizConsent(definition,locale)
  if(row.status==='completed')return subscriberQuizResult(definition,readResult(row,config),locale)
  if(row.safety_pending)return subscriberQuizSafety(locale,row.revision)
  return subscriberQuizQuestion(definition,locale,row.progress,row.revision,readAnswers(row,config),0,ack)
    || {text:quizCopy(locale).unavailable}
}
async function finishRun(db,row,definition,answers,config,locale){
  // Scoring is the existing canonical server implementation. Never let a language
  // model, Telegram label, or button index modify the registered numeric values.
  const scored=scoreAssessment(definition,answers,{})
  await save(db,row,{
    status:'completed',revision:row.revision+1,progress:definition.questions.length,
    safety_pending:false,
    result_ciphertext:seal(scored,token(row.id,'result'),config),
  })
  return subscriberQuizResult(definition,scored,locale)
}
export function subscriberQuizSchemaEnabled(env=process.env){
  return env.HH_SUBSCRIBER_AI_QUIZ_SCHEMA_READY==='true'
}
export async function handleSubscriberQuiz(db,config,session,event,locale=event.locale){
  const lang=quizLocale(locale),t=quizCopy(lang)
  if(!session?.consent_at || session?.stopped_at)
    return {text:t.paused}
  const action=event.action==='tests'?{type:'open'}:event.quiz
  if(!action)return {text:t.waiting}
  const existing=(await db.query(`select * from ${TABLE}
    where session_id=$1 for update`,[session.id])).rows[0]
  let row=existing
  if(row && new Date(row.expires_at).getTime()<=Date.now()){
    await db.query(`delete from ${TABLE} where id=$1`,[row.id])
    row=null
  }
  if(action.type==='cancel'){
    if(row)await db.query(`delete from ${TABLE} where id=$1`,[row.id])
    return {text:t.deleted}
  }
  if(action.type==='new')return subscriberQuizMenu(lang)
  if(action.type==='menu')return subscriberQuizMenu(lang,action.page)
  if(action.type==='open')return row?view(row,lang,config):subscriberQuizMenu(lang)
  if(action.type==='select'){
    const entry=subscriberQuizCatalog(lang).find(item=>item.item.key===action.key)
    if(!entry)return subscriberQuizMenu(lang)
    if(row)await db.query(`delete from ${TABLE} where id=$1`,[row.id])
    const id=randomUUID()
    await db.query(`insert into ${TABLE}
      (id,session_id,definition_id,instrument_locale,answers_ciphertext)
      values($1,$2,$3,$4,$5) returning *`,[
        id,session.id,entry.definition.id,entry.definition.instrumentLocale,
        sealedAnswers(id,{},config),
      ])
    return subscriberQuizConsent(entry.definition,lang)
  }
  if(!row)return subscriberQuizMenu(lang)
  const def=getSupported(row.definition_id,lang)
  if(!def){
    await db.query(`delete from ${TABLE} where id=$1`,[row.id])
    return {text:t.unavailable}
  }
  if(action.type==='agree'){
    if(row.status!=='pending'||def.key!==action.key)return view(row,lang,config,t.blocked)
    row=await save(db,row,{status:'active',consent_at:new Date(),
      revision:row.revision+1,expires_at:new Date(Date.now()+7*86400000)})
    return view(row,lang,config)
  }
  if(!row.consent_at)return subscriberQuizConsent(def,lang)
  if(action.type==='result')return row.status==='completed'
    ?subscriberQuizResult(def,readResult(row,config),lang):view(row,lang,config)
  if(row.status!=='active')return view(row,lang,config)
  if(!Number.isInteger(action.revision)||row.revision!==action.revision)
    return view(row,lang,config,t.blocked)
  const answers=readAnswers(row,config)
  const questions=def.questions
  if(action.type==='options'){
    return subscriberQuizQuestion(def,lang,row.progress,row.revision,answers,action.page)
      || {text:t.unavailable}
  }
  if(action.type==='ack'){
    if(!row.safety_pending)return view(row,lang,config)
    row=await save(db,row,{safety_pending:false,revision:row.revision+1})
    if(row.progress===questions.length)
      return finishRun(db,row,def,answers,config,lang)
    return view(row,lang,config)
  }
  if(row.safety_pending)return subscriberQuizSafety(lang,row.revision)
  if(action.type==='back'){
    if(row.progress<=0)return view(row,lang,config)
    row=await save(db,row,{progress:row.progress-1,revision:row.revision+1})
    return view(row,lang,config)
  }
  if(action.type!=='answer')return view(row,lang,config)
  if(row.progress>=questions.length)return {text:t.blocked}
  const question=questions[row.progress]
  const options=chatPermittedOptions(def,question,answers)
  if(!options.some(x=>x.value===action.value))return view(row,lang,config,t.blocked)
  const next={...answers,[question.id]:action.value},nextProgress=row.progress+1
  const risk=Boolean(safetySignal(def,{[question.id]:action.value}))
  row=await save(db,row,{
    answers_ciphertext:sealedAnswers(row.id,next,config),
    progress:nextProgress,revision:row.revision+1,
    safety_pending:risk,
  })
  if(risk)return subscriberQuizSafety(lang,row.revision)
  if(nextProgress===questions.length)return finishRun(db,row,def,next,config,lang)
  const label=options.find(x=>x.value===action.value)?.label||String(action.value)
  return view(row,lang,config,t.accepted+'\n'+t.savedAnswer+': '+label.slice(0,120))
}
// Existing housekeeping worker invokes this; no additional cron or provider.
export async function pruneSubscriberQuizRuns(db){
  const count=(await db.query(`with expired as (
    select id from ${TABLE} where expires_at<now()
    order by expires_at,id limit 100 for update skip locked)
    delete from ${TABLE} q using expired where q.id=expired.id
    returning q.id`)).rowCount
  return count
}
