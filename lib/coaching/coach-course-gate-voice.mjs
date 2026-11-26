// Optional browser speech input, not independent proof of delivery or identity.
import {protocolAnswerClass} from './coach-protocol-validation-gate.mjs'
export function courseGateVoiceDecision({promptId,currentPromptId,final,text,confidence,failed=false}={}){
 if(failed||!promptId||promptId!==currentPromptId||final!==true||typeof text!=='string')return {action:'ignore',text:''}
 const value=text.trim()
 if(!value||value.length>900||protocolAnswerClass(value)==='invalid')return {action:'ignore',text:''}
 if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0.9||confidence>1)return {action:'review',text:value}
 return {action:'submit',text:value}
}
