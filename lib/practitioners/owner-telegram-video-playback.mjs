// Deterministic private MP4 paths and Safari-compatible single byte ranges.
export const VIDEO_DRAFT_MAX_BYTES=50_000_000
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export function ownerVideoIdValid(id){return typeof id==='string'&&UUID.test(id)}
export function ownerVideoMediaPath(id){
 return ownerVideoIdValid(id)?'telegram-slides/'+id+'.mp4':null
}
export function ownerVideoByteRange(header,bytes){
 if(!Number.isSafeInteger(bytes)||bytes<1024||bytes>VIDEO_DRAFT_MAX_BYTES)return null
 if(header==null)return {status:200,start:0,end:bytes-1}
 if(typeof header!=='string')return null
 const match=/^bytes=(\d*)-(\d*)$/.exec(header)
 if(!match||(!match[1]&&!match[2]))return null
 const [,first,last]=match
 if([first,last].filter(Boolean).some(x=>!Number.isSafeInteger(Number(x))))return null
 if(!first){
   const suffix=Number(last)
   if(suffix<1)return null
   return {status:206,start:Math.max(0,bytes-suffix),end:bytes-1}
 }
 const start=Number(first),end=last?Math.min(Number(last),bytes-1):bytes-1
 if(start>=bytes||end<start)return null
 return {status:206,start,end}
}
