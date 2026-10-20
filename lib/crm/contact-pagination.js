import { createHmac, timingSafeEqual } from 'node:crypto'

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UTC_MICRO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/
export const CRM_CONTACT_PAGE_SIZE=50

function signature(ownerId,createdAt,id,key) {
  if (!Buffer.isBuffer(key) || key.length!==32) throw new Error('INVALID_CURSOR_CONFIG')
  return createHmac('sha256',key)
    .update('hh-crm-contact-page:v1:' + ownerId + ':' + createdAt + ':' + id)
    .digest('base64url')
}
export function makeCrmContactCursor({ownerId,createdAt,id,encryptionKey}) {
  if (!UUID.test(ownerId)||!UUID.test(id)||!UTC_MICRO.test(createdAt)) throw new Error('INVALID_CURSOR')
  const mac=signature(ownerId,createdAt,id,encryptionKey)
  return Buffer.from(JSON.stringify({v:1,t:createdAt,id,mac})).toString('base64url')
}
export function parseCrmContactCursor(token,ownerId,encryptionKey) {
  if (!UUID.test(ownerId)||typeof token!=='string'||token.length<30||token.length>512||
      !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error('INVALID_CURSOR')
  let value
  try { value=JSON.parse(Buffer.from(token,'base64url').toString('utf8')) }
  catch { throw new Error('INVALID_CURSOR') }
  if (!value||typeof value!=='object'||Array.isArray(value)||
      Object.keys(value).sort().join(',')!=='id,mac,t,v'||value.v!==1||
      !UUID.test(value.id)||!UTC_MICRO.test(value.t)||
      typeof value.mac!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(value.mac))
    throw new Error('INVALID_CURSOR')
  const actual=Buffer.from(value.mac,'base64url')
  const expected=Buffer.from(signature(ownerId,value.t,value.id,encryptionKey),'base64url')
  if (actual.length!==expected.length||!timingSafeEqual(actual,expected)) throw new Error('INVALID_CURSOR')
  return {createdAt:value.t,id:value.id}
}
