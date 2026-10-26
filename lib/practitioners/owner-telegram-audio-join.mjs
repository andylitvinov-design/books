// Losslessly chain self-contained Telegram Ogg/Opus voice messages.
// Ogg Opus RFC 7845 permits complete, consecutive logical bitstreams.
// No decoder, external conversion service, temp public URL or shell command.
export const OWNER_AUDIO_COMBINE_MAX_PARTS=8
export const OWNER_AUDIO_COMBINE_MAX_BYTES=20_000_000
const OGG_POLY=0x04c11db7
const OGG_CRC_TABLE=Uint32Array.from({length:256},(_,index)=>{
  let n=index<<24
  for(let i=0;i<8;i++)n=((n<<1)^((n&0x80000000)?OGG_POLY:0))>>>0
  return n
})
function crc32(bytes,from,to){
  let crc=0
  for(let i=from;i<to;i++){
    const value=i>=from+22&&i<from+26?0:bytes[i]
    crc=((crc<<8)^OGG_CRC_TABLE[((crc>>>24)^value)&255])>>>0
  }
  return crc>>>0
}
function invalid(){throw new Error('OWNER_AUDIO_COMBINE_INVALID_OPUS')}
function looksLike(bytes,offset,text){
  return [...text].every((character,index)=>bytes[offset+index]===character.charCodeAt(0))
}
export function joinOggOpus(parts){
  if(!Array.isArray(parts)||parts.length<2||parts.length>OWNER_AUDIO_COMBINE_MAX_PARTS)
    throw new Error('OWNER_AUDIO_COMBINE_INVALID_PART_COUNT')
  const used=new Set(),chunks=[]
  let total=0
  for(let index=0;index<parts.length;index++){
    const source=parts[index]
    if(!(source instanceof Uint8Array)||source.length<80||
       total+source.length>OWNER_AUDIO_COMBINE_MAX_BYTES)invalid()
    const pages=[]
    let offset=0,serial=null,expectedSequence=0,sawEnd=false
    while(offset<source.length){
      if(offset+27>source.length||!looksLike(source,offset,'OggS')||
         source[offset+4]!==0||sawEnd)invalid()
      const flags=source[offset+5]
      if(flags&~0x07)invalid()
      const count=source[offset+26]
      if(offset+27+count>source.length)invalid()
      let contentLength=0
      for(let segment=0;segment<count;segment++)contentLength+=source[offset+27+segment]
      const size=27+count+contentLength
      if(offset+size>source.length)invalid()
      const view=new DataView(source.buffer,source.byteOffset+offset,size)
      const currentSerial=view.getUint32(14,true)
      const pageIndex=view.getUint32(18,true)
      if(serial===null){
        if(!(flags&2)||pageIndex!==0||
           !looksLike(source,offset+27+count,'OpusHead'))invalid()
        serial=currentSerial
      }else if(currentSerial!==serial||flags&2)invalid()
      if(pageIndex!==expectedSequence++)invalid()
      if(view.getUint32(22,true)!==crc32(source,offset,offset+size))invalid()
      if(flags&4)sawEnd=true
      pages.push({offset,size})
      offset+=size
    }
    if(!sawEnd||pages.length<2)invalid()
    let outputSerial=serial
    while(used.has(outputSerial))outputSerial=(outputSerial+0x9e3779b9)>>>0
    used.add(outputSerial)
    const bytes=new Uint8Array(source)
    if(outputSerial!==serial){
      for(const page of pages){
        const view=new DataView(bytes.buffer,page.offset,page.size)
        view.setUint32(14,outputSerial,true)
        view.setUint32(22,0,true)
        view.setUint32(22,crc32(bytes,page.offset,page.offset+page.size),true)
      }
    }
    chunks.push(bytes)
    total+=bytes.length
  }
  const result=new Uint8Array(total)
  let position=0
  for(const chunk of chunks){result.set(chunk,position);position+=chunk.length}
  return result
}
