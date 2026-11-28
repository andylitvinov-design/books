// Canonical little-endian mono PCM16 16k WAV only. Validate before consuming review quota.
export function isBoundedCoachReviewWav(bytes,{long=false}={}){
 if(!(bytes instanceof Uint8Array)||bytes.byteLength<3244||bytes.byteLength>(long===true?35:12)*32000+44||bytes.byteLength%2)return false
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
 const tag=(offset,value)=>[...value].every((c,i)=>bytes[offset+i]===c.charCodeAt(0))
 return tag(0,'RIFF')&&tag(8,'WAVE')&&tag(12,'fmt ')&&tag(36,'data')&&
 v.getUint32(4,true)===bytes.length-8&&v.getUint32(16,true)===16&&v.getUint16(20,true)===1&&v.getUint16(22,true)===1&&v.getUint32(24,true)===16000&&v.getUint32(28,true)===32000&&v.getUint16(32,true)===2&&v.getUint16(34,true)===16&&v.getUint32(40,true)===bytes.length-44
}
