// Double-buffered first-party V4 reaction playback, independent from dialogue/audio.
import {chooseCoachReaction,coachReactionCanStart} from './coach-reaction-director.mjs'
import {coachReactionDurationAllowed} from './coach-reaction-v4-registry.mjs'

export function createReactionPlayback({media,videos,onVisible=()=>{},onReady=()=>{}}){
  // Exactly two visual layers. This controller never obtains or mutates audio,
  // microphone state, transport, session timer, conversation text or model state.
  if(!media||!Array.isArray(videos)||videos.length!==2)throw new Error('Invalid reaction media')
  const blocks=new Map(media.blocks.filter(b=>b.anchorHash===media.anchorHash&&b.width===media.width&&b.height===media.height&&coachReactionDurationAllowed(b.duration)).map(b=>[b.id,b]))
  const slots=videos.map(()=>({id:null,ready:false}))
  const failed=new Set(),used=new Set(),listeners=[]
  let enabled=false,intent=null,latestIntent=null,queuedMoment=null,active=null,pending=null,boundary=true,disposed=false,serial=0,lastPlayed=null
  const safePause=v=>{try{v.pause()}catch{}}
  function pick(){return chooseCoachReaction(media.coach,intent,[...blocks.keys()].filter(id=>!failed.has(id)),[...used],{group:media.group||'primary',previousId:lastPlayed})}
  function allowed(){return !disposed&&enabled&&intent&&intent.kind!=='hold'}
  const momentKinds=new Set(['greeting','farewell','encouragement','understanding','closure'])
  function chooseFor(next){
    return chooseCoachReaction(media.coach,next,[...blocks.keys()].filter(id=>!failed.has(id)),[...used],{group:media.group||'primary',previousId:lastPlayed})
  }
  function updateIntent(next,playAllowed){
    latestIntent=next
    enabled=Boolean(playAllowed)
    if(!enabled||!next||['hold','empathy'].includes(next.kind)){
      queuedMoment=null;intent=next;return
    }
    // A meaningful short utterance can end before the active video does.
    // Retain at most one relevant one-shot event, not a backlog of old emotions.
    if(queuedMoment&&(queuedMoment.turnKey!==next.turnKey||
       (next.speaker==='client'&&queuedMoment.speaker!=='client')||
       !chooseFor(queuedMoment)?.once))queuedMoment=null
    if(momentKinds.has(next.kind)&&chooseFor(next)?.once){
      if(!queuedMoment||queuedMoment.kind!=='farewell'||next.kind==='farewell')queuedMoment=next
    }
    intent=queuedMoment||latestIntent
  }
  function clearPending(){
    if(!pending)return
    const i=pending.slot;pending=null;serial++
    if(i!==active||boundary)safePause(videos[i])
  }
  function showAnchor(){
    clearPending();for(const video of videos)safePause(video)
    active=null;boundary=true;onVisible(null,null);onReady(false)
  }
  function matches(i){
    const slot=slots[i],b=blocks.get(slot.id),v=videos[i]
    return Boolean(b&&v.getAttribute('src')===b.src&&v.currentSrc&&new URL(v.currentSrc,'https://reaction.invalid').pathname===b.src&&v.videoWidth===b.width&&v.videoHeight===b.height&&v.readyState>=2&&coachReactionDurationAllowed(v.duration))
  }
  function prepare(i,id){
    const b=blocks.get(id);if(!b)return
    if(slots[i].id===id)return
    if(i===active&&!boundary)return
    if(pending?.slot===i)clearPending()
    const v=videos[i];safePause(v)
    slots[i]={id,ready:false}
    v.muted=true;v.playsInline=true;v.loop=false;v.preload='auto'
    v.setAttribute('src',b.src)
    try{v.load()}catch{fail(i,id)}
  }
  function fail(i,id){
    if(disposed||!id||slots[i].id!==id)return
    failed.add(id);slots[i].ready=false
    if(pending?.slot===i)clearPending()
    if(active===i){active=null;boundary=true;onVisible(null,null);onReady(false)}
    safePause(videos[i])
    reconcile()
  }
  function present(i,token){
    if(disposed||!pending||pending.slot!==i||pending.token!==token)return
    const p=pending,v=videos[i],choice=pick()
    if(!allowed()||choice?.id!==p.choice.id||!matches(i)){
      clearPending();reconcile();return
    }
    const old=active;active=i;boundary=false;pending=null;lastPlayed=p.choice.id
    if(p.choice.once&&p.choice.key){used.add(p.choice.key);if(used.size>200)used.delete(used.values().next().value);queuedMoment=null;intent=latestIntent}
    onVisible(i,p.choice.id);onReady(true)
    if(old!==null&&old!==i)safePause(videos[old])
    reconcile() // preload the latest permitted next take, never cut the active one
  }
  function playPrepared(i,token){
    if(disposed||!pending||pending.slot!==i||pending.token!==token)return
    const v=videos[i],p=pending
    if(!allowed()||pick()?.id!==p.choice.id){clearPending();reconcile();return}
    if(!matches(i))return
    if(p.started)return
    if(v.currentTime>0.025||v.ended){
      if(!p.seeking){
        p.seeking=true
        try{v.currentTime=0}catch{fail(i,p.choice.id)}
      }
      return
    }
    p.started=true
    try{
      const attempt=v.play()
      if(attempt?.catch)void attempt.catch(()=>{
        if(pending?.token===token)fail(i,p.choice.id)
      })
    }catch{fail(i,p.choice.id)}
  }
  function reconcile(){
    if(disposed)return
    if(!allowed()){showAnchor();return}
    const choice=pick()
    if(!choice){
      if(active!==null&&!boundary)return // finish the current action before a normal anchor hold
      showAnchor();return
    }
    if(pending){
      if(pending.choice.id===choice.id)return
      clearPending()
    }
    if(active!==null&&!boundary){
      prepare(1-active,choice.id) // also preload repeats; retain outgoing last frame
      return
    }
    let i=active===null?(slots.findIndex(s=>s.id===choice.id)>=0?slots.findIndex(s=>s.id===choice.id):0):
      1-active
    if(slots[i].id!==choice.id){prepare(i,choice.id);return}
    if(!slots[i].ready||!matches(i))return // outgoing last frame remains visible until ready
    if(!coachReactionCanStart({enabled:allowed(),playing:active!==null&&!boundary,atBoundary:boundary,ready:true,sameAnchor:true}))return
    const token=++serial
    pending={slot:i,choice,token,seeking:false,started:false}
    playPrepared(i,token)
  }
  function listen(i,name,fn){const v=videos[i];v.addEventListener(name,fn);listeners.push(()=>v.removeEventListener(name,fn))}
  videos.forEach((v,i)=>{
    v.muted=true;v.playsInline=true;v.loop=false;v.preload='none'
    const ready=()=>{
      if(disposed||!slots[i].id)return
      if(!matches(i)){
        // loadedmetadata/loadeddata may precede a usable frame. Wrong actual dimensions are fatal.
        const b=blocks.get(slots[i].id)
        if(b&&v.videoWidth>0&&v.videoHeight>0&&(v.videoWidth!==b.width||v.videoHeight!==b.height||(v.readyState>=1&&!coachReactionDurationAllowed(v.duration))))fail(i,slots[i].id)
        return
      }
      slots[i].ready=true
      if(pending?.slot===i&&!pending.seeking)playPrepared(i,pending.token)
      else reconcile()
    }
    listen(i,'loadedmetadata',ready);listen(i,'loadeddata',ready);listen(i,'canplay',ready)
    listen(i,'seeked',()=>{if(pending?.slot===i){pending.seeking=false;playPrepared(i,pending.token)}})
    listen(i,'playing',()=>{if(pending?.slot===i&&pending.started)present(i,pending.token)})
    listen(i,'ended',()=>{if(active!==i||disposed)return;boundary=true;reconcile()})
    listen(i,'error',()=>{if(slots[i].id)fail(i,slots[i].id)})
  })
  return {
    update(next,playAllowed){if(disposed)return;updateIntent(next,playAllowed);reconcile()},
    snapshot(){return {active:active===null?null:slots[active].id,pending:pending?.choice.id??null,boundary,wanted:pick()?.id??null,queued:queuedMoment?.kind??null,lastPlayed,failed:[...failed],used:[...used]}},
    dispose(){if(disposed)return;disposed=true;clearPending();for(const remove of listeners)remove();for(const v of videos){safePause(v);v.removeAttribute('src');try{v.load()}catch{}}}
  }
}
