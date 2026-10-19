// Opaque, bounded keyset cursors. Exact PG timestamp text retains microsecond precision.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PG_TIME=/^20\d{2}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d{1,6})?[+-]\d{2}(?::\d{2})?$/
export function messengerCursor(at,id){
  if(!PG_TIME.test(at||'')||!UUID.test(id||''))throw new Error('INVALID_MESSENGER_CURSOR')
  return Buffer.from(JSON.stringify({at,id})).toString('base64url')
}
export function parseMessengerCursor(raw){
  if(raw===null||raw===undefined)return null
  if(typeof raw!=='string'||raw.length<10||raw.length>240||!/^[A-Za-z0-9_-]+$/.test(raw))
    throw new Error('INVALID_MESSENGER_CURSOR')
  try{
    const json=Buffer.from(raw,'base64url').toString('utf8')
    if(Buffer.from(json).toString('base64url')!==raw)throw new Error('encoding')
    const object=JSON.parse(json)
    if(!object||typeof object!=='object'||Array.isArray(object)||
       Object.keys(object).sort().join(',')!=='at,id'||
       !PG_TIME.test(object.at)||!UUID.test(object.id))
      throw new Error('shape')
    return {at:object.at,id:object.id}
  }catch{throw new Error('INVALID_MESSENGER_CURSOR')}
}
