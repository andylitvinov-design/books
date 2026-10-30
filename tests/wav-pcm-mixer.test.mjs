import test from "node:test";
import assert from "node:assert/strict";
import {mixPcmWavs} from "../lib/mandala/wav-pcm-mixer.mjs";
function createWav({rate=24000,seconds=2,freq=280,amplitude=12000}={}) {
  const count=rate*seconds;
  const b=new ArrayBuffer(44+count*2),v=new DataView(b);
  for(const [offset,value] of [[0,"RIFF"],[8,"WAVE"],[12,"fmt "],[36,"data"]])
    for(let i=0;i<value.length;i++)v.setUint8(offset+i,value.charCodeAt(i));
  v.setUint32(4,36+count*2,true);v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);
  v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);
  v.setUint32(40,count*2,true);
  for(let i=0;i<count;i++)v.setInt16(44+i*2,Math.round(amplitude*Math.sin(i*2*Math.PI*freq/rate)),true);
  return b;
}
test("cross-platform PCM mixer appends nature until exactly video duration, not speech looping",()=>{
  const voice=createWav({rate:24000,seconds:2,freq:300});
  const ocean=createWav({rate:22050,seconds:1,freq:120});
  const result=mixPcmWavs(voice,ocean,10),v=new DataView(result);
  assert.equal(v.getUint32(0,false),0x52494646);
  assert.equal(v.getUint32(8,false),0x57415645);
  assert.equal(v.getUint32(24,true),24000);
  assert.equal(v.getUint32(40,true),24000*10*2);
  assert.equal(result.byteLength,44+24000*10*2);
  const voiceAtHalf=v.getInt16(44+24000,true);
  const voiceAfter=v.getInt16(44+24000*5*2,true);
  assert.ok(Math.abs(voiceAtHalf)>2000,"speech and ambient are audible");
  assert.ok(Math.abs(voiceAfter)>100,"nature continues without looping voice");
});
test("PCM mixer rejects invalid, truncated and unsupported payloads before allocating output",()=>{
  const sample=createWav();
  assert.throws(()=>mixPcmWavs(new ArrayBuffer(10),sample));
  const broken=sample.slice(0,60);
  assert.throws(()=>mixPcmWavs(broken,sample));
  const weird=sample.slice(0);new DataView(weird).setUint16(20,3,true);
  assert.throws(()=>mixPcmWavs(weird,sample));
});

test("gain faders support exact silence, 100% voice and background without any browser audio API",()=>{
  const spoken=createWav({seconds:2,freq:300,amplitude:15000});
  const bed=createWav({seconds:1,freq:123,amplitude:9000});
  const silent=new DataView(mixPcmWavs(spoken,null,3,{voiceLevel:0,musicLevel:100}));
  const voiced=new DataView(mixPcmWavs(spoken,null,3,{voiceLevel:100,musicLevel:100}));
  const bgOnly=new DataView(mixPcmWavs(spoken,bed,3,{voiceLevel:0,musicLevel:100}));
  // 300Hz at 24kHz -> 80 samples/cycle, so 20 samples is a voice peak.
  assert.equal(silent.getInt16(44+20*2,true),0);
  assert.ok(Math.abs(voiced.getInt16(44+20*2,true))>12000);
  assert.equal(voiced.getInt16(44+24000*2*2,true),0,"speech does not loop");
  assert.ok(Math.abs(bgOnly.getInt16(44+24000*2*2+14*2,true))>500,
    "background continues after speech without voice");
});
