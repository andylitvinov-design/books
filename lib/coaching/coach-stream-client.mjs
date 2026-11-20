// Browser-only SSE reader for the signed-in My Coach turn endpoint.
import {coachLooksLikeProtocolText} from './coach-stream-format.mjs'
// Deltas are provisional. A separately authorized complete sentence may
// play early; only the final Director-reviewed result enters the transcript.
export async function readCoachTurnStream(response,{onPreview=()=>{},onApprovedPhrase=()=>{},signal}={}){
  if(!response?.ok||!response.body?.getReader||
      !String(response.headers?.get?.('content-type')||'').includes('text/event-stream'))
    throw Error('COACH_STREAM_UNAVAILABLE')
  const reader=response.body.getReader(),decoder=new TextDecoder()
  let buffer='',preview='',result=null,complete=false,bytes=0,approvedPhrase='',protocolPreview=false
  const accept=(block)=>{
    const data=block.split('\n').filter(line=>line.startsWith('data:'))
      .map(line=>line.slice(5).trim()).join('\n')
    if(!data)return
    let frame
    try{frame=JSON.parse(data)}catch{throw Error('COACH_STREAM_INVALID')}
    if(frame?.type==='delta'&&typeof frame.value==='string'&&!complete){
      preview+=frame.value
      if(preview.length>700)throw Error('COACH_STREAM_INVALID')
      if(coachLooksLikeProtocolText(preview))protocolPreview=true
      if(protocolPreview)onPreview('')
      else if(preview.trim())onPreview(preview)
      return
    }
    if(frame?.type==='approved_phrase'&&!complete&&!approvedPhrase&&!protocolPreview&&
       typeof frame.value==='string'&&frame.value.length>=20&&frame.value.length<=220&&
       preview.startsWith(frame.value)){
      approvedPhrase=frame.value
      onApprovedPhrase(frame.value)
      return
    }
    if(frame?.type==='result'&&!complete&&frame.result&&
       typeof frame.result==='object'&&!Array.isArray(frame.result)){
      if(frame.result.approvedSpokenPrefix!==undefined&&
         (typeof frame.result.approvedSpokenPrefix!=='string'||
          (frame.result.approvedSpokenPrefix!==''&&frame.result.approvedSpokenPrefix!==approvedPhrase)))
        throw Error('COACH_STREAM_INVALID')
      if(frame.result.mode==='ai'&&coachLooksLikeProtocolText(frame.result.message))
        throw Error('COACH_STREAM_INVALID')
      if(approvedPhrase&&frame.result.approvedSpokenPrefix&&
         !String(frame.result.message||'').startsWith(approvedPhrase))
        throw Error('COACH_STREAM_INVALID')
      result=frame.result
      complete=true
      onPreview('')
      return
    }
    throw Error('COACH_STREAM_INVALID')
  }
  try{
    while(true){
      if(signal?.aborted)throw Error('COACH_STREAM_ABORTED')
      const {value,done}=await reader.read()
      if(done)break
      bytes+=value?.byteLength||0
      if(bytes>160000)throw Error('COACH_STREAM_INVALID')
      buffer=(buffer+decoder.decode(value,{stream:true})).replace(/\r\n/g,'\n')
      let end
      while((end=buffer.indexOf('\n\n'))>=0){
        accept(buffer.slice(0,end));buffer=buffer.slice(end+2)
        if(complete)break
      }
      if(complete)break
    }
    if(buffer.trim()&&!complete)accept(buffer.trim())
    if(!complete||!result?.mode)throw Error('COACH_STREAM_INVALID')
    return result
  }finally{
    onPreview('')
    try{await reader.cancel()}catch{}
    try{reader.releaseLock()}catch{}
  }
}
