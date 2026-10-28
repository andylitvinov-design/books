// Pure, browser-safe contract for the native Holistic House member inbox.
export const DIRECT_MEDIA_BUCKET='hh-member-direct-media'
// Vercel request limit is 4.5 MB; leave margin for safe first-party binary uploads.
export const DIRECT_MEDIA_PROXY_MAX_BYTES=3_000_000
export const DIRECT_MEDIA_TYPES=Object.freeze({
  'image/jpeg':{kind:'image',extension:'jpg',max:5_000_000},
  'image/png':{kind:'image',extension:'png',max:5_000_000},
  'image/webp':{kind:'image',extension:'webp',max:5_000_000},
  'audio/mpeg':{kind:'audio',extension:'mp3',max:20_000_000},
  'audio/mp4':{kind:'audio',extension:'m4a',max:20_000_000},
  'audio/webm':{kind:'audio',extension:'webm',max:20_000_000},
  'audio/ogg':{kind:'audio',extension:'ogg',max:20_000_000},
  'audio/wav':{kind:'audio',extension:'wav',max:20_000_000},
})
export function directMediaSpec(mime,bytes) {
  const info=DIRECT_MEDIA_TYPES[mime]
  if(!info)throw new Error('MEDIA_TYPE_NOT_ALLOWED')
  if(!Number.isSafeInteger(bytes)||bytes<128||bytes>info.max)
    throw new Error('MEDIA_SIZE_NOT_ALLOWED')
  return info
}
export function directMessageText(value,{allowEmpty=false}={}) {
  if(typeof value!=='string')throw new Error('INVALID_MESSAGE')
  const text=value.trim()
  if((!allowEmpty&&!text)||text.length>1200||/[\x00-\x08\x0b\x0c\x0e-\x1f]/u.test(text))
    throw new Error('INVALID_MESSAGE')
  return text
}
export function directAudioTitle(value) {
  if(typeof value!=='string'||!value.trim()||value.trim().length>120)
    throw new Error('INVALID_TITLE')
  return value.trim()
}
