// Pure model-output format guard. No data or audio leaves this module.
const keys=new Set(['message','planSuggestion','evidenceQuote','clientEvidence'])
export function coachLooksLikeProtocolText(raw){
 if(typeof raw!=='string')return false
 const value=raw.trimStart()
 return Boolean(value&&/^[{[\x60"]/u.test(value))
}
export function coachReviewableStreamReply(raw){
 if(typeof raw!=='string'||!raw.trim()||raw.length>3400)
   throw Error('COACHING_BRAIN_RESPONSE_INVALID')
 const value=raw.trim()
 if(!coachLooksLikeProtocolText(value))
   return JSON.stringify({message:value,planSuggestion:'',evidenceQuote:'',
     clientEvidence:{kind:'none',quote:''}})
 const fence=value.match(/^\x60{3}(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n\x60{3}$/iu)
 const candidate=fence?fence[1].trim():value
 if(!candidate.startsWith('{'))throw Error('COACHING_BRAIN_RESPONSE_INVALID')
 let item
 try{item=JSON.parse(candidate)}catch{throw Error('COACHING_BRAIN_RESPONSE_INVALID')}
 if(!item||typeof item!=='object'||Array.isArray(item)||
    !Object.hasOwn(item,'message')||typeof item.message!=='string'||
    Object.keys(item).some(k=>!keys.has(k)))
   throw Error('COACHING_BRAIN_RESPONSE_INVALID')
 if(coachLooksLikeProtocolText(item.message)){
   // One bounded nested legacy Groq envelope is recoverable, but it cannot
   // supply method evidence, action suggestions or a second instruction.
   let nested
   try{nested=JSON.parse(item.message)}catch{throw Error('COACHING_BRAIN_RESPONSE_INVALID')}
   if(!nested||Array.isArray(nested)||typeof nested!=='object'||
      !Object.hasOwn(nested,'message')||typeof nested.message!=='string'||
      Object.keys(nested).some(k=>!keys.has(k))||
      coachLooksLikeProtocolText(nested.message))
     throw Error('COACHING_BRAIN_RESPONSE_INVALID')
   item={message:nested.message,planSuggestion:'',evidenceQuote:'',
     clientEvidence:{kind:'none',quote:''}}
 }
 return JSON.stringify(item)
}
