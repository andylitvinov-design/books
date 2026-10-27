// Remux validated Ogg/Opus voice messages into ONE logical stream.
// Retains compressed Opus packets; no public storage, transcoding, or paid API.
export const OWNER_AUDIO_COMBINE_MAX_PARTS=12
export const OWNER_AUDIO_COMBINE_MAX_BYTES=20_000_000
const POLY=0x04c11db7
const CRC_TABLE=Uint32Array.from({length:256},(_,index)=>{
  let n=index<<24
  for(let i=0;i<8;i++)n=((n<<1)^((n&0x80000000)?POLY:0))>>>0
  return n
})
const GRANULE_UNDEFINED=(1n<<64n)-1n
function invalid(stage){
  const err=new Error('OWNER_AUDIO_COMBINE_INVALID_OPUS')
  err.code='OWNER_AUDIO_COMBINE_INVALID_OPUS'
  err.stage=stage
  throw err
}
function crc32(bytes,from,to){
  let crc=0
  for(let i=from;i<to;i++){
    const value=i>=from+22&&i<from+26?0:bytes[i]
    crc=((crc<<8)^CRC_TABLE[((crc>>>24)^value)&255])>>>0
  }
  return crc>>>0
}
function startsWith(bytes,offset,label){
  return [...label].every((value,i)=>bytes[offset+i]===value.charCodeAt(0))
}
function readStream(source){
  if(!(source instanceof Uint8Array)||source.length<128)
    invalid('length')
  const pages=[]
  let offset=0,serial=null,seq=0,seenEnd=false,prevGranule=0n
  while(offset<source.length){
    if(offset+27>source.length||!startsWith(source,offset,'OggS')||
       source[offset+4]!==0||seenEnd)invalid('capture')
    const flags=source[offset+5],n=source[offset+26]
    if(flags&~7||offset+27+n>source.length||n===0)invalid('segments')
    let payloadLength=0
    for(let i=0;i<n;i++)payloadLength+=source[offset+27+i]
    const size=27+n+payloadLength
    if(offset+size>source.length)invalid('truncated')
    const view=new DataView(source.buffer,source.byteOffset+offset,size)
    const serialHere=view.getUint32(14,true),number=view.getUint32(18,true)
    if(serial===null){
      if(!(flags&2)||number!==0||!startsWith(source,offset+27+n,'OpusHead'))
        invalid('opus_head')
      serial=serialHere
    }else if(serial!==serialHere||flags&2)invalid('serial')
    if(number!==seq++)invalid('page_sequence')
    if(view.getUint32(22,true)!==crc32(source,offset,offset+size))invalid('crc')
    const granule=view.getBigUint64(6,true)
    if(granule!==GRANULE_UNDEFINED){
      if(granule<prevGranule)invalid('granule')
      prevGranule=granule
    }
    pages.push({offset,size,flags,granule,segments:n,payload:offset+27+n})
    if(flags&4)seenEnd=true
    offset+=size
  }
  if(pages.length<3||prevGranule===0n)invalid('end')
  if(!seenEnd){
    // Telegram/iOS forwarded voice clips can end at a complete Ogg page
    // without setting EOS. Accept ONLY a complete, checked last packet with
    // a positive final granule; malformed/truncated streams still fail.
    const last=pages[pages.length-1]
    const lastLacing=source[last.offset+27+last.segments-1]
    if(last.granule===GRANULE_UNDEFINED||last.granule===0n||
       lastLacing===255)invalid('end')
    // joinOggOpus sets EOS only on the final output page and recomputes CRC.
  }
  const first=pages[0],head=first.payload
  const headerLength=first.size-(head-first.offset)
  if(headerLength<19||source[head+8]>15||source[head+9]!==1||
     source[head+18]!==0)invalid('unsupported_voice_head')
  // Ogg/Opus identification and tags must end on their own pages.
  if(source[first.offset+27+first.segments-1]===255)
    invalid('continued_head')
  if(!startsWith(source,pages[1].payload,'OpusTags'))invalid('opus_tags')
  let audioPage=2,tagCompleted=false
  for(let p=1;p<pages.length;p++){
    const page=pages[p],lacingOffset=page.offset+27
    for(let i=0;i<page.segments;i++){
      if(source[lacingOffset+i]!==255){
        if(i!==page.segments-1)invalid('tag_shares_audio_page')
        tagCompleted=true
      }
    }
    if(tagCompleted){audioPage=p+1;break}
  }
  if(!tagCompleted||audioPage>=pages.length)invalid('missing_audio')
  return {source,pages,audioPage,serial,finalGranule:prevGranule,
    channels:source[head+9],family:source[head+18]}
}
export function joinOggOpus(parts){
  if(!Array.isArray(parts)||parts.length<2||
     parts.length>OWNER_AUDIO_COMBINE_MAX_PARTS)
    throw new Error('OWNER_AUDIO_COMBINE_INVALID_PART_COUNT')
  let size=0
  const streams=parts.map(part=>{
    if(!(part instanceof Uint8Array)||size+part.length>OWNER_AUDIO_COMBINE_MAX_BYTES)
      invalid('size')
    size+=part.length
    return readStream(part)
  })
  // Telegram voice is normally mono mapping-family-0; reject mismatched streams.
  if(streams.some(s=>s.channels!==streams[0].channels||s.family!==streams[0].family))
    invalid('layout')
  const serial=streams[0].serial,output=[]
  let pageNumber=0,granuleShift=0n,total=0
  for(let index=0;index<streams.length;index++){
    const stream=streams[index]
    const start=index===0?0:stream.audioPage
    for(let i=start;i<stream.pages.length;i++){
      const original=stream.pages[i]
      const bytes=new Uint8Array(stream.source.subarray(
        original.offset,original.offset+original.size))
      const view=new DataView(bytes.buffer)
      let flags=original.flags&~(2|4)
      if(index===0&&i===0)flags|=2
      if(index===streams.length-1&&i===stream.pages.length-1)flags|=4
      bytes[5]=flags
      view.setUint32(14,serial,true)
      view.setUint32(18,pageNumber++,true)
      if(original.granule!==GRANULE_UNDEFINED){
        const newGranule=original.granule+granuleShift
        if(newGranule>=GRANULE_UNDEFINED)invalid('granule_overflow')
        view.setBigUint64(6,newGranule,true)
      }
      view.setUint32(22,0,true)
      view.setUint32(22,crc32(bytes,0,bytes.length),true)
      output.push(bytes)
      total+=bytes.length
    }
    granuleShift+=stream.finalGranule
  }
  const joined=new Uint8Array(total)
  let at=0
  for(const page of output){joined.set(page,at);at+=page.length}
  return joined
}
