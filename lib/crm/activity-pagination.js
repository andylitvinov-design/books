import { createHmac, timingSafeEqual } from 'node:crypto'

// Keep page tokens opaque and specific to this authenticated owner and contact.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PG_UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/
export const CRM_ACTIVITY_PAGE_SIZE=40

function signature(ownerId,contactId,at,id,key) {
  if (!Buffer.isBuffer(key)||key.length!==32) throw new Error('INVALID_CRM_ACTIVITY_CURSOR')
  return createHmac('sha256',key)
    .update(['hh-crm-activity-page-v1',ownerId,contactId,at,id].join('\0'))
    .digest('base64url')
}

export function createCrmActivityCursor({ownerId,contactId,at,id,key}) {
  if (![ownerId,contactId,id].every(value=>UUID.test(value))||!PG_UTC.test(at))
    throw new Error('INVALID_CRM_ACTIVITY_CURSOR')
  const mac=signature(ownerId,contactId,at,id,key)
  return Buffer.from(JSON.stringify({v:1,t:at,id,mac}),'utf8').toString('base64url')
}

export function readCrmActivityCursor(token,{ownerId,contactId,key}) {
  if (![ownerId,contactId].every(value=>UUID.test(value))||
      typeof token!=='string'||token.length<30||token.length>512||
      !/^[A-Za-z0-9_-]+$/.test(token))
    throw new Error('INVALID_CRM_ACTIVITY_CURSOR')
  let value
  try {value=JSON.parse(Buffer.from(token,'base64url').toString('utf8'))}
  catch {throw new Error('INVALID_CRM_ACTIVITY_CURSOR')}
  if (!value||Array.isArray(value)||typeof value!=='object'||
      Object.keys(value).sort().join(',')!=='id,mac,t,v'||value.v!==1||
      !UUID.test(value.id)||!PG_UTC.test(value.t)||
      !/^[A-Za-z0-9_-]{43}$/.test(value.mac||''))
    throw new Error('INVALID_CRM_ACTIVITY_CURSOR')
  const expected=Buffer.from(signature(ownerId,contactId,value.t,value.id,key),'base64url')
  const actual=Buffer.from(value.mac,'base64url')
  if(actual.length!==expected.length||!timingSafeEqual(expected,actual))
    throw new Error('INVALID_CRM_ACTIVITY_CURSOR')
  return {at:value.t,id:value.id}
}
