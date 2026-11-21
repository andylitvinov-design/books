import {coachGroqReasoningEffort,GROQ_COACH_MODEL} from './groq-coach-provider.mjs'

const endpoint='https://api.groq.com/openai/v1/chat/completions'
const keyPattern=/^gsk_[A-Za-z0-9_-]{20,}$/
const jsonInstruction='Return ONLY JSON with message, planSuggestion, evidenceQuote and clientEvidence.'
export const COACH_GROQ_STREAM_MAX=700

/** Same reviewed persona + Director context, with a plain-text final sentence.
 * No speculative plan, evidence, stage, or tool calls can come from this stream.
 * They are validated and decided by the server after the final token. */
export function coachStreamingMessages(messages){
  if(!Array.isArray(messages)||messages.length<2||messages.length>16||
     messages.some(m=>!['system','user','assistant'].includes(m?.role)||
       typeof m.content!=='string'||m.content.length>12000))throw Error('GROQ_COACH_REQUEST_INVALID')
  const first=messages[0]
  const marker=first.content.indexOf(jsonInstruction)
  if(first.role!=='system'||marker<0)throw Error('GROQ_COACH_REQUEST_INVALID')
  return [{...first,content:first.content.slice(0,marker).trimEnd()+
    '\nSTREAMED SPEECH OUTPUT: Reply ONLY with the natural spoken reply text. No JSON, markdown, stages, explanation of policy or labels. '+
    'One or two short sentences, at most one question; usually under 35 spoken words. '+
    'Never invent a client action or claim a stage was completed. '+
    'If the latest client asks for more depth, give a direct but concise answer.'},
    ...messages.slice(1)]
}

/** Strictly bound incremental SSE parsing. Reasoning tokens and tool payloads
 * are ignored; only delta.content is ever shown. No transcript logging. */
export async function readGroqTextStream(response,onDelta=()=>{},signal){
  if(response?.status===429)throw Error('GROQ_COACH_RATE_LIMIT')
  if(response?.status===401||response?.status===403)throw Error('GROQ_COACH_AUTH_FAILURE')
  if(!response?.ok||!response.body?.getReader)throw Error('GROQ_COACH_UNAVAILABLE')
  const reader=response.body.getReader(),decoder=new TextDecoder()
  let pending='',text='',finished=false,done=false,bytes=0
  const event=(raw)=>{
    const data=raw.split('\n').filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trim()).join('\n')
    if(!data)return
    if(data==='[DONE]'){done=true;return}
    let item
    try{item=JSON.parse(data)}catch{throw Error('GROQ_COACH_RESPONSE_INVALID')}
    if(item?.error||(item?.model&&item.model!==GROQ_COACH_MODEL))
      throw Error('GROQ_COACH_RESPONSE_INVALID')
    const choice=item?.choices?.[0]
    if(!choice)return
    if(choice.delta?.tool_calls||choice.message?.tool_calls)
      throw Error('GROQ_COACH_RESPONSE_INVALID')
    if(choice.finish_reason){
      if(choice.finish_reason!=='stop')throw Error('GROQ_COACH_RESPONSE_INVALID')
      finished=true
    }
    const part=choice.delta?.content
    if(part===null||part===undefined)return
    if(typeof part!=='string'||finished&&part)throw Error('GROQ_COACH_RESPONSE_INVALID')
    if(!part)return
    text+=part
    if(text.length>COACH_GROQ_STREAM_MAX||/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(part))
      throw Error('GROQ_COACH_RESPONSE_INVALID')
    onDelta(part)
  }
  try{
    while(true){
      if(signal?.aborted)throw Error('GROQ_COACH_ABORTED')
      const {value,done:ended}=await reader.read()
      if(ended)break
      bytes+=value?.byteLength||0
      if(bytes>120000)throw Error('GROQ_COACH_RESPONSE_INVALID')
      pending=(pending+decoder.decode(value,{stream:true})).replace(/\r\n/g,'\n')
      let index
      while((index=pending.indexOf('\n\n'))!==-1){
        event(pending.slice(0,index));pending=pending.slice(index+2)
        if(done)break
      }
      if(done)break
    }
    if(pending.trim()&&!done)event(pending.trim())
    if(!finished||!text.trim()||text.trim().length<3)throw Error('GROQ_COACH_RESPONSE_INVALID')
    return text.trim()
  }finally{
    try{await reader.cancel()}catch{}
    try{reader.releaseLock()}catch{}
  }
}

/** One FREE-tier / account-ZDR-gated model call, no strict JSON mode (Groq
 * does not support streaming with Structured Outputs), no paid fallback. */
export async function verifiedGroqCoachingStream(config,{messages,voiceMode=false},onDelta=()=>{},
  fetcher=globalThis.fetch,signal){
  if(config?.provider!=='groq'||config.preferredModel!==GROQ_COACH_MODEL||
    typeof config.apiKey!=='string'||!keyPattern.test(config.apiKey))
    throw Error('GROQ_COACH_REQUEST_INVALID')
  const streamed=coachStreamingMessages(messages)
  const effort=coachGroqReasoningEffort(streamed,false,voiceMode)
  const payload={model:GROQ_COACH_MODEL,messages:streamed,stream:true,
    include_reasoning:false,reasoning_effort:effort,
    temperature:0.5,max_completion_tokens:voiceMode?1050:1500}
  let response
  try{
    response=await fetcher(endpoint,{
      method:'POST',redirect:'error',cache:'no-store',signal,
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.apiKey},
      body:JSON.stringify(payload),
    })
  }catch(error){
    if(signal?.aborted)throw Error('GROQ_COACH_ABORTED')
    throw Error('GROQ_COACH_UNAVAILABLE')
  }
  const text=await readGroqTextStream(response,onDelta,signal)
  return {provider:'groq',model:GROQ_COACH_MODEL,text,reasoningEffort:effort}
}
