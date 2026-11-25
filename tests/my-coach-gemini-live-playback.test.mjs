import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GeminiLivePcmPlayer,bytesToBase64,GEMINI_LIVE_OUTPUT_RATE,
} from '../lib/coaching/gemini-live-transport.mjs'

const pcm=(seconds,value=8192)=>{
  const bytes=new Uint8Array(Math.round(seconds*GEMINI_LIVE_OUTPUT_RATE)*2)
  const view=new DataView(bytes.buffer)
  for(let i=0;i<bytes.length;i+=2)view.setInt16(i,value,true)
  return bytesToBase64(bytes)
}

function audioClock(){
  const created=[],heard=[],gain={value:1}
  const context={state:'running',currentTime:0,destination:{},failStart:false,
    createGain:()=>({gain,connect(){}}),
    createBuffer:(_channels,size,rate)=>{
      const samples=new Float32Array(size)
      return {duration:size/rate,getChannelData:()=>samples}
    },
    createBufferSource(){
      const source={buffer:null,onended:null,started:false,stopped:false,disconnected:false,
        connect(){},disconnect(){this.disconnected=true},
        start(at){
          if(context.failStart)throw Error('synthetic device failure')
          this.started=true;this.startAt=at;this.endAt=at+this.buffer.duration
        },
        stop(){this.stopped=true},
      }
      created.push(source)
      return source
    },
  }
  function advanceTo(time){
    assert.ok(time>=context.currentTime)
    if(context.state!=='running')return
    while(true){
      const source=created.filter(x=>x.started&&!x.stopped&&!x.finished&&x.endAt<=time+1e-9)
        .sort((a,b)=>a.endAt-b.endAt)[0]
      if(!source)break
      context.currentTime=source.endAt
      source.finished=true
      heard.push(...source.buffer.getChannelData(0))
      source.onended?.()
    }
    context.currentTime=time
  }
  return {context,created,heard,gain,advanceTo}
}

test('faster-than-playback PCM bursts keep the session audio queued and drain in exact order',()=>{
  const sound=audioClock();let ends=0
  const player=new GeminiLivePcmPlayer(sound.context,{onEnd:()=>ends++})
  const expected=[]
  // Production previously aborted on packet 8 at 0.7s, after only a short
  // audible greeting. Each packet contains 0.5s of otherwise valid speech.
  for(let i=0;i<40;i++){
    sound.advanceTo(i*.1)
    assert.equal(player.append(pcm(.5,i+1)),true,'packet '+i+' remains accepted')
    expected.push(...new Array(GEMINI_LIVE_OUTPUT_RATE/2).fill((i+1)/32768))
    assert.ok(player.cursor-sound.context.currentTime<=2.5+1e-9)
    assert.equal(ends,0)
  }
  assert.ok(player.pending.length>0,'generated speech can wait outside the short scheduling window')
  assert.equal(player.playing,true)
  assert.ok(sound.created.every(x=>!x.stopped))
  sound.advanceTo(25)
  assert.equal(player.playing,false)
  assert.equal(player.pending.length,0)
  assert.equal(player.bufferedSamples,0)
  assert.equal(ends,1,'turn drains only after scheduled and waiting samples finish')
  assert.deepEqual(sound.heard,expected,'no missing, reordered or duplicated PCM samples')
})

test('one large provider packet is split into a bounded scheduling window without losing its tail',()=>{
  const sound=audioClock();let ends=0
  const player=new GeminiLivePcmPlayer(sound.context,{onEnd:()=>ends++})
  assert.equal(player.append(pcm(5)),true)
  assert.ok(player.pending.length>0)
  assert.ok(player.cursor<=2.5)
  assert.ok(sound.created.every(x=>x.buffer.duration<=.5))
  sound.advanceTo(6)
  assert.equal(sound.heard.length,GEMINI_LIVE_OUTPUT_RATE*5)
  assert.equal(ends,1)
})

test('barge-in clears all scheduled and waiting PCM; late callbacks cannot restart the old reply',()=>{
  const sound=audioClock();let ends=0
  const player=new GeminiLivePcmPlayer(sound.context,{onEnd:()=>ends++})
  for(let i=0;i<6;i++)player.append(pcm(1,i+1))
  const lateCallbacks=sound.created.map(x=>x.onended)
  assert.ok(player.pending.length>0)
  player.setVolume(.08)
  player.stop()
  assert.equal(player.playing,false)
  assert.equal(player.bufferedSamples,0)
  assert.equal(player.pending.length,0)
  assert.equal(sound.gain.value,1)
  assert.ok(sound.created.every(x=>x.stopped&&x.disconnected))
  const before=sound.created.length
  for(const callback of lateCallbacks)callback()
  sound.advanceTo(10)
  assert.equal(sound.created.length,before)
  assert.equal(sound.heard.length,0)
  assert.equal(ends,0,'an interrupted reply is never reported complete')
  assert.equal(player.append(pcm(.5,42)),true)
  for(const callback of lateCallbacks)callback()
  sound.advanceTo(11)
  assert.equal(ends,1)
  assert.equal(sound.heard.length,GEMINI_LIVE_OUTPUT_RATE/2)
  assert.ok(sound.heard.every(x=>x===42/32768),'only the subsequent reply is heard')
})

