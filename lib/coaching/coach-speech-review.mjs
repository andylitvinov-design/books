// Opt-in, bounded, review-only audio. No second mic and no persistent audio.
const RATE=32000,MAX=RATE*12,PRE=9600,TAIL=RATE*1.2
export function createSpeechReviewBuffer(){
  let pre=[],preBytes=0,parts=[],size=0,tail=0,started=false,invalid=false,lastVoice=0
  const reset=()=>{pre=[];preBytes=0;parts=[];size=0;tail=0;started=false;invalid=false;lastVoice=0}
  return {
    clear:reset,
    invalidate(){reset();invalid=true},
    append(pcm,voiced,now=Date.now()){
      if(!(pcm instanceof Uint8Array)||!pcm.length||pcm.length%2||pcm.length>16000)return
      if(invalid)return
      if(!started&&!voiced){
        pre.push(pcm.slice());preBytes+=pcm.length
        while(preBytes>PRE&&pre.length)preBytes-=pre.shift().length
        return
      }
      if(!started){parts=pre;size=preBytes;pre=[];preBytes=0;started=true}
      if(voiced){if(lastVoice&&now-lastVoice>1600){reset();invalid=true;return}lastVoice=now}
      if(voiced&&tail>=TAIL){invalid=true;parts=[];size=0;return}
      if(!voiced&&tail>=TAIL)return
      if(size+pcm.length>MAX){invalid=true;parts=[];size=0;return}
      parts.push(pcm.slice());size+=pcm.length;tail=voiced?0:tail+pcm.length
    },
    take(now=Date.now()){
      const result=started&&!invalid&&size>=3200&&now-lastVoice<=2500?parts:null
      reset()
      return result
    }
  }
}
export function speechReviewWav(parts){
  const bytes=parts.reduce((n,p)=>n+p.length,0)
  if(bytes<3200||bytes>MAX||bytes%2)throw Error('SPEECH_REVIEW_AUDIO_INVALID')
  const result=new Uint8Array(44+bytes),v=new DataView(result.buffer)
  const tag=(o,s)=>{for(let i=0;i<s.length;i++)result[o+i]=s.charCodeAt(i)}
  tag(0,'RIFF');v.setUint32(4,36+bytes,true);tag(8,'WAVE');tag(12,'fmt ')
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true)
  v.setUint32(24,16000,true);v.setUint32(28,RATE,true);v.setUint16(32,2,true);v.setUint16(34,16,true)
  tag(36,'data');v.setUint32(40,bytes,true)
  let o=44;for(const p of parts){result.set(p,o);o+=p.length}
  return result
}
export function createSpeechReviewQueue({request,onResult}){
  let current=null,closed=false
  return {
    cancel(){closed=true;current?.controller.abort();if(current)onResult(current.id,'');current=null},
    offer(job){
      if(closed||current||!job?.parts?.length)return false
      const controller=new AbortController();current={controller,id:job.id}
      // Defer WAV encoding and network work until after the voice callback.
      setTimeout(async()=>{
        if(controller.signal.aborted)return
        let text=null
        const timeout=setTimeout(()=>controller.abort(),12000)
        try{text=await request(job,controller.signal)}catch{}
        finally{
          clearTimeout(timeout)
          if(current?.controller===controller)current=null
          if(!closed&&!controller.signal.aborted)onResult(job.id,typeof text==='string'?text.trim().slice(0,1200):'')
          else if(!closed)onResult(job.id,'')
        }
      },0)
      return true
    }
  }
}
export async function requestSpeechReview(job,signal){
  if(!['ru','en','es'].includes(job.locale))return ''
  const form=new FormData()
  form.set('file',new Blob([speechReviewWav(job.parts)],{type:'audio/wav'}),'coach-review.wav')
  form.set('locale',job.locale);form.set('output','text');form.set('purpose','my_coach');form.set('consent','yes')
  const response=await fetch('/api/holistic-support/audio-storyboard',{method:'POST',credentials:'same-origin',cache:'no-store',signal,body:form})
  if(!response.ok)return ''
  const body=await response.json()
  return body?.provider==='groq_free_confirmed'&&body.charged===false&&typeof body.text==='string'?body.text:''
}
