// Client-confirmed speech corrections are private transcript annotations,
// never new dialogue turns or evidence for opening, results, memory or billing.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const control=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u
export const MAX_SPEECH_AMENDMENTS=64
const speechLocales=new Set(['ru','en','es'])
export function normalizeSpeechAmendments(value,turns,sessionId){
 if(value===undefined)return []
 if(!Array.isArray(value)||value.length>MAX_SPEECH_AMENDMENTS||!Array.isArray(turns)||!uuid.test(sessionId||''))throw Error('SPEECH_AMENDMENT_INVALID')
 const ids=new Set()
 return value.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row)||!uuid.test(row.id||'')||ids.has(row.id)||
    row.sessionId!==sessionId||!Number.isInteger(row.afterTurnCount)||row.afterTurnCount<0||row.afterTurnCount>turns.length||
    row.source!=='client_confirmed'||(row.locale!==undefined&&!speechLocales.has(row.locale))||typeof row.raw!=='string'||typeof row.text!=='string'||
    row.raw.length>1200||row.text.length>1200||control.test(row.raw)||control.test(row.text)||!row.raw.trim()||!row.text.trim()||
    typeof row.confirmedAt!=='string'||row.confirmedAt.length!==24||!Number.isFinite(Date.parse(row.confirmedAt))||
    new Date(row.confirmedAt).toISOString()!==row.confirmedAt)throw Error('SPEECH_AMENDMENT_INVALID')
  ids.add(row.id)
  return {id:row.id,sessionId,afterTurnCount:row.afterTurnCount,raw:row.raw.trim(),text:row.text.trim(),source:'client_confirmed',confirmedAt:row.confirmedAt,...(row.locale!==undefined?{locale:row.locale}:{})}
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
 const prior=existing.find(row=>row.id===event?.id)
 if(prior){
  const [next]=normalizeSpeechAmendments([event],turns,sessionId)
  if(JSON.stringify({...prior,confirmedAt:next.confirmedAt})!==JSON.stringify(next))throw Error('SPEECH_AMENDMENT_CONFLICT')
  return existing
 }
 return normalizeSpeechAmendments([...existing,event],turns,sessionId)
}

// A previous client confirmation is only a suggestion for a new utterance.
// Never infer new facts, upload this dictionary, or choose between conflicting entries.
export function speechPersonalCorrection(amendments,turns,sessionId,raw,locale){
 if(!speechLocales.has(locale)||typeof raw!=='string'||raw.length>80||!raw.trim())return ''
 const key=s=>s.trim().normalize('NFC').toLocaleLowerCase(locale)
 try{
  const matches=normalizeSpeechAmendments(amendments,turns,sessionId).filter(row=>row.locale===locale&&key(row.raw)===key(raw)&&row.text.length<=80)
  const unique=new Map(matches.map(row=>[key(row.text),row.text]))
  return unique.size===1?[...unique.values()][0]:''
 }catch{return ''}
}

// Presentation-only grouping. The original turns and append-only ledger stay
// unchanged; chronological position does not turn annotations into evidence.
export function speechAmendmentsByPosition(protocol){
 const amendments=normalizeSpeechAmendments(protocol.speechAmendments,protocol.turns,protocol.id)
 const positions=new Map()
 for(const row of amendments){
  if(!positions.has(row.afterTurnCount))positions.set(row.afterTurnCount,[])
  positions.get(row.afterTurnCount).push(row)
 }
 return positions
}