test('ordinary sequential replies reset the cursor and finish exactly once each',()=>{
  const sound=audioClock();let ends=0
  const player=new GeminiLivePcmPlayer(sound.context,{onEnd:()=>ends++})
  for(let i=0;i<3;i++){
    assert.equal(player.append(pcm(4)),true)
    sound.advanceTo(sound.context.currentTime+5)
    assert.equal(player.playing,false)
    assert.equal(player.cursor,0)
    assert.equal(player.bufferedSamples,0)
    assert.equal(ends,i+1)
  }
  assert.equal(sound.heard.length,12*GEMINI_LIVE_OUTPUT_RATE)
})

test('duration and packet limits reject excess input without erasing accepted audio',()=>{
  const sound=audioClock()
  const player=new GeminiLivePcmPlayer(sound.context)
  for(let i=0;i<12;i++)assert.equal(player.append(pcm(5)),true)
  assert.equal(player.bufferedSamples,60*GEMINI_LIVE_OUTPUT_RATE)
  const before=sound.created.length
  assert.throws(()=>player.append(pcm(.02)),/GEMINI_LIVE_AUDIO_BUFFER_LIMIT/)
  assert.equal(player.bufferedSamples,60*GEMINI_LIVE_OUTPUT_RATE)
  assert.equal(sound.created.length,before)
  assert.ok(sound.created.every(x=>!x.stopped))
  assert.equal(player.playing,true)
  player.stop()
  const tiny=bytesToBase64(Uint8Array.of(0,0))
  for(let i=0;i<4096;i++)assert.equal(player.append(tiny),true)
  assert.throws(()=>player.append(tiny),/GEMINI_LIVE_AUDIO_BUFFER_LIMIT/)
  assert.equal(player.bufferedSamples,4096)
  player.stop()
})

test('normal 20ms network packets can fill the bounded reply buffer',()=>{
  const sound=audioClock()
  const player=new GeminiLivePcmPlayer(sound.context)
  const chunk=pcm(.02)
  for(let i=0;i<3000;i++)assert.equal(player.append(chunk),true)
  assert.equal(player.bufferedSamples,60*GEMINI_LIVE_OUTPUT_RATE)
  assert.equal(player.playing,true)
  assert.throws(()=>player.append(chunk),/GEMINI_LIVE_AUDIO_BUFFER_LIMIT/)
  player.stop()
})

test('suspension preserves the internal queue and explicit resume drains it without false completion',()=>{
  const sound=audioClock();let ends=0
  const player=new GeminiLivePcmPlayer(sound.context,{onEnd:()=>ends++})
  player.append(pcm(5))
  sound.context.state='suspended'
  const before=player.bufferedSamples
  assert.equal(player.append(pcm(.5)),false)
  assert.equal(player.resume(),false)
  assert.equal(player.bufferedSamples,before,'not-accepted audio remains the caller’s responsibility')
  // Browser may deliver already-finished source callbacks after suspension.
  for(const source of [...sound.created]){source.finished=true;source.onended?.()}
  assert.equal(player.sources.size,0)
  assert.equal(player.playing,true,'waiting audio is still an unfinished reply')
  assert.equal(ends,0)
  sound.context.currentTime=3
  sound.context.state='running'
  assert.equal(player.resume(),true)
  sound.advanceTo(6)
  assert.equal(player.playing,false)
  assert.equal(player.bufferedSamples,0)
  assert.equal(ends,1)
})

test('a source start failure cleans the failed node without advancing the cursor or consuming PCM',()=>{
  const sound=audioClock()
  const player=new GeminiLivePcmPlayer(sound.context)
  sound.context.failStart=true
  assert.throws(()=>player.append(pcm(.5)),/GEMINI_LIVE_AUDIO_PLAYBACK_FAILED/)
  assert.equal(player.cursor,0)
  assert.equal(player.sources.size,0)
  assert.equal(player.pending[0].offset,0)
  assert.equal(sound.created[0].onended,null)
  assert.equal(sound.created[0].disconnected,true)
  sound.context.failStart=false
  assert.equal(player.resume(),true)
  sound.advanceTo(1)
  assert.equal(sound.heard.length,GEMINI_LIVE_OUTPUT_RATE/2)
  assert.equal(player.bufferedSamples,0)
})

test('asynchronous refill failure retires the broken reply and reports one safe error',()=>{
  const sound=audioClock(),errors=[];let ends=0
  const player=new GeminiLivePcmPlayer(sound.context,{
    onEnd:()=>ends++,onError:code=>errors.push(code),
  })
  player.append(pcm(5))
  sound.context.failStart=true
  sound.advanceTo(1)
  assert.deepEqual(errors,['GEMINI_LIVE_AUDIO_PLAYBACK_FAILED'])
  assert.equal(player.playing,false)
  assert.equal(player.bufferedSamples,0)
  assert.equal(ends,0)
  assert.ok(sound.created.every(x=>x.finished||x.stopped||!x.started))
})

test('invalid PCM never mutates already accepted playback',()=>{
  const sound=audioClock()
  const player=new GeminiLivePcmPlayer(sound.context)
  player.append(pcm(3))
  const before=player.bufferedSamples
  assert.throws(()=>player.append('not pcm'),/GEMINI_LIVE_AUDIO_INVALID/)
  assert.equal(player.bufferedSamples,before)
  assert.equal(player.playing,true)
  assert.ok(sound.created.every(x=>!x.stopped))
  player.stop()
})
