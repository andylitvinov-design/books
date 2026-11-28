// Client-confirmed speech corrections are private transcript annotations,
// never new dialogue turns or evidence for opening, results, memory or billing.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const control=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u
export const MAX_SPEECH_AMENDMENTS=64
export function normalizeSpeechAmendments(value,turns,sessionId){
 if(value===undefined)return []
 if(!Array.isArray(value)||value.length>MAX_SPEECH_AMENDMENTS||!Array.isArray(turns)||!uuid.test(sessionId||''))throw Error('SPEECH_AMENDMENT_INVALID')
 const ids=new Set()
 return value.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||!uuid.test(row.id||'')||ids.has(row.id)||
    row.sessionId!==sessionId||!Number.isInteger(row.afterTurnCount)||row.afterTurnCount<0||row.afterTurnCount>turns.length||
    row.source!=='client_confirmed'||typeof row.raw!=='string'||typeof row.text!=='string'||
    row.raw.length>1200||row.text.length>1200||control.test(row.raw)||control.test(row.text)||!row.raw.trim()||!row.text.trim()||
    typeof row.confirmedAt!=='string'||row.confirmedAt.length!==24||!Number.isFinite(Date.parse(row.confirmedAt))||
    new Date(row.confirmedAt).toISOString()!==row.confirmedAt)throw Error('SPEECH_AMENDMENT_INVALID')
  ids.add(row.id)
  return {id:row.id,sessionId,afterTurnCount:row.afterTurnCount,raw:row.raw.trim(),text:row.text.trim(),source:'client_confirmed',confirmedAt:row.confirmedAt}
 })
}
export function speechAmendmentsExtend(previous,next){
 try{
  if(previous.id!==next.id)return false
  const a=normalizeSpeechAmendments(previous.speechAmendments,previous.turns,previous.id)
  const b=normalizeSpeechAmendments(next.speechAmendments,next.turns,next.id)
  return a.length<=b.length&&a.every((row,i)=>JSON.stringify(row)===JSON.stringify(b[i]))
 }catch{return false}
}
export function addSpeechAmendment(previous,event,turns,sessionId){
 const existing=normalizeSpeechAmendments(previous,turns,sessionId)
 if(existing.some(row=>row.id===event?.id))return existing
 return normalizeSpeechAmendments([...existing,event],turns,sessionId)
}
