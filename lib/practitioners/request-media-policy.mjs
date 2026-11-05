// Browser-safe, request-bound private media contract for customer/master order chat.
// Never publish order attachments or reuse them as public profile assets.
import {directMediaSpec,directMediaMime} from './direct-message-policy.mjs'

export const REQUEST_VIDEO_MIME=Object.freeze({
  'video/mp4':{kind:'video',extension:'mp4',max:20_000_000},
  'video/webm':{kind:'video',extension:'webm',max:20_000_000},
  'video/quicktime':{kind:'video',extension:'mov',max:20_000_000},
})
export const MAX_ORDER_VIDEO_SECONDS=60

export function requestMediaMime(file){
  const type=String(file?.type||'').split(';')[0].toLowerCase()
  const ext=/\.([a-z0-9]+)$/i.exec(String(file?.name||''))?.[1]?.toLowerCase()||''
  if(type==='video/x-m4v')return 'video/mp4'
  if((!type||type==='application/octet-stream')&&ext==='mov')return 'video/quicktime'
  if((!type||type==='application/octet-stream')&&['mp4','m4v'].includes(ext))return 'video/mp4'
  return directMediaMime(file)
}
export function requestMediaSpec(mime,bytes){
  if(typeof mime!=='string')throw new Error('MEDIA_TYPE_NOT_ALLOWED')
  if(Object.hasOwn(REQUEST_VIDEO_MIME,mime)){
    const spec=REQUEST_VIDEO_MIME[mime]
    if(!Number.isSafeInteger(bytes)||bytes<128||bytes>spec.max)
      throw new Error('MEDIA_SIZE_NOT_ALLOWED')
    return spec
  }
  return directMediaSpec(mime,bytes)
}
