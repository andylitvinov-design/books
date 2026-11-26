import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {initialCoachMicActivity,stepCoachMicActivity,classifyClientReactionText,coachReactionIntent,chooseCoachReaction,coachReactionCanStart,COACH_REACTION_PROFILES,coachExplicitFarewell} from '../lib/coaching/coach-reaction-director.mjs'
import {createReactionPlayback} from '../lib/coaching/coach-reaction-playback.mjs'
import {REACTION_V4_ANCHORS,REACTION_V4_BLOCKS,REACTION_V4_ROOT,REACTION_V5_ALL_BLOCKS,reactionCameraGroup,MAX_COACH_REACTION_FRAMES,coachReactionDurationAllowed,reactionV4File,reactionV4Poster,releasedReactionMedia,COACH_PRESENTATION_LOOPS,isCoachPresentationContext,releasedCoachPresentationLoop,coachPresentationMetadataMatches,coachPresentationOpening,HARRY_PRESENTATION_OPENING} from '../lib/coaching/coach-reaction-v4-registry.mjs'
import {REACTION_V4_RELEASED} from '../lib/coaching/coach-reaction-v4-release.mjs'

test('speech activity: open microphone alone is not a client turn; hysteresis and expiry',()=>{
 let s=initialCoachMicActivity()
 s=stepCoachMicActivity(s,.20,0,'listening');assert.equal(s.active,false)
 s=stepCoachMicActivity(s,.20,130,'listening');assert.equal(s.active,true)
 s=stepCoachMicActivity(s,.10,150,'listening');assert.equal(s.active,true)
 s=stepCoachMicActivity(s,.02,200,'listening')
 s=stepCoachMicActivity(s,.02,600,'listening');assert.equal(s.active,true)
 s=stepCoachMicActivity(s,.02,660,'listening');assert.equal(s.active,false)
 s=stepCoachMicActivity(s,.20,800,'listening')
 s=stepCoachMicActivity(s,.20,940,'listening');assert.equal(s.active,true)
 assert.equal(stepCoachMicActivity(s,.2,2000,'listening').active,false)
 assert.equal(stepCoachMicActivity(s,1,950,'speaking').active,false)
})
test('visual intent follows actual speaker, not stale coach text or an open microphone',()=>{
 assert.deepEqual(coachReactionIntent({phase:'listening',coachScene:'encourage'}),{kind:'presence',speaker:'none',scene:'calm',reason:'open-mic-silence',turnKey:0})
 assert.equal(coachReactionIntent({phase:'listening',micActive:true,coachScene:'encourage'}).kind,'listening')
 assert.equal(coachReactionIntent({phase:'listening',micActive:true,clientText:'Мне интересно, почему?'}).kind,'interest')
 assert.equal(coachReactionIntent({phase:'speaking',micActive:true}).speaker,'coach')
 assert.equal(coachReactionIntent({phase:'thinking',micActive:true}).kind,'thinking')
 assert.equal(coachReactionIntent({phase:'loading'}).kind,'thinking')
 assert.equal(coachReactionIntent({phase:'speaking',paused:true}).kind,'hold')
})
test('distress and safety take precedence over positive cues in supported languages',()=>{
 for(const text of ['Мне страшно, но у меня получилось','I am afraid, but I did it','Tengo miedo, pero lo logré']){
  assert.equal(classifyClientReactionText(text),'distress')
  assert.equal(coachReactionIntent({phase:'speaking',clientText:text,coachScene:'encourage'}).kind,'empathy')
 }
 assert.equal(coachReactionIntent({phase:'speaking',stage:'safety',coachScene:'encourage'}).kind,'hold')
 assert.equal(coachReactionIntent({phase:'speaking',coachScene:'encourage',clientText:'I did it'}).kind,'encouragement')
 assert.equal(coachReactionIntent({phase:'speaking',coachScene:'encourage',clientText:'I am not happy'}).kind,'empathy')
 assert.equal(coachReactionIntent({phase:'speaking',coachScene:'encourage',clientText:'Maybe'}).kind,'speaking')
})
test('approved persona blocks only; no synthetic empathy, cross-camera, or repeated greeting',()=>{
 const ids=['HAR-01','HAR-02','HAR-03A']
 const smile=coachReactionIntent({phase:'speaking',coachScene:'encourage',clientText:'I did it',turnKey:4})
 const p=chooseCoachReaction('harry',smile,ids)
 assert.equal(p.id,'HAR-02');assert.equal(p.once,true)
 assert.equal(chooseCoachReaction('harry',smile,ids,[p.key]).id,'HAR-01')
 assert.equal(chooseCoachReaction('harry',smile,['HAR-A01','HAR-01']).id,'HAR-01')
 assert.equal(chooseCoachReaction('harry',coachReactionIntent({phase:'speaking',stage:'safety'}),ids),null)
 const welcome=chooseCoachReaction('merlin',coachReactionIntent({phase:'greeting'}),['MER-01'])
 assert.equal(welcome.id,'MER-01')
 assert.equal(chooseCoachReaction('merlin',coachReactionIntent({phase:'greeting',turnKey:9}),['MER-01'],[welcome.key]),null)
 assert.equal(chooseCoachReaction('merlin',coachReactionIntent({phase:'listening',micActive:true}),['MER-01']),null)
 assert.equal(chooseCoachReaction('caesar',smile,ids),null)
 assert.equal(chooseCoachReaction('sofia',coachReactionIntent({phase:'thinking'}),['SOF-01','SOF-02']).id,'SOF-01')
 assert.equal(chooseCoachReaction('genie',smile,['SAM-01','SAM-02','SAM-03B']).id,'SAM-03B')
 assert.equal(coachReactionCanStart({playing:true,ready:true,sameAnchor:true}),false)
 assert.equal(coachReactionCanStart({playing:true,atBoundary:true,ready:true,sameAnchor:true}),true)
 assert.equal(coachReactionCanStart({ready:true,sameAnchor:false}),false)
})
class FakeVideo{
 constructor(){this.listeners={};this.attrs={};this.videoWidth=0;this.videoHeight=0;this.readyState=0;this.duration=NaN;this.currentSrc='';this._time=0;this.ended=false;this.playCount=0;this.pauseCount=0}
 addEventListener(n,f){(this.listeners[n]??=[]).push(f)}
 removeEventListener(n,f){this.listeners[n]=(this.listeners[n]||[]).filter(x=>x!==f)}
 emit(n){for(const f of [...(this.listeners[n]||[])])f()}
 setAttribute(k,v){this.attrs[k]=v}
 getAttribute(k){return this.attrs[k]||null}
 removeAttribute(k){delete this.attrs[k]}
 load(){this.currentSrc=this.attrs.src||'';this.readyState=0;this.duration=NaN;this.videoWidth=0;this.videoHeight=0;this._time=0;this.ended=false}
 ready(w=1080,h=1890,duration=5){this.videoWidth=w;this.videoHeight=h;this.duration=duration;this.readyState=2;this.emit('loadeddata')}
 pause(){this.pauseCount++}
 play(){this.playCount++;this.ended=false;this.emit('playing');return Promise.resolve()}
 get currentTime(){return this._time}
 set currentTime(t){this._time=t;this.ended=false;this.emit('seeked')}
 end(){this._time=5;this.ended=true;this.emit('ended')}
}
function fixture(){
 const videos=[new FakeVideo(),new FakeVideo()]
 let visible=null
 const media={coach:'harry',width:1080,height:1890,anchorHash:'hash',
   blocks:['HAR-01','HAR-02','HAR-03A'].map(id=>({id,src:'/media/'+id+'.mp4',width:1080,height:1890,anchorHash:'hash',duration:5}))}
 const player=createReactionPlayback({media,videos,onVisible:(_,id)=>{visible=id}})
 return {player,videos,visible:()=>visible}
}
const listening=()=>coachReactionIntent({phase:'listening',micActive:true})
const smile=()=>coachReactionIntent({phase:'speaking',coachScene:'encourage',clientText:'I did it',turnKey:1})
test('double buffer: retain outgoing frame until current clip ends and candidate is ready',()=>{
 const {player,videos,visible}=fixture()
 player.update(listening(),true)
 assert.equal(videos[0].getAttribute('src'),'/media/HAR-01.mp4');assert.equal(visible(),null)
 videos[0].ready();assert.equal(visible(),'HAR-01')
 player.update(smile(),true);assert.equal(videos[1].getAttribute('src'),'/media/HAR-02.mp4')
 videos[0].end();assert.equal(visible(),'HAR-01')
 videos[1].ready();assert.equal(visible(),'HAR-02')
 videos[1].end();videos[0].ready();assert.equal(visible(),'HAR-01')
 player.update(smile(),true);assert.equal(player.snapshot().used.length,1)
 player.dispose();assert.ok(videos.every(v=>v.getAttribute('src')===null))
})
test('preloaded media does not cut a current action; stale request is discarded at the boundary',()=>{
 const {player,videos,visible}=fixture()
 player.update(listening(),true);videos[0].ready()
 player.update(smile(),true);videos[1].ready()
 assert.equal(visible(),'HAR-01');assert.equal(videos[1].playCount,0)
 player.update({...listening(),turnKey:2},true);videos[0].end()
 assert.equal(visible(),'HAR-01');assert.equal(videos[1].playCount,0)
 videos[1].ready();assert.equal(visible(),'HAR-01')
 player.dispose()
})
test('distress, hidden tab and invalid resolution hold the contact frame without restarting audio',()=>{
 const {player,videos,visible}=fixture()
 player.update(listening(),true);videos[0].ready()
 player.update(coachReactionIntent({phase:'listening',micActive:true,clientText:'I am afraid'}),true)
 assert.equal(visible(),'HAR-01');assert.equal(player.snapshot().active,'HAR-01')
 videos[0].end();assert.equal(visible(),null);assert.equal(player.snapshot().active,null)
 player.update(listening(),true);assert.equal(visible(),'HAR-01')
 player.update(listening(),false);assert.equal(visible(),null)
 player.dispose()
 const z=fixture();z.player.update(listening(),true);z.videos[0].ready(480,672)
 assert.equal(z.visible(),null);assert.ok(z.player.snapshot().failed.includes('HAR-01'))
 z.player.dispose()
})
test('canonical V5 registry: eighteen blocks in seven independently verified original-camera groups',()=>{
 assert.equal(Object.keys(REACTION_V4_ANCHORS).length,7)
 assert.equal(Object.keys(REACTION_V4_BLOCKS).length,18)
 for(const [id,b] of Object.entries(REACTION_V4_BLOCKS)){
  const a=REACTION_V4_ANCHORS[b.coach]
  assert.equal(b.anchorHash,a.hash);assert.equal(a.width,1080)
  assert.equal(b.sha256.length,64);assert.ok(b.size>0)
  assert.ok(reactionV4File(id).endsWith('.mp4'));assert.ok(Number.isInteger(b.frames)&&b.frames<=MAX_COACH_REACTION_FRAMES);assert.ok(coachReactionDurationAllowed(b.frames/24))
 }
 assert.equal(releasedReactionMedia('harry',[]),null)
 assert.equal(releasedReactionMedia('caesar',['caesar']),null)
 const m=releasedReactionMedia('harry',['harry'])
 assert.equal(m.blocks.length,5);assert.ok(m.blocks.every(b=>b.src.startsWith(REACTION_V4_ROOT)&&b.anchorHash===m.anchorHash))
})
test('10.20-second cap rejects archived or oversized reaction metadata before display',()=>{
 assert.equal(MAX_COACH_REACTION_FRAMES,244)
 assert.equal(coachReactionDurationAllowed(244/24),true)
 assert.equal(coachReactionDurationAllowed(245/24),false)
 assert.equal(coachReactionDurationAllowed(Infinity),false)
 assert.equal(reactionV4File('HAR-03'),null)
 assert.equal(reactionV4File('SAM-03'),null)
 const z=fixture();z.player.update(listening(),true);z.videos[0].ready(1080,1890,10.21)
 assert.equal(z.visible(),null);assert.ok(z.player.snapshot().failed.includes('HAR-01'));z.player.dispose()
 const ids=['HAR-01','HAR-02','HAR-03A','HAR-03B','HAR-03C']
 const base=coachReactionIntent({phase:'speaking',coachScene:'encourage',clientText:'I did it'})
 assert.deepEqual([0,1,2].map(turnKey=>chooseCoachReaction('harry',{...base,turnKey},ids).id),['HAR-02','HAR-03B','HAR-03C'])
 assert.deepEqual([0,1].map(turnKey=>chooseCoachReaction('genie',{...base,turnKey},['SAM-01','SAM-02','SAM-03A','SAM-03B']).id),['SAM-03B','SAM-03A'])
})
test('enabled V4 groups have all byte-verified first-party media and anchors, not provider links',()=>{
 const root=new URL('../public'+REACTION_V4_ROOT,import.meta.url)
 const verify=(name,sha,size)=>{
  const file=new URL(name,root)
  assert.ok(existsSync(file),'missing released media '+name)
  const data=readFileSync(file)
  if(size)assert.equal(data.length,size)
  assert.equal(createHash('sha256').update(data).digest('hex'),sha,name)
 }
 for(const token of REACTION_V4_RELEASED){
  const [group,coach]=token.includes(':')?token.split(':'):['primary',token]
  const selected=reactionCameraGroup(coach,group);assert.ok(selected)
  verify(reactionV4Poster(coach,group),selected.anchor.pngSha256)
  for(const [id,b] of selected.entries)verify(reactionV4File(id),b.sha256,b.size)
 }
})
test('canonical session wires both voice engines to the same local director, without changing voice ownership',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const session=read('components/my-coach-live-dialogue.jsx')
 const motion=read('components/my-coach-motion-media.jsx')
 const player=read('components/coach-reaction-director-media.jsx')
 assert.equal((session.match(/reactionActivity\.observe\(level\)/g)||[]).length,2)
 assert.ok(session.includes('reactionIntent={reactionIntent}'))
 assert.equal((session.match(/onVoiceStateChange=\{handleVoiceStateChange\}/g)||[]).length,2)
 assert.match(session,/function handleVoiceStateChange\(next\)\{[\s\S]*?setVoiceState\(next\)/)
 assert.match(session,/function handleVoiceStateChange\(next\)\{[\s\S]*?freezeActiveClock\(\)/)
 assert.ok(session.includes('turnKey:turns.filter(turn=>turn.role==='))
 assert.ok(motion.includes('releasedReactionMedia(personaId,REACTION_V4_RELEASED,REACTION_V5_CAMERA_GROUPS'))
 assert.ok(motion.includes('data-coach-reaction-mode'))
 assert.ok(player.includes('createReactionPlayback'))
 assert.ok(player.includes('muted playsInline preload="none"'))
 assert.doesNotMatch(player,/getUserMedia|fetch\(|speechSynthesis|AudioContext/)
})

test('every one of 31 active blocks has an explicit role in exactly its camera group',()=>{
 const covered=new Set()
 for(const [group,profiles] of Object.entries(COACH_REACTION_PROFILES)){
  for(const [coach,profile] of Object.entries(profiles)){
   const media=releasedReactionMedia(coach,[group+':'+coach],group)
   assert.ok(media)
   const ids=new Set(media.blocks.map(b=>b.id))
   for(const kind of ['presence','listening','speaking','greeting','farewell','thinking','interest','understanding','encouragement','closure']){
    assert.ok(Array.isArray(profile[kind]),coach+':'+kind)
    for(const id of profile[kind]){
     assert.ok(ids.has(id),group+':'+coach+':'+id)
     covered.add(id)
    }
   }
   for(const b of media.blocks)assert.ok(Object.values(profile).flat().includes(b.id),b.id)
  }
 }
 assert.equal(Object.keys(REACTION_V5_ALL_BLOCKS).length,31)
 assert.equal(covered.size,31)
 assert.equal(releasedReactionMedia('harry',['primary:harry'],'alternate'),null)
})
test('fallback depends on speech ownership; opening and farewell are explicit and one-shot',()=>{
 const ids=['HAR-01','HAR-02','HAR-03A','HAR-03B','HAR-03C']
 const intents=[coachReactionIntent({phase:'listening',micActive:true}),coachReactionIntent({phase:'speaking'}),coachReactionIntent({phase:'greeting'}),coachReactionIntent({phase:'speaking',coachText:'Спасибо за разговор. До встречи!'})]
 assert.deepEqual(intents.map(x=>x.kind),['listening','speaking','greeting','farewell'])
 assert.deepEqual(intents.map(x=>chooseCoachReaction('harry',x,ids).id),['HAR-01','HAR-01','HAR-03A','HAR-02'])
 assert.equal(coachReactionIntent({phase:'speaking',coachScene:'closure'}).kind,'closure')
 assert.equal(coachReactionIntent({phase:'speaking',closing:true}).kind,'farewell')
 for(const text of ['Goodbye.','До свидания!','Hasta luego.'])assert.ok(coachExplicitFarewell(text))
 assert.equal(coachExplicitFarewell('What does goodbye mean?'),false)
 const farewell=chooseCoachReaction('harry',intents[3],ids)
 assert.equal(chooseCoachReaction('harry',intents[3],ids,[farewell.key]),null)
})
test('short farewell remains queued after coach audio ends, but never delays audio or cuts the current take',()=>{
 const {player,videos,visible}=fixture()
 player.update({...listening(),turnKey:4},true);videos[0].ready()
 const close=coachReactionIntent({phase:'speaking',coachText:'Goodbye.',turnKey:4})
 player.update(close,true);videos[1].ready()
 assert.equal(player.snapshot().queued,'farewell')
 player.update(coachReactionIntent({phase:'idle',turnKey:4}),true)
 assert.equal(visible(),'HAR-01');assert.equal(videos[1].playCount,0)
 videos[0].end();assert.equal(visible(),'HAR-02')
 assert.equal(player.snapshot().queued,null);player.dispose()
})
test('repeated neutral blocks preload on the hidden layer, ordinary discomfort waits for the boundary',()=>{
 const {player,videos,visible}=fixture();player.update(listening(),true);videos[0].ready()
 assert.equal(videos[1].getAttribute('src'),'/media/HAR-01.mp4')
 videos[1].ready()
 assert.equal(videos[1].playCount,0)
 videos[0].end();assert.equal(videos[1].playCount,1);assert.equal(visible(),'HAR-01')
 player.update(coachReactionIntent({phase:'speaking',coachScene:'empathy'}),true)
 assert.equal(visible(),'HAR-01');videos[1].end();assert.equal(visible(),null)
 player.dispose()
})
test('hard safety hold overrides a queued celebration immediately',()=>{
 const {player,videos,visible}=fixture();player.update(listening(),true);videos[0].ready();player.update(smile(),true)
 player.update(coachReactionIntent({phase:'speaking',stage:'safety'}),true)
 assert.equal(visible(),null);assert.equal(player.snapshot().queued,null);player.dispose()
})

test('every public presentation uses one released, short, contact-sealed MP4 with matching poster',()=>{
 const coaches=['mira','alex','sofia','max','merlin','harry','genie']
 for(const group of ['primary','alternate']){
  assert.equal(Object.keys(COACH_PRESENTATION_LOOPS[group]).length,7)
  for(const coach of coaches){
   const released=[group+':'+coach]
   const m=releasedCoachPresentationLoop(coach,released,group)
   const b=REACTION_V5_ALL_BLOCKS[m.id]
   assert.equal(b.coach,coach)
   assert.equal(m.anchorHash,b.anchorHash)
   assert.equal(m.anchorHash,reactionCameraGroup(coach,group).anchor.hash)
   assert.equal(m.poster,REACTION_V4_ROOT+reactionV4Poster(coach,group))
   assert.ok(m.src.startsWith(REACTION_V4_ROOT)&&m.src.endsWith('.mp4'))
   assert.ok(coachReactionDurationAllowed(m.duration))
   assert.ok(coachPresentationMetadataMatches(m,{videoWidth:m.width,videoHeight:m.height,duration:m.duration+.001}))
   assert.equal(coachPresentationMetadataMatches(m,{videoWidth:480,videoHeight:672,duration:m.duration}),false)
   assert.equal(coachPresentationMetadataMatches(m,{videoWidth:m.width,videoHeight:m.height,duration:10.21}),false)
   assert.equal(releasedCoachPresentationLoop(coach,[],group),null)
  }
 }
 assert.equal(releasedCoachPresentationLoop('merlin',['primary:merlin']).id,'MER-01')
 assert.equal(releasedCoachPresentationLoop('caesar',['primary:caesar']),null)
 assert.equal(releasedCoachPresentationLoop('merlin',['alternate:merlin'],'primary'),null)
})
test('presentation contexts use a stable source independent of greeting audio and fail closed',()=>{
 assert.ok(isCoachPresentationContext('greeting'))
 assert.ok(isCoachPresentationContext('hero'))
 assert.ok(isCoachPresentationContext('avatar',true))
 assert.equal(isCoachPresentationContext('avatar'),false)
 assert.equal(isCoachPresentationContext('card'),false)
 assert.equal(isCoachPresentationContext('session',true),false)
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
 const motion=read('components/my-coach-motion-media.jsx')
 const gate=read('components/my-coach-greeting-gate.jsx')
 const catalog=read('components/my-coach-catalog.jsx')
 assert.ok(gate.includes('phase="greeting" context="greeting"'))
 assert.ok(catalog.includes('phase="greeting" context="hero"'))
 assert.ok(catalog.includes('phase="greeting" context="avatar" presentationLoop'))
 assert.ok(motion.includes('const src=presentationActive?(activePresentation?.src||null):legacySrc'))
 assert.ok(motion.includes('[presentationActive,personaId]'))
 assert.ok(motion.includes('data-coach-presentation-video src={src} poster={poster} muted loop={!openingActive} playsInline autoPlay={shouldPlay}'))
 assert.ok(motion.includes('presentationActive?((shouldPlay||keepHarryVideo)&&<video'))
 assert.ok(motion.includes('onLoadedMetadata={event=>validatePresentation(event.currentTarget)}'))
 assert.ok(motion.includes('!presentationActive&&!released&&!protectedHold'))
 assert.ok(motion.includes('activePresentation?.poster||framePoster'))
 assert.ok(motion.includes('},[shouldPlay,src])'))
})

test('shared personality empathy veto prevents cheerful reaction to explicit shame, anger, exhaustion or mixed progress',()=>{
 for(const text of ["I feel ashamed.","I am furious.","I feel drained.","Мне стыдно.","Я злюсь.","Я выжат.","Me da vergüenza.","Estoy enojado.","Me siento agotado.","I did it, but I feel ashamed.","Я справился, но мне стыдно.","Lo logré, pero estoy enojado."]){
  assert.equal(classifyClientReactionText(text),'distress',text)
  const intent=coachReactionIntent({phase:'speaking',coachScene:'encourage',clientText:text})
  assert.equal(intent.kind,'empathy',text)
  assert.equal(chooseCoachReaction('harry',intent,['HAR-02','HAR-01']),null)
 }
 for(const text of ["If I did it?","Maybe I did it.","She said I did it.","I never said I did it.","Я думал, что у меня получилось.","Может быть, я справился.","Она сказала: «Я справилась».","Quizá lo logré.","Si yo lo logré.","Dijo que lo logré."])assert.notEqual(classifyClientReactionText(text),'progress',text)
 for(const text of ["I did it","Я справился","Lo logré","У меня получилось","I made it"])assert.equal(classifyClientReactionText(text),'progress',text)
})


test('Harry plays only the exact original greeting once then the calm primary loop',()=>{
 const loop=releasedCoachPresentationLoop('harry',['primary:harry'])
 assert.equal(loop.id,'HAR-01')
 const opening=coachPresentationOpening('harry',loop)
 assert.equal(opening,HARRY_PRESENTATION_OPENING)
 assert.match(opening.src,/harry-greeting-real-v2\.mp4$/)
 assert.ok(coachPresentationMetadataMatches(opening,{videoWidth:768,videoHeight:1344,duration:124/24}))
 assert.equal(coachPresentationOpening('harry',null),null)
 assert.equal(coachPresentationOpening('harry',releasedCoachPresentationLoop('harry',['alternate:harry'],'alternate')),null)
 assert.equal(coachPresentationOpening('mira',loop),null)
 const source=readFileSync(new URL('../components/my-coach-motion-media.jsx',import.meta.url),'utf8')
 assert.ok(source.includes('openingActive?opening:presentation'))
 assert.ok(source.includes('onEnded={finishPresentationOpening}'))
 assert.ok(source.includes('loop={!openingActive}'))
 assert.ok(source.includes('keepHarryVideo'))
 assert.ok(source.includes('[personaId,presentationActive]'))
})
