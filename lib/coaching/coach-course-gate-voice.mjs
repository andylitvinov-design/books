// Optional browser speech input, not independent proof of delivery or identity.
import {protocolAnswerClass} from './coach-protocol-validation-gate.mjs'
import {isCoachBargeEcho} from '../personal-coaching/coach-barge-in.mjs'
export function courseGateVoiceDecision({promptId,currentPromptId,final,text,confidence,failed=false,spokenPrompt='',continuous=false,playbackCompleted=false}={}){
 if(failed||!promptId||promptId!==currentPromptId||final!==true||typeof text!=='string')return {action:'ignore',text:''}
 const value=text.trim()
 if(!value||value.length>900||protocolAnswerClass(value)==='invalid')return {action:'ignore',text:''}
 if(isCoachBargeEcho(value,spokenPrompt))return {action:'ignore',text:''}
 if(continuous&&!playbackCompleted)return {action:'review',text:value}
 if(typeof confidence!=='number'||!Number.isFinite(confidence)||confidence<0.9||confidence>1)return {action:'review',text:value}
 return {action:'submit',text:value}
}

// Only an acknowledged different prompt may continue an opt-in loop.
export function courseGateVoiceNext({enabled,waiting,blocked,promptId,submittedPromptId}={}){
 return enabled===true&&waiting!==true&&blocked!==true&&typeof promptId==='string'&&Boolean(promptId)&&promptId!==submittedPromptId
}
