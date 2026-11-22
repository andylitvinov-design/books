/*
 * An iPhone fallback for WebKit's silent SpeechRecognition sessions.
 * A single initial Play is the consented activation. Capture is ephemeral:
 * MediaRecorder fragments and the microphone stream are destroyed after each
 * utterance or End; raw audio is never put in browser storage or the Cabinet.
 * Server receives exactly one voiced phrase at a time, through the existing
 * free-quota-only, same-origin Groq Whisper STT bridge.
 */
import {createCoachBargeGate} from './coach-barge-in.mjs';
const LOCALES = new Set(['ru','en','es']);
export function coachFallbackLocale(input='en'){
  return LOCALES.has(input)?input:'en';
}
export function coachRecordingMime(Recorder){
  const candidates=[['audio/mp4','m4a'],['audio/webm;codecs=opus','webm'],['audio/webm','webm']];
  if(typeof Recorder?.isTypeSupported!=='function')return {mime:'',extension:'m4a'};
  for(const [mime,extension] of candidates)
    if(Recorder.isTypeSupported(mime))return {mime,extension};
  return null;
}
/** Energy-only local VAD. It does not transcribe or export audio. */
export function createCoachVoiceGate({silenceMs=1900,maxSpeechMs=45000,resetAfterMs=16000}={}){
  let start=null,heardAt=null,lastVoice=0,highTicks=0;
  let noiseFloor=0.003;
  return {
    update(now,rms){
      if(start===null)start=now;
      const energy=Number.isFinite(rms)?Math.max(0,rms):0;
      const threshold=Math.max(0.016,noiseFloor*2.8);
      const sound=energy>threshold;
      if(!heardAt){
        if(sound)highTicks+=1;
        else{highTicks=0;noiseFloor=noiseFloor*0.95+energy*0.05;}
        if(highTicks>=2){heardAt=now;lastVoice=now;return 'speech';}
        if(now-start>=resetAfterMs){start=now;return 'rotate';}
        return 'silence';
      }
      if(sound)lastVoice=now;
      if(now-lastVoice>=silenceMs||now-heardAt>=maxSpeechMs)return 'finish';
      return 'speech';
    },
    get heard(){return heardAt!==null},
  };
}
export function coachRecordingFailureCode(error){
  const code=String(error?.name||'')+' '+String(error?.message||error||'');
  return /NotAllowed|Permission|SecurityError/i.test(code)?'MIC_PERMISSION':
    /NotFound|DevicesNotFound/i.test(code)?'MIC_MISSING':
    // Authentication and free quota are distinct from microphone failures:
    // never send the user through Safari's known-deaf Web Speech fallback.
    /AUDIO_STT_401|SIGN_IN_REQUIRED/i.test(code)?'STT_SIGN_IN':
    /AUDIO_STT_429|RATE_LIMITED/i.test(code)?'STT_RATE_LIMIT':
    // Empty or invalid iPhone MediaRecorder output did not exhaust STT quota.
    /AUDIO_STT_INVALID_FILE/i.test(code)?'MIC_CAPTURE':
    /AUDIO_STT_EMPTY/i.test(code)?'MIC_NO_SIGNAL':
    /AUDIO_STT_|503|CLOUD_STT_/i.test(code)?'STT_UNAVAILABLE':
    /MIC_NO_SIGNAL/i.test(code)?'MIC_NO_SIGNAL':'MIC_CAPTURE';
}
/**
 * Starts one speech turn. No extra tap after Play and no raw audio persistence.
 * Only onResult sends the user's verified recognized text to Coach Director.
 * All provided dependencies can be replaced in isolated lifecycle tests.
 */
