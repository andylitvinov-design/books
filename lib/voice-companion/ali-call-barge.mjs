import {startCoachRecordedTurn} from '../personal-coaching/coach-recorded-turn.mjs';
import {isCoachBargeEcho} from '../personal-coaching/coach-barge-in.mjs';

// Only the consented owner audio pilot uses this monitor. The same recorded
// microphone track is transferred from local echo monitoring to normal STT.
// No second model, provider, voice quota, or persisted audio.
export function startAliCallBarge({environment,context,locale,spokenText,isCurrent,
 onDuck=()=>{},onReady=()=>{},onInterrupt=()=>{},onListen=()=>{},
 onTranscribing=()=>{},onResult=()=>{},onEcho=()=>{},onFailure=()=>{},
 startCapture=startCoachRecordedTurn}={}){
 let active=true,listening=false,interrupted=false,capture=null;
 const valid=()=>active&&isCurrent?.()===true;
 const end=()=>{active=false;capture=null};
 try{
  capture=startCapture({environment,audioContext:context,locale,purpose:'ali_chat',
   textOnly:true,fastConversation:true,monitorPlayback:true,
   onState:state=>{
    if(!valid())return;
    if(state==='listening'){
     if(listening||interrupted)onListen();
     else onReady();
    }else if(state==='hearing'&&(listening||interrupted))onListen();
    else if(state==='transcribing'&&(listening||interrupted))onTranscribing();
   },
   onCandidate:()=>{if(valid()&&!listening&&!interrupted)onDuck(0.18)},
   onCandidateExpired:()=>{if(valid()&&!interrupted)onDuck(1)},
   onSpeechDetected:()=>{
    if(!valid()||listening||interrupted)return;
    interrupted=true;
    onInterrupt();
   },
   onResult:text=>{
    if(!valid())return;
    // No transcription is accepted while still merely monitoring playback.
    if(!listening&&!interrupted){end();onFailure('MIC_CAPTURE',false);return}
    const echo=interrupted&&isCoachBargeEcho(text,spokenText);
    end();
    if(echo)onEcho();else onResult(text);
   },
   onFailure:code=>{
    if(!valid())return;
    const clientCapture=listening||interrupted;
    end();onFailure(code,clientCapture);
   }
  });
 }catch{return null}
 if(!capture)return null;
 return {
  continueAfterCoach(){
   if(!valid()||interrupted)return false;
   listening=true;
   if(capture?.continueAfterCoach?.())return true;
   listening=false;return false;
  },
  cancel(){if(!active)return;active=false;capture?.cancel();capture=null},
 };
}
