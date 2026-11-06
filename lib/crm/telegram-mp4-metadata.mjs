/** ffmpeg probe text, never a client-provided media claim. */
export function verifyRenderedMp4Metadata(stderr){
 if(typeof stderr!=='string'||stderr.length>24000)return false
 const duration=stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
 const video=/Video:\s*h264\b/i.test(stderr)
 const dimensions=/\b360x640\b/.test(stderr)
 if(!duration||!video||!dimensions)return false
 const seconds=Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3])
 return Number.isFinite(seconds)&&seconds>=19.5&&seconds<=20.5
}
