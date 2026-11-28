// Opt-in, bounded, review-only audio. No second mic and no persistent audio.
const RATE=32000,PRE=9600,TAIL=RATE*1.2,MAX_AUDIO_AGE_MS=60000
// The optional longer clip stays below the 60s capture + queue + request lifetime.
export const speechReviewMaxBytes=(long=false)=>RATE*(long===true?35:12)
export function createSpeechReviewBuffer({long=false}={}){
  const MAX=speechReviewMaxBytes(long)
  let pre=[],preBytes=0,parts=[],size=0,tail=0,started=false,invalid=false,lastVoice=null,lastFrameAt=null,firstAt=null
  const reset=()=>{pre=[];preBytes=0;parts=[];size=0;tail=0;started=false;invalid=false;lastVoice=null;lastFrameAt=null;firstAt=null}
  const takeClip=(now=Date.now())=>{
    const result=started&&!invalid&&size>=3200&&Number.isFinite(now)&&now>=lastVoice&&now-lastVoice<=2500&&firstAt!==null&&now-firstAt<=MAX/RATE*1000+2500?{parts,capturedAt:firstAt}:null
    reset()
    return result
  }
  return {
    clear:reset,
    invalidate(){reset();invalid=true},
    append(pcm,voiced,now=Date.now()){
      if(!(pcm instanceof Uint8Array)||!pcm.length||pcm.length%2||pcm.length>16000)return
      if(invalid||!Number.isFinite(now))return
      if(lastFrameAt!==null&&(now<lastFrameAt||now-lastFrameAt>1600)){
        if(started){reset();invalid=true;return}
        pre=[];preBytes=0
      }
      lastFrameAt=now
      // A suspended tab cannot reuse stale pre-roll as the start of a new utterance.
      while(pre.length&&now-pre[0].at>500)preBytes-=pre.shift().pcm.length
      if(!started&&!voiced){
        pre.push({pcm:pcm.slice(),at:now});preBytes+=pcm.length
        while(preBytes>PRE&&pre.length)preBytes-=pre.shift().pcm.length
        return
      }
      if(!started){
        firstAt=Math.min(now-pcm.length/RATE*1000,pre.length?pre[0].at-pre[0].pcm.length/RATE*1000:now)
        parts=pre.map(item=>item.pcm);size=preBytes;pre=[];preBytes=0;started=true
      }
      if(now-firstAt>MAX/RATE*1000+2500){reset();invalid=true;return}
      if(voiced){if(lastVoice!==null&&now-lastVoice>1600){reset();invalid=true;return}lastVoice=now}
      if(voiced&&tail>=TAIL){invalid=true;parts=[];size=0;return}
      if(!voiced&&tail>=TAIL)return
      if(size+pcm.length>MAX){invalid=true;parts=[];size=0;return}
      parts.push(pcm.slice());size+=pcm.length;tail=voiced?0:tail+pcm.length
    },
    takeClip,
    take(now=Date.now()){return takeClip(now)?.parts??null}
  }
}
export function speechReviewWav(parts,{long=false}={}){
  const MAX=speechReviewMaxBytes(long)
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
  const validClock=(item,t)=>Number.isFinite(t)&&t>=item.offeredAt&&t>=item.job.capturedAt
  function pump(){
    if(closed||current)return
    while(waiting.length){
      const item=waiting.shift()
      const t=now()
      if(!validClock(item,t)||t>=item.expires){release(item);notify(item);continue}
      unschedule(item.timer);item.timer=null
      current=item;item.controller=new AbortController()
      item.timer=schedule(async()=>{
        if(closed||current!==item)return
        const requestAt=now()
        if(!validClock(item,requestAt)||requestAt>=item.expires){finish(item);return}
        const responseDeadline=Math.min(requestAt+REQUEST_MS,item.deadline)
        item.timer=schedule(()=>{
          if(current!==item)return
          item.controller.abort();release(item);notify(item)
          // Do not open another request until the original one settles.
        },responseDeadline-requestAt)
        let text=''
        try{
          const result=await request(item.job,item.controller.signal)
          const receivedAt=now()
          if(typeof result==='string'&&!item.controller.signal.aborted&&validClock(item,receivedAt)&&receivedAt>=requestAt&&receivedAt<responseDeadline&&result.trim().length<=1200)text=result.trim()
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
      const offeredAt=now(),capturedAt=job.capturedAt??offeredAt
      if(!Number.isFinite(offeredAt)||!Number.isFinite(capturedAt)||capturedAt>offeredAt)return false
      const deadline=capturedAt+MAX_AUDIO_AGE_MS,expires=Math.min(offeredAt+WAIT_MS,deadline-REQUEST_MS)
      if(expires<=offeredAt)return false
      const priority=job.priority===true?1:0
      if(waiting.length>=MAX_WAITING){
        const index=waiting.findLastIndex(x=>x.priority<priority)
        if(index<0)return false
        const [evicted]=waiting.splice(index,1)
        release(evicted);notify(evicted)
      }
      const item={job:{...job,capturedAt},priority,offeredAt,deadline,expires,timer:null,controller:null,notified:false}
      item.timer=schedule(()=>{
        const index=waiting.indexOf(item)
        if(index<0)return
        waiting.splice(index,1);release(item);notify(item)
      },expires-offeredAt)
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
  form.set('file',new Blob([speechReviewWav(job.parts,{long:job.provider!=='gemini'&&job.long===true})],{type:'audio/wav'}),'coach-review.wav')
  form.set('locale',job.locale);form.set('output','text');form.set('purpose','my_coach');form.set('consent','yes');form.set('review','yes')
  const gemini=job.provider==='gemini'
  if(gemini)form.set('geminiConsent','yes')
  const response=await fetch(gemini?'/api/coaching/speech-review-gemini':'/api/holistic-support/audio-storyboard',{method:'POST',credentials:'same-origin',cache:'no-store',signal,body:form})
  if(!response.ok)return ''
  const body=await response.json()
  return body?.provider===(gemini?'gemini_transcribe_free_confirmed':'groq_free_confirmed')&&body.charged===false&&typeof body.text==='string'?body.text:''
}
