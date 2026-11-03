import {createHmac,timingSafeEqual} from 'node:crypto'

// Keyset token: an authenticated owner's open-task ordering boundary.
// No contact names, phone numbers or private free text in the token.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATE=/^\d{4}-\d{2}-\d{2}$/
const MICROS=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/
export const CRM_OPEN_FOLLOWUP_PAGE_SIZE=100

function sign(ownerId,dueOn,createdAt,id,key) {
  if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('INVALID_FOLLOWUP_CURSOR_CONFIG')
  return createHmac('sha256',key).update(
    ['hh-crm-open-followup-v1',ownerId,dueOn,createdAt,id].join('\0')).digest('base64url')
}

export function makeCrmFollowupCursor({ownerId,dueOn,createdAt,id,key}) {
  if(!UUID.test(ownerId)||!UUID.test(id)||!DATE.test(dueOn)||!MICROS.test(createdAt))
    throw new Error('INVALID_FOLLOWUP_CURSOR')
  const mac=sign(ownerId,dueOn,createdAt,id,key)
  return Buffer.from(JSON.stringify({v:1,d:dueOn,t:createdAt,id,mac}),'utf8').toString('base64url')
}

export function readCrmFollowupCursor(token,{ownerId,key}) {
  if(!UUID.test(ownerId)||typeof token!=='string'||token.length<40||token.length>512||
     !/^[A-Za-z0-9_-]+$/.test(token))throw new Error('INVALID_FOLLOWUP_CURSOR')
  let value
  try{value=JSON.parse(Buffer.from(token,'base64url').toString('utf8'))}
  catch{throw new Error('INVALID_FOLLOWUP_CURSOR')}
  if(!value||typeof value!=='object'||Array.isArray(value)||
     Object.keys(value).sort().join(',')!=='d,id,mac,t,v'||value.v!==1||
     !DATE.test(value.d)||!MICROS.test(value.t)||!UUID.test(value.id)||
     typeof value.mac!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value.mac))
    throw new Error('INVALID_FOLLOWUP_CURSOR')
  const expected=Buffer.from(sign(ownerId,value.d,value.t,value.id,key),'base64url')
  const actual=Buffer.from(value.mac,'base64url')
  if(actual.length!==expected.length||!timingSafeEqual(expected,actual))
    throw new Error('INVALID_FOLLOWUP_CURSOR')
  return {dueOn:value.d,createdAt:value.t,id:value.id}
}