export function coachRecordedSupported(environment){
  return Boolean(environment?.navigator?.mediaDevices?.getUserMedia &&
    typeof environment.MediaRecorder==='function' &&
    (typeof environment.AudioContext==='function' ||
      typeof environment.webkitAudioContext==='function') &&
    coachRecordingMime(environment.MediaRecorder));
}
export function startCoachRecordedTurn({
  locale='en',environment=globalThis,audioContext=null,fetcher=null,onState=()=>{},
  onResult=()=>{},onFailure=()=>{},onLevel=()=>{},
  monitorPlayback=false,onCandidate=()=>{},onCandidateExpired=()=>{},onSpeechDetected=()=>{},
}={}){
  const devices=environment.navigator?.mediaDevices;
  const Recorder=environment.MediaRecorder;
  const Context=environment.AudioContext||environment.webkitAudioContext;
  const media=coachRecordingMime(Recorder);
  if(typeof devices?.getUserMedia!=='function'||typeof Recorder!=='function'||
     typeof Context!=='function'||!media)return null;
  const request=fetcher||environment.fetch?.bind(environment);
  if(typeof request!=='function')return null;
  let cancelled=false,turnDone=false,stream=null,context=null,borrowedContext=false,source=null,recorder=null,clockTimer=null;
  let chunks=[],mime='',extension=media.extension,recorderMode='none',started=0;
  let gate=createCoachVoiceGate({silenceMs:1050}),buffer=null,analyser=null,seenSpeech=false,quietNotified=false;
  const iosMicrophone=/iP(?:hone|ad|od)/iu.test(String(environment.navigator?.userAgent||''))
  // WebKit AEC attenuates nearby speech while the coach plays. Confirm real
  // sound after the existing output duck; do not transcribe a mere candidate.
  let monitorMode=monitorPlayback===true,bargeGate=createCoachBargeGate(
    iosMicrophone?{threshold:0.019,candidateTicks:2,confirmTicks:2,releaseTicks:3}:{})
  // Bounded local recovery for iPhone granted-but-muted or digitally flat audio.
  let localRecoveries=0,forceFreshContext=false,flatlineSince=null,muteSince=null;
  let confirmedBarge=false,lastConfirmedVoiceAt=0,confirmedAt=0;
  const controller=new AbortController();
  const now=()=>environment.performance?.now?.()??Date.now();
  const interval=environment.setInterval?.bind(environment)||setInterval;
  const clearIntervalFn=environment.clearInterval?.bind(environment)||clearInterval;
  function closeCapture(){
    if(clockTimer!==null){clearIntervalFn(clockTimer);clockTimer=null;}
    onLevel(0);
    if(recorder){
      try{recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;
        if(recorder.state==='recording')recorder.stop();}catch{}
      recorder=null;
    }
    try{source?.disconnect?.();}catch{}
    try{analyser?.disconnect?.();}catch{}
    source=null;analyser=null;
    if(stream){try{for(const track of stream.getTracks())track.stop();}catch{} stream=null;}
    if(context){if(!borrowedContext)try{void context.close?.().catch?.(()=>{});}catch{}context=null;}
  }
  function fail(error){
    if(cancelled)return;
    cancelled=true;
    controller.abort();
    closeCapture();
    chunks=[];
    onFailure(coachRecordingFailureCode(error));
  }
  function recoverCapture(){
    // The iPhone's audio session can be interrupted while the coach is
    // playing, not only while we are actively recording the user's reply.
    // Recover the local monitor once before disabling automatic interruption.
    if(cancelled||turnDone||seenSpeech)return;
    if(localRecoveries>=1){fail(Error('MIC_NO_SIGNAL'));return;}
    localRecoveries++;
    onState('recovering');
    closeCapture();
    forceFreshContext=true;flatlineSince=null;muteSince=null;
    if(monitorMode)bargeGate.reset();
    void setup(); // Mic-only reacquisition: no STT/model request or audio upload.
  }
  async function transcribe(voiceChunks,type,ext){
    if(cancelled)return;
    onState('transcribing');
    try{
      const fileType=(type||'audio/mp4').split(';')[0].toLowerCase();
      const blob=new Blob(voiceChunks,{type:fileType});
      if(blob.size<1200||blob.size>4*1024*1024)throw Error('AUDIO_STT_INVALID_FILE');
      const file=new File([blob],'coach-turn.'+ext,{type:fileType});
      const body=new FormData();
      body.set('file',file);
      body.set('locale',coachFallbackLocale(locale));
      body.set('purpose','my_coach');
      body.set('consent','yes');
      const response=await request('/api/holistic-support/audio-storyboard',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        signal:controller.signal,body,
      });
      if(!response.ok)throw Error('AUDIO_STT_'+response.status);
      const data=await response.json();
      if(cancelled)return;
      const answer=String(data?.transcript?.text||'').trim().slice(0,1200);
      if(!answer)throw Error('AUDIO_STT_EMPTY');
      cancelled=true;
      chunks=[];
      onResult(answer);
    }catch(error){if(!cancelled)fail(error);}
  }
  function record(){
    if(cancelled||!stream)return;
    chunks=[];gate=createCoachVoiceGate({silenceMs:1050});seenSpeech=false;quietNotified=false;started=now();
    recorderMode='none';
    try{
      recorder=media.mime?new Recorder(stream,{mimeType:media.mime}):new Recorder(stream);
      mime=recorder.mimeType||media.mime||'audio/mp4';
      extension=mime.startsWith('audio/webm')?'webm':'m4a';
      const thisRecorder=recorder;
      recorder.ondataavailable=e=>{if(!cancelled&&e.data?.size>0)chunks.push(e.data);};
      recorder.onerror=e=>fail(e.error||Error('MIC_RECORDER_ERROR'));
      recorder.onstop=()=>{
        if(cancelled||thisRecorder!==recorder)return;
        const mode=recorderMode,parts=chunks,format=mime,ext=extension;
        if(mode==='rotate'){recorder=null;chunks=[];record();return;}
        if(mode==='discard'){recorder=null;chunks=[];if(!monitorMode)record();return;}
        recorder=null;closeCapture();
        if(mode==='finish'&&seenSpeech)void transcribe(parts,format,ext);
      };
      recorder.start(500);
    }catch(error){fail(error);}
  }
  async function setup(){
    try{
      const captured=await devices.getUserMedia({audio:{
        echoCancellation:true,noiseSuppression:true,autoGainControl:true,
      }});
      if(cancelled){for(const track of captured.getTracks())track.stop();return;}
      stream=captured;
      context=!forceFreshContext&&audioContext&&
        !['closed','suspended','interrupted'].includes(audioContext.state)
        ?audioContext:new Context();
      borrowedContext=context===audioContext;
      source=context.createMediaStreamSource(stream);
      analyser=context.createAnalyser();
      analyser.fftSize=1024;
      source.connect(analyser);
      buffer=new Uint8Array(analyser.fftSize);
      try{await context.resume?.();}catch{
        if(!seenSpeech&&localRecoveries<1){recoverCapture();return;}
        throw Error('MIC_CONTEXT_BLOCKED');
      }
      if(cancelled)return;
      if(context.state&&context.state!=='running'){
        recoverCapture();return;
      }
      flatlineSince=null;muteSince=null;
      // Monitoring while the coach speaks does not start an audio recording.
      // A candidate opens a short recorder; silence never reaches Groq Whisper.
      if(!monitorMode)record();
      if(cancelled)return;
      onState('listening');
      clockTimer=interval(()=>{
        if(cancelled||turnDone||!analyser)return;
        if(!monitorMode&&(!recorder||recorder.state!=='recording'))return;
        analyser.getByteTimeDomainData(buffer);
        let sum=0;
        for(let i=0;i<buffer.length;i++){
          const x=(buffer[i]-128)/128;sum+=x*x;
        }
        const rms=Math.sqrt(sum/buffer.length);
        // Sample the existing ephemeral mic analyser. No extra capture or upload.
        onLevel(Math.min(1,Math.max(0,(rms-0.012)*7)));
        const current=now();
        if(!monitorMode&&!seenSpeech){
          const track=stream?.getAudioTracks?.()[0]||
            stream?.getTracks?.().find(row=>row.kind==='audio')||
            stream?.getTracks?.()[0];
          const interrupted=track?.muted===true||track?.readyState==='ended'||
            Boolean(context?.state&&context.state!=='running');
          if(interrupted){
            if(muteSince===null)muteSince=current;
            if(current-muteSince>=550){recoverCapture();return;}
          }else muteSince=null;
          // A perfectly flat digital signal can also mean a genuinely quiet
          // room with noise suppression: try once, but do not loop or fail on
          // flatline alone after reacquisition.
          if(buffer.every(sample=>sample===128)){
            if(flatlineSince===null)flatlineSince=current;
            if(localRecoveries===0&&current-flatlineSince>=4200){recoverCapture();return;}
          }else flatlineSince=null;
        }
        if(monitorMode){
          // A WebKit audio session switch can mute/end the monitoring track.
          // Report this to the owner loop rather than pretending to listen.
          const track=stream?.getAudioTracks?.()[0]||
            stream?.getTracks?.().find(row=>row.kind==='audio')||
            stream?.getTracks?.()[0];
          const muted=track?.muted===true||track?.readyState==='ended'||
            Boolean(context?.state&&context.state!=='running');
          if(muted){
            if(muteSince===null)muteSince=current;
            if(current-muteSince>=650){recoverCapture();return;}
          }else muteSince=null;
          // Some iOS Safari audio-session switches leave a formally live
          // but digitally silent monitor. Try one fresh capture; silence
          // after that is accepted as a quiet room, never a retry loop.
          if(iosMicrophone&&localRecoveries===0&&buffer.every(sample=>sample===128)){
            if(flatlineSince===null)flatlineSince=current;
            if(current-flatlineSince>=4200){recoverCapture();return;}
          }else flatlineSince=null;
          const barge=bargeGate.update(rms);
          if(barge==='candidate'){
            // The first 160-200 ms of speech is retained in the candidate
            // recorder. Ducking the coach distinguishes a user from its echo.
            if(!recorder)record();
            try{onCandidate();}catch{}
          }else if(barge==='restore'){
            try{onCandidateExpired();}catch{}
            if(recorder?.state==='recording'){
              recorderMode='discard';try{recorder.stop();}catch(error){fail(error);}
            }
          }else if(barge==='interrupt'){
            monitorMode=false;confirmedBarge=true;seenSpeech=true;
            confirmedAt=current;lastConfirmedVoiceAt=current;
            try{onSpeechDetected();}catch{}
            onState('hearing');
          }
          return;
        }
        if(confirmedBarge){
          if(rms>0.019)lastConfirmedVoiceAt=current;
          if(current-lastConfirmedVoiceAt<900&&current-confirmedAt<45000)return;
          turnDone=true;recorderMode='finish';
          if(clockTimer!==null){clearIntervalFn(clockTimer);clockTimer=null;}
          try{recorder.stop();}catch(error){fail(error);}
          return;
        }
        const event=gate.update(current,rms);
        if(event==='speech'&&!seenSpeech){
          seenSpeech=true;
          onState('hearing');
        }else if(event==='rotate'){
          // No provider request for silence. Discard and restart a fresh
          // browser-only recording to keep mobile memory bounded.
          recorderMode='rotate';
          try{recorder.stop();}catch(error){fail(error);}
        }else if(event==='finish'){
          turnDone=true;recorderMode='finish';
          if(clockTimer!==null){clearIntervalFn(clockTimer);clockTimer=null;}
          try{recorder.stop();}catch(error){fail(error);}
        }else if(!seenSpeech&&!quietNotified&&now()-started>8000){
          quietNotified=true;onState('quiet');
        }
      },100);
    }catch(error){fail(error);}
  }
  void setup();
  return {
    // Reuse this SAME captured mic track when uninterrupted coach audio ends.
    // On an actual barge-in the recorder continues until the client's pause.
    continueAfterCoach(){
      if(cancelled||!monitorMode)return false;
      monitorMode=false;bargeGate.reset();
      try{onCandidateExpired();}catch{}
      if(!recorder)record();
      else if(recorderMode!=='discard'){
        confirmedBarge=true;seenSpeech=true;
        confirmedAt=now();lastConfirmedVoiceAt=confirmedAt;
      }
      onState('listening');
      return true;
    },
    cancel(){
      if(cancelled)return;
      cancelled=true;controller.abort();closeCapture();chunks=[];
    },
    get active(){return !cancelled;},
  };
}
