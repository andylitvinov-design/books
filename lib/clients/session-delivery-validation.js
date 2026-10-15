import { randomUUID } from 'node:crypto'

export const sessionMediaTypes = Object.freeze({
  'video/mp4': 100 * 1024 * 1024,
  'video/webm': 100 * 1024 * 1024,
  'audio/mpeg': 25 * 1024 * 1024,
  'audio/mp4': 25 * 1024 * 1024,
  'audio/x-m4a': 25 * 1024 * 1024,
  'audio/webm': 25 * 1024 * 1024,
  'application/pdf': 15 * 1024 * 1024,
})
export const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i
export const selectorPattern = /^[a-zA-Z0-9_-]{22}$/
export const secretPattern = /^[a-zA-Z0-9_-]{43}$/
export const isUuid = value => typeof value === 'string' && uuidPattern.test(value)

export function validateSessionContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_SESSION')
  if (Object.keys(value).some(k => !['title','summary','items'].includes(k))) throw new Error('INVALID_SESSION')
  const clean = (s,limit,required=false) => {
    if (typeof s !== 'string' || s.length > limit || s.includes('\0')) throw new Error('INVALID_SESSION')
    const result = s.trim()
    if (required && !result) throw new Error('INVALID_SESSION')
    return result
  }
  const title = clean(value.title,160,true), summary=clean(value.summary??'',4000)
  const entries=value.items??[]
  if (!Array.isArray(entries) || entries.length>24) throw new Error('INVALID_ITEMS')
  const allowed=['text','practice','report','document','video','audio','pdf','link']
  const items=entries.map((item,position)=>{
    if (!item || typeof item!=='object' || Array.isArray(item)) throw new Error('INVALID_ITEM')
    if(Object.keys(item).some(k=>!['id','kind','title','body','refId','assetId','url'].includes(k))) throw new Error('INVALID_ITEM')
    const kind=item.kind
    if(!allowed.includes(kind))throw new Error('INVALID_KIND')
    const hasOwn=(key)=>Object.hasOwn(item,key)
    if ((hasOwn('refId')&&!['report','document'].includes(kind)) ||
        (hasOwn('assetId')&&!['video','audio','pdf'].includes(kind)) ||
        (hasOwn('url')&&kind!=='link'))throw new Error('INVALID_ITEM')
    const id=item.id??randomUUID()
    if(!isUuid(id))throw new Error('INVALID_ITEM')
    const result={id,kind,title:clean(item.title??'',160,true),body:clean(item.body??'',7000),position}
    if(['report','document'].includes(kind)){
      if(!isUuid(item.refId))throw new Error('INVALID_REF')
      result.refId=item.refId
    }else if(['video','audio','pdf'].includes(kind)){
      if(!isUuid(item.assetId))throw new Error('INVALID_ASSET')
      result.assetId=item.assetId
    }else if(kind==='link'){
      let url
      try{url=new URL(item.url)}catch{throw new Error('INVALID_LINK')}
      if(url.protocol!=='https:'||url.username||url.password||url.href.length>1500||
        !url.hostname || ['localhost','127.0.0.1','::1'].includes(url.hostname) ||
        /^(10|192\.168|169\.254)\./.test(url.hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(url.hostname) ||
        /\.local(host)?$/.test(url.hostname))throw new Error('INVALID_LINK')
      result.url=url.href
    }
    return result
  })
  if(new Set(items.map(i=>i.id)).size!==items.length)throw new Error('DUPLICATE_ITEM')
  if(Buffer.byteLength(JSON.stringify({title,summary,items}))>100000)throw new Error('SESSION_TOO_LARGE')
  return {title,summary,items}
}
export function validateUpload(file) {
  if(!file||typeof file!=='object'||!Object.hasOwn(sessionMediaTypes,file.mime)||
    !Number.isSafeInteger(file.bytes)||file.bytes<1||file.bytes>sessionMediaTypes[file.mime])
    throw new Error('INVALID_UPLOAD')
  return {mime:file.mime,bytes:file.bytes}
}
