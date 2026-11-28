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
// One request, at most three waiting clips, expiry independent of provider.
export function createSpeechReviewQueue({request,onResult,now=Date.now,schedule=setTimeout,unschedule=clearTimeout}){
  const WAIT_MS=8000,REQUEST_MS=12000,MAX_WAITING=3
  let current=null,closed=false,waiting=[]
  const notify=(item,text='')=>{
    if(item.notified)return
    item.notified=true
    try{onResult(item.job.id,text)}catch{/* Never interrupt the voice path. */}
  }
  function release(item){
    if(item.timer!==null)unschedule(item.timer)
    item.timer=null;item.job.parts=null
  }
  function finish(item,text=''){
    if(current!==item)return
    current=null;release(item)
    if(!closed){notify(item,text);pump()}
  }
  function pump(){
    if(closed||current)return
    while(waiting.length){
      const item=waiting.shift()
      if(now()>=item.expires){release(item);notify(item);continue}
      unschedule(item.timer);item.timer=null
      current=item;item.controller=new AbortController()
      item.timer=schedule(async()=>{
        if(closed||current!==item)return
        item.timer=schedule(()=>{
          if(current!==item)return
          item.controller.abort();release(item);notify(item)
          // Do not open another request until the original one settles.
        },REQUEST_MS)
        let text=''
        try{
          const result=await request(item.job,item.controller.signal)
          if(typeof result==='string'&&!item.controller.signal.aborted)text=result.trim().slice(0,1200)
        }catch{}
        finally{finish(item,text)}
      },0)
      return
    }
  }
  return {
    cancel(){
      if(closed)return
      closed=true
      const active=current;current=null
      if(active){active.controller?.abort();release(active);notify(active)}
      const queued=waiting;waiting=[]
      for(const item of queued){release(item);notify(item)}
    },
    offer(job){
      if(closed||!job?.parts?.length||job.parts.some(p=>!(p instanceof Uint8Array)))return false
      if(current?.job.id===job.id||waiting.some(x=>x.job.id===job.id))return false
      const priority=job.priority===true?1:0
      if(waiting.length>=MAX_WAITING){
        const index=waiting.findLastIndex(x=>x.priority<priority)
        if(index<0)return false
        const [evicted]=waiting.splice(index,1)
        release(evicted);notify(evicted)
      }
      const item={job:{...job},priority,expires:now()+WAIT_MS,timer:null,controller:null,notified:false}
      item.timer=schedule(()=>{
        const index=waiting.indexOf(item)
        if(index<0)return
        waiting.splice(index,1);release(item);notify(item)
      },WAIT_MS)
      const index=waiting.findIndex(x=>x.priority<priority)
      if(index<0)waiting.push(item);else waiting.splice(index,0,item)
      pump()
      return true
    }
  }
}
export async function requestSpeechReview(job,signal){
  if(!['ru','en','es'].includes(job.locale))return ''
  const form=new FormData()
  form.set('file',new Blob([speechReviewWav(job.parts)],{type:'audio/wav'}),'coach-review.wav')
  form.set('locale',job.locale);form.set('output','text');form.set('purpose','my_coach');form.set('consent','yes');form.set('review','yes')
  const gemini=job.provider==='gemini'
  if(gemini)form.set('geminiConsent','yes')
  const response=await fetch(gemini?'/api/coaching/speech-review-gemini':'/api/holistic-support/audio-storyboard',{method:'POST',credentials:'same-origin',cache:'no-store',signal,body:form})
  if(!response.ok)return ''
  const body=await response.json()
  return body?.provider===(gemini?'gemini_transcribe_free_confirmed':'groq_free_confirmed')&&body.charged===false&&typeof body.text==='string'?body.text:''
}
