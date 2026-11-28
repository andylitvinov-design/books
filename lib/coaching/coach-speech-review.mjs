// Opt-in secondary STT. Bounded RAM only. No audio path dependency.
const RATE=16000, BYTES=RATE*2, MAX=BYTES*12, PRE=BYTES*.3, GAP=BYTES*1.15;
export function createSpeechReviewBuffer(){
  let frames=[],size=0,voiced=0,silence=0,invalid=false;
  const reset=()=>{frames=[];size=voiced=silence=0;invalid=false};
  return {reset,append(pcm,active,blocked=false){
    if(blocked){if(voiced)invalid=true;else reset();return}
    if(invalid||!(pcm instanceof Uint8Array)||!pcm.length||pcm.length%2||pcm.length>16000)return;
    if(!active&&!voiced){
      frames.push(pcm.slice());size+=pcm.length;
      while(size>PRE&&frames.length>1)size-=frames.shift().length;
      return;
    }
    if(active&&voiced&&silence>GAP){invalid=true;return}
    if(!active&&silence>GAP)return;
    if(size+pcm.length>MAX){invalid=true;return}
    frames.push(pcm.slice());size+=pcm.length;
    if(active){voiced+=pcm.length;silence=0}else silence+=pcm.length;
  },take(){
    const valid=!invalid&&voiced>=BYTES*.12&&size<=MAX;
    const out=valid?frames:null;reset();return out;
  }};
}
export function encodeSpeechReviewWav(frames){
  const count=frames.reduce((n,f)=>n+f.length,0);
  if(!count||count>MAX)throw Error('review_audio_bounds');
  if(count%2||frames.some(f=>!(f instanceof Uint8Array)||f.length%2))throw Error('review_pcm_format');
  const buffer=new ArrayBuffer(44+count),v=new DataView(buffer);
  const ascii=(offset,s)=>{for(let i=0;i<s.length;i++)v.setUint8(offset+i,s.charCodeAt(i))};
  ascii(0,'RIFF');v.setUint32(4,36+count,true);ascii(8,'WAVE');ascii(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,RATE,true);v.setUint32(28,RATE*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
  ascii(36,'data');v.setUint32(40,count,true);
  let offset=44;const bytes=new Uint8Array(buffer);for(const frame of frames){bytes.set(frame,offset);offset+=frame.length}
  return buffer;
}
export function createSpeechReviewRequest({fetcher=fetch,delay=setTimeout,cancelDelay=clearTimeout}={}){
  let pending=null,epoch=0,closed=false;
  return {cancel(){epoch++;if(pending){pending.controller.abort();cancelDelay(pending.timer);cancelDelay(pending.start);pending=null}},
    close(){closed=true;this.cancel()},
    submit(frames,locale,onResult){
      if(closed||pending||!frames||!['ru','en','es'].includes(locale))return false;
      const ticket=++epoch,controller=new AbortController(),job={controller,timer:null,start:null};pending=job;
      job.start=delay(async()=>{
        try{
          if(controller.signal.aborted)return;
          job.timer=delay(()=>controller.abort(),12000);
          const data=new FormData();
          data.set('file',new Blob([encodeSpeechReviewWav(frames)],{type:'audio/wav'}),'speech.wav');
          data.set('locale',locale);data.set('purpose','my_coach');data.set('output','text');data.set('consent','yes');data.set('speech_review','yes');
          const response=await fetcher('/api/holistic-support/audio-storyboard',{method:'POST',body:data,signal:controller.signal,credentials:'same-origin',cache:'no-store'});
          const result=response.ok?await response.json():null;
          const value=typeof result?.text==='string'?result.text.trim().slice(0,1200):'';
          if(!closed&&ticket===epoch&&!controller.signal.aborted)onResult(value);
        }catch{if(!closed&&ticket===epoch&&!controller.signal.aborted)onResult('')}
        finally{cancelDelay(job.timer);if(pending===job)pending=null}
      },0);
      return true;
    }};
}
