import {createHmac,timingSafeEqual} from 'node:crypto'

// Do not reuse contact cursors: signed domain separation avoids cross-resource paging.
export const CRM_OPPORTUNITY_PAGE_SIZE=50
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UTC_MICRO=/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{6}Z$/
function mac(ownerId,createdAt,id,key) {
  if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('INVALID_CURSOR_CONFIG')
  return createHmac('sha256',key)
    .update('hh-crm-opportunities:v1:'+ownerId+':'+createdAt+':'+id)
    .digest('base64url')
}
export function makeCrmOpportunityCursor({ownerId,createdAt,id,encryptionKey}) {
  if(!UUID.test(ownerId)||!UUID.test(id)||!UTC_MICRO.test(createdAt))throw new Error('INVALID_CURSOR')
  return Buffer.from(JSON.stringify({v:1,t:createdAt,id,mac:mac(ownerId,createdAt,id,encryptionKey)})).toString('base64url')
}
export function parseCrmOpportunityCursor(token,ownerId,encryptionKey) {
  if(!UUID.test(ownerId)||typeof token!=='string'||token.length<30||token.length>512||
    !/^[A-Za-z0-9_-]+$/.test(token))throw new Error('INVALID_CURSOR')
  let data
  try{data=JSON.parse(Buffer.from(token,'base64url').toString('utf8'))}
  catch{throw new Error('INVALID_CURSOR')}
  if(!data||typeof data!=='object'||Array.isArray(data)||
    Object.keys(data).sort().join(',')!=='id,mac,t,v'||data.v!==1||
    !UUID.test(data.id)||!UTC_MICRO.test(data.t)||typeof data.mac!=='string'||
    !/^[A-Za-z0-9_-]{43}$/.test(data.mac))throw new Error('INVALID_CURSOR')
  const expected=Buffer.from(mac(ownerId,data.t,data.id,encryptionKey),'base64url')
  const actual=Buffer.from(data.mac,'base64url')
  if(expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new Error('INVALID_CURSOR')
  return {createdAt:data.t,id:data.id}
}
