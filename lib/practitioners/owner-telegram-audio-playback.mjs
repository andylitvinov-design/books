import {OWNER_AUDIO_MAX_BYTES} from './owner-telegram-audio-model.mjs'

const AUDIO_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const EXTENSIONS=Object.freeze({
  'audio/ogg':'ogg','audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav'
})

export function ownerAudioIdValid(id){
  return typeof id==='string'&&AUDIO_ID.test(id)
}

export function ownerAudioMediaPath(id,mime){
  if(!ownerAudioIdValid(id)||!Object.hasOwn(EXTENSIONS,mime))return null
  return 'telegram-inbox/'+id+'.'+EXTENSIONS[mime]
}

// Safari commonly requests a one-byte probe followed by further byte ranges.
// Reject multi-range and malformed requests rather than returning a misleading 200.
export function ownerAudioByteRange(header,bytes){
  if(!Number.isSafeInteger(bytes)||bytes<128||bytes>OWNER_AUDIO_MAX_BYTES)return null
  if(header===null||header===undefined)
    return {status:200,start:0,end:bytes-1}
  if(typeof header!=='string')return null
  const match=/^bytes=(\d*)-(\d*)$/.exec(header)
  if(!match||(!match[1]&&!match[2]))return null
  const [,first,last]=match
  if([first,last].filter(Boolean).some(value=>
    !Number.isSafeInteger(Number(value))))return null
  if(!first){
    const suffix=Number(last)
    if(suffix<1)return null
    return {status:206,start:Math.max(0,bytes-suffix),end:bytes-1}
  }
  const start=Number(first)
  const end=last?Math.min(Number(last),bytes-1):bytes-1
  if(start>=bytes||end<start)return null
  return {status:206,start,end}
}
