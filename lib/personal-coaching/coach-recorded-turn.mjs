/*
 * An iPhone fallback for WebKit's silent SpeechRecognition sessions.
 * A single initial Play is the consented activation. Capture is ephemeral:
 * MediaRecorder fragments and the microphone stream are destroyed after each
 * utterance or End; raw audio is never put in browser storage or the Cabinet.
 * Server receives exactly one voiced phrase at a time, through the existing
 * free-quota-only, same-origin Groq Whisper STT bridge.
 */
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
export function createCoachVoiceGate({silenceMs=1900,maxSpeechMs=45000,resetAfterMs=16000,
  minRms=0.016,noiseRatio=2.8,minTicks=2,warmupMs=0}={}){
  let start=null,heardAt=null,lastVoice=0,highTicks=0;
  let noiseFloor=0.003;
  return {
    update(now,rms){
      if(start===null)start=now;
      const energy=Number.isFinite(rms)?Math.max(0,rms):0;
      // An output-playing monitor must learn room/echo energy before deciding
      // that a real client has started speaking. Never assume one loud spike is speech.
      if(now-start<warmupMs){noiseFloor=noiseFloor*0.8+energy*0.2;return 'silence';}
      const threshold=Math.max(minRms,noiseFloor*noiseRatio);
      const sound=energy>threshold;
      if(!heardAt){
        if(sound)highTicks+=1;
        else{highTicks=0;noiseFloor=noiseFloor*0.95+energy*0.05;}
        if(highTicks>=minTicks){heardAt=now;lastVoice=now;return 'speech';}
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
function errorCode(error){
  const code=String(error?.name||error?.message||error||'');
  return /NotAllowed|Permission|SecurityError/i.test(code)?'MIC_PERMISSION':
    /NotFound|DevicesNotFound/i.test(code)?'MIC_MISSING':
    /AUDIO_STT_|429|503|CLOUD_STT_/i.test(code)?'STT_UNAVAILABLE':'MIC_CAPTURE';
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
  onResult=()=>{},onFailure=()=>{},onLevel=()=>{},onSpeech=()=>{},
  silenceMs=1900,monitorDuringPlayback=false,
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
  let chunks=[],preSpeechChunk=null,mime='',extension=media.extension,recorderMode='none',started=0;
  let gate=createCoachVoiceGate(),buffer=null,analyser=null,seenSpeech=false,quietNotified=false;
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
    source=null;
    if(stream){try{for(const track of stream.getTracks())track.stop();}catch{} stream=null;}
    if(context){if(!borrowedContext)try{void context.close?.().catch?.(()=>{});}catch{}context=null;}
  }
  function fail(error){
    if(cancelled)return;
    cancelled=true;
    controller.abort();
    closeCapture();
    chunks=[];
    onFailure(errorCode(error));
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
    chunks=[];preSpeechChunk=null;
    // Barge-in must be highly conservative against echo; ordinary client turns
    // retain normal sensitivity. Neither path uses a second recognition vendor.
    gate=createCoachVoiceGate(monitorDuringPlayback
      ?{silenceMs,minRms:0.052,noiseRatio:3.8,minTicks:4,warmupMs:450}
      :{silenceMs});
    seenSpeech=false;quietNotified=false;started=now();
    recorderMode='none';
    try{
      recorder=media.mime?new Recorder(stream,{mimeType:media.mime}):new Recorder(stream);
      mime=recorder.mimeType||media.mime||'audio/mp4';
      extension=mime.startsWith('audio/webm')?'webm':'m4a';
      const thisRecorder=recorder;
      recorder.ondataavailable=e=>{
        if(cancelled||!e.data?.size)return;
        if(!monitorDuringPlayback){chunks.push(e.data);return;}
        // Do not upload the coach's preceding playback. Preserve at most one
        // half-second local pre-roll fragment to avoid clipping the user's word.
        if(!seenSpeech){preSpeechChunk=e.data;return;}
        if(preSpeechChunk){chunks.push(preSpeechChunk);preSpeechChunk=null;}
        chunks.push(e.data);
      };
      recorder.onerror=e=>fail(e.error||Error('MIC_RECORDER_ERROR'));
      recorder.onstop=()=>{
        if(cancelled||thisRecorder!==recorder)return;
        const mode=recorderMode,parts=chunks,format=mime,ext=extension;
        if(mode==='rotate'){recorder=null;chunks=[];record();return;}
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
      context=audioContext&&audioContext.state!=='closed'?audioContext:new Context();
      borrowedContext=context===audioContext;
      source=context.createMediaStreamSource(stream);
      analyser=context.createAnalyser();
      analyser.fftSize=1024;
      source.connect(analyser);
      buffer=new Uint8Array(analyser.fftSize);
      try{await context.resume?.();}catch{throw Error('MIC_CONTEXT_BLOCKED');}
      if(cancelled)return;
      record();
      if(cancelled)return;
      if(!monitorDuringPlayback)onState('listening');
      clockTimer=interval(()=>{
        if(cancelled||turnDone||!recorder||recorder.state!=='recording')return;
        analyser.getByteTimeDomainData(buffer);
        let sum=0;
        for(let i=0;i<buffer.length;i++){
          const x=(buffer[i]-128)/128;sum+=x*x;
        }
        const rms=Math.sqrt(sum/buffer.length);
        // Sample the existing ephemeral mic analyser. No extra capture or upload.
        onLevel(Math.min(1,Math.max(0,(rms-0.012)*7)));
        const event=gate.update(now(),rms);
        if(event==='speech'&&!seenSpeech){
          seenSpeech=true;
          try{onSpeech();}catch{/* A UI interruption must not lose the recorded turn. */}
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
    cancel(){
      if(cancelled)return;
      cancelled=true;controller.abort();closeCapture();chunks=[];
    },
    get active(){return !cancelled;},
  };
}
