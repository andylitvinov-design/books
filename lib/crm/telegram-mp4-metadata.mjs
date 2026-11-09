/** ffmpeg probe text, never a client-provided media claim. */
export function verifyRenderedMp4Metadata(stderr,expectedSeconds=20,requireAudio=false){
 if(typeof stderr!=='string'||stderr.length>24000)return false
 const duration=stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}\.\d{2})/)
 const video=/Video:\s*h264\b/i.test(stderr)
 const dimensions=/\b360x640\b/.test(stderr)
 if(!duration||!video||!dimensions||
  ![10,15,20,30,60].includes(expectedSeconds)||
  (requireAudio&&!/Audio:\s*aac\b/i.test(stderr)))return false
 const seconds=Number(duration[1])*3600+Number(duration[2])*60+Number(duration[3])
 return Number.isFinite(seconds)&&Math.abs(seconds-expectedSeconds)<=0.55
}
