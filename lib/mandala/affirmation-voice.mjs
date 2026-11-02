/**
 * Selected phrases are the only content sent to text-to-speech, in order.
 * Do not auto-insert profiles, wishes, tests or background prompts.
 */
export function affirmationNarrationText(lines) {
  if(!Array.isArray(lines) || lines.length===0 || lines.length>10)return "";
  const clean=lines.map(x=>typeof x==="string"?x.trim():"")
    .filter(Boolean);
  if(clean.length!==lines.length || clean.some(x=>Array.from(x).length>40||/[<>\x00-\x1f]/u.test(x)))return "";
  const text=clean.map(x=>/[.!?…]$/u.test(x)?x:x+".").join(" ");
  return Array.from(text).length<=650?text:"";
}
/** Strict, cheap duration read for mono/stereo PCM WAVE returned by Gemini. */
export function wavDurationFromHeader(bytes) {
  if(!(bytes instanceof ArrayBuffer)||bytes.byteLength<44)return null;
  const v=new DataView(bytes);
  if(v.getUint32(0,false)!==0x52494646||v.getUint32(8,false)!==0x57415645)return null;
  let byteRate=0,dataBytes=0;
  for(let offset=12;offset+8<=v.byteLength;){
    const id=v.getUint32(offset,false),length=v.getUint32(offset+4,true);
    if(id===0x666d7420&&offset+8+length<=v.byteLength&&length>=16)byteRate=v.getUint32(offset+16,true);
    if(id===0x64617461){dataBytes=length;break;}
    offset+=8+length+(length%2);
  }
  return byteRate>0&&dataBytes>0?dataBytes/byteRate:null;
}
