// Narrow, opt-in bridge to the existing authenticated My Coach Gemini Free
// text route. "Pro" is a consultation experience, NOT Gemini Paid billing.
export const ALI_GEMINI_FREE_ENDPOINT='/api/app/my-coach/turn'
const personas=new Set(['max','mira','sofia','alex'])
const locales=new Set(['en','ru','es'])
/**
 * @typedef {{role:'user'|'assistant',content:string}} AliGeminiTurn
 * @param {{message?:string,personaId?:string,locale?:string,turns?:AliGeminiTurn[],consent?:boolean,freeDataConsent?:boolean}} [input]
 */
export function aliGeminiRequest({message,personaId,locale,turns=[],consent=false,freeDataConsent=false}={}){
 const text=typeof message==='string'?message.trim():''
 if(!consent||!freeDataConsent||!personas.has(personaId)||!locales.has(locale)||
    !text||text.length>1200||!Array.isArray(turns)||turns.length>10)
   throw Error('ALI_GEMINI_CONSENT_OR_INPUT_REQUIRED')
 const safe=turns.map(turn=>{
   if(!turn||!['user','assistant'].includes(turn.role)||typeof turn.content!=='string'||
      !turn.content.trim()||turn.content.length>900)
     throw Error('ALI_GEMINI_HISTORY_INVALID')
   return {role:turn.role,content:turn.content.trim()}
 })
 return {personaId,locale,settings:{questionsPerTurn:1},consent:true,
    engine:'gemini_free',geminiConsent:true,geminiFreeDataConsent:true,
    message:text,turns:safe,elapsedSeconds:0}
}
export function aliGeminiResult(payload){
 if(payload?.mode==='ai'&&payload?.inference?.provider==='gemini_free'&&
    typeof payload.message==='string'&&payload.message.trim().length>0&&payload.message.length<=5000)
   return {kind:'gemini',text:payload.message.trim()}
 if(['safety','boundary'].includes(payload?.mode)){
   const text=[payload.reflection,payload.question].filter(x=>typeof x==='string'&&x.trim()).join(' ').trim()
   if(text&&text.length<=3000)return {kind:'safety',text}
 }
 throw Error('ALI_GEMINI_UNVERIFIED_RESULT')
}
