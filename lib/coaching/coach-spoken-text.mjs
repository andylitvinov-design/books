/**
 * Pure TTS excerpt selection. Speak the beginning of the actual validated
 * coaching reply, not only its last question. No network, storage or provider.
 * Google Chirp's existing 500-char / 1600-byte request cap is unchanged.
 */
export function coachSpokenText(value,maxChars=500,maxUtf8Bytes=1600){
  const full=typeof value==='string'?value.replace(/\s+/gu,' ').trim():''
  if(!full)return {text:'',truncated:false}
  const cap=Number.isInteger(maxChars)&&maxChars>=32&&maxChars<=900?maxChars:500
  const byteCap=Number.isInteger(maxUtf8Bytes)&&maxUtf8Bytes>=100&&maxUtf8Bytes<=4000?maxUtf8Bytes:1600
  const encoder=new TextEncoder()
  if(full.length<=cap&&encoder.encode(full).length<=byteCap)return {text:full,truncated:false}
  const ellipsis='…',ellipsisBytes=encoder.encode(ellipsis).length
  let prefix='',bytes=0
  for(const character of full){
    const size=encoder.encode(character).length
    if(prefix.length+character.length+ellipsis.length>cap||bytes+size+ellipsisBytes>byteCap)break
    prefix+=character
    bytes+=size
  }
  let chosen=prefix.trimEnd()
  const sentence=[...chosen.matchAll(/[.!?。！？](?=\s|$)/gu)].at(-1)
  if(sentence&&sentence.index+1>=Math.floor(chosen.length*0.5))
    chosen=chosen.slice(0,sentence.index+1).trimEnd()
  else{
    const space=chosen.lastIndexOf(' ')
    if(space>=Math.floor(chosen.length*0.65))chosen=chosen.slice(0,space).trimEnd()
  }
  return {text:chosen?chosen+ellipsis:'',truncated:true}
}
