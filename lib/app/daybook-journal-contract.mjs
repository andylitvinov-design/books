import {AppError,onlyKeys,requireUUID,requireTimezone,requireDate,text,revision} from '../assessments/contracts.js'

import {VIDEO_PHOTO_ID} from './client-video-photo-contract.mjs'

function materialReference(input){
 onlyKeys(input,['kind','id'])
 const {kind,id}=input
 if(kind==='photo'&&(id==='portrait'||typeof id==='string'&&VIDEO_PHOTO_ID.test(id)))return {kind,id}
 if(kind==='video'||kind==='avatar')return {kind,id:requireUUID(id)}
 throw new AppError('INVALID_JOURNAL_MATERIAL')
}

function day(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AppError('INVALID_JOURNAL_DAY')
 const parsed=new Date(value+'T12:00:00Z')
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==value) throw new AppError('INVALID_JOURNAL_DAY')
 return value
}
function nonempty(value,max){
 const result=text(value,max)
 if(!result) throw new AppError('INVALID_JOURNAL_TEXT')
 return result
}
export function journalWrite(input){
 onlyKeys(input,['id','operationId','revision','text','tags','kind','locale','timezone','localDay','goalId','material'])
 if(!['note','morning','evening'].includes(input.kind)||!['en','ru','es'].includes(input.locale)) throw new AppError('INVALID_JOURNAL_ENTRY')
 if(!Array.isArray(input.tags)||input.tags.length>12) throw new AppError('INVALID_JOURNAL_TAGS')
 return {
  id:requireUUID(input.id),operationId:requireUUID(input.operationId),revision:revision(input.revision),
  text:nonempty(input.text,20000),tags:[...new Set(input.tags.map(tag=>nonempty(tag,40)))],
  kind:input.kind,locale:input.locale,timezone:requireTimezone(input.timezone),localDay:day(input.localDay),
  goalId:input.goalId===null?null:requireUUID(input.goalId),
  ...(input.material!==undefined?{material:materialReference(input.material)}:{}),
 }
}
export function journalDelete(input){
 onlyKeys(input,['id','revision','operationId'])
 if(revision(input.revision)===0) throw new AppError('INVALID_REVISION')
 return {id:requireUUID(input.id),revision:input.revision,operationId:requireUUID(input.operationId)}
}
export function journalPage(input){
 onlyKeys(input,['limit','before'])
 const limit=input.limit===undefined?30:input.limit
 if(!Number.isSafeInteger(limit)||limit<1||limit>50) throw new AppError('INVALID_JOURNAL_PAGE')
 return {limit,before:input.before===undefined||input.before===null?null:requireUUID(input.before)}
}
export function localJournalDay(instant,timezone){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:requireTimezone(timezone),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(requireDate(instant)))
 const get=type=>parts.find(part=>part.type===type).value
 return `${get('year')}-${get('month')}-${get('day')}`
}
