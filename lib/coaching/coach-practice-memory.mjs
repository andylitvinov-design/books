import {compareLessonMoments} from '../inner-growth/course-moment-trends.js'

export const PRACTICE_HISTORY_LIMIT=50
const token=value=>typeof value==='string'&&/^[a-z0-9_-]{1,120}$/.test(value)?value:null
const feedbacks={helpful:0,neutral:0,not_helpful:0,discomfort:0,unknown:0}

function directFeedback(row){
 if(row.comfort==='uncomfortable'||row.feedback==='uncomfortable')return 'discomfort'
 if(row.window==='practice_v15'){
  if(row.usefulness==='useful')return 'helpful'
  if(row.usefulness==='unchanged')return 'neutral'
 }
 if(row.window==='practice_v6'&&['tried','simplified'].includes(row.attempt)){
  if(row.feedback==='helped')return 'helpful'
  if(row.feedback==='neutral')return 'neutral'
 }
 return 'unknown'
}

export function projectPracticeOutcome(row,accountId){
 if(!accountId||row.account_id!==accountId||!['practice_v15','practice_v6'].includes(row.window))return null
 const practiceId=token(row.lesson_id),practiceVersion=token(row.content_version)
 const occurredAt=new Date(row.completed_at??NaN)
 if(!row.id||!row.cycle_id||!practiceId||!practiceVersion||!Number.isFinite(occurredAt.getTime())||
  !Number.isInteger(row.day_number)||row.day_number<1||row.day_number>14)return null
 const focus=token(row.focus)
 const context={day:row.day_number,focus,window:row.window,
  ...(token(row.variant)?{variant:row.variant}:{})}
 const pair=row.window==='practice_v15'&&focus?compareLessonMoments(row.before_now,row.after_now):null
 return {accountId, courseRunId:row.cycle_id,sessionProtocolId:null,practiceId,practiceVersion,context,
  occurredAt:occurredAt.toISOString(),clientFeedback:directFeedback(row),
  measurement:pair?{before:pair.before,after:pair.after,scaleId:'practice-moment-0-10',scaleVersion:1}:null,
  sourceRefs:[{kind:'growth_session',id:row.id}],scope:'owner_only'}
}

export function practiceHistoryView(rows,accountId,partial=false){
 const counts={...feedbacks},seen=new Set(),outcomes=[]
 const discomfort=new Set()
 const contextKey=outcome=>JSON.stringify([outcome.practiceId,outcome.practiceVersion,outcome.context])
 for(const row of rows){
  const outcome=projectPracticeOutcome(row,accountId)
  if(!outcome||seen.has(row.id))continue
  seen.add(row.id)
  outcomes.push(outcome)
  counts[outcome.clientFeedback]++
  if(outcome.clientFeedback==='discomfort')discomfort.add(contextKey(outcome))
 }
 const items=outcomes.map(({practiceId,practiceVersion,context,occurredAt,clientFeedback,measurement,sourceRefs})=>{
  const key=contextKey({practiceId,practiceVersion,context})
  const recall=discomfort.has(key)?'discomfort_reported':
   clientFeedback==='helpful'&&!partial?'helpful_reported':'review_history'
  return {id:sourceRefs[0].id,practiceId,practiceVersion,context,occurredAt,clientFeedback,measurement,recall}
 })
 return {status:partial?'partial':items.length?'ok':'empty',counts,items}
}
