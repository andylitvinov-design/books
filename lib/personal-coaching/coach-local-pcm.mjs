// Short-turn PCM path for Basic. Local bounded pre-roll only; no extra STT
// calls, no storage, no background connection. Longer/uncertain captures use
// the original compressed MediaRecorder bytes from the SAME microphone.
const RATE=16000, PRE=6400, MAX=RATE*9;
export function encodeCoachPcmWav(samples){
  if(!(samples instanceof Int16Array)||samples.length<1||samples.length>MAX)throw Error('COACH_PCM_INVALID');
  const out=new Uint8Array(44+samples.length*2),v=new DataView(out.buffer);
  const tag=(i,t)=>{for(let j=0;j<t.length;j++)out[i+j]=t.charCodeAt(j)};
  tag(0,'RIFF');v.setUint32(4,out.length-8,true);tag(8,'WAVE');tag(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,RATE,true);v.setUint32(28,RATE*2,true);v.setUint16(32,2,true);
  v.setUint16(34,16,true);tag(36,'data');v.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++)v.setInt16(44+i*2,samples[i],true);
  return out;
}
export function createCoachLocalPcm(sampleRate){
  if(!Number.isFinite(sampleRate)||sampleRate<RATE||sampleRate>192000)throw Error('COACH_PCM_RATE');
  let phase=0,sum=0,count=0,ring=new Int16Array(PRE),head=0,size=0;
  let active=null,last=null;
  function reset(){active=null;head=0;size=0;ring.fill(0);phase=0;sum=0;count=0;last=null}
  return {
    push(frame,now){
      if(!(frame instanceof Float32Array)||!frame.length||frame.length>16384||!Number.isFinite(now))return;
      // Main-thread stalls or disconnected worklets must not produce partial
      // "fast" transcripts: reject this candidate and keep the original file.
      if(last!==null&&now-last>300){active=null;head=0;size=0;phase=0;sum=0;count=0}
      last=now;
      const block=[];
      for(const raw of frame){
        const x=Number.isFinite(raw)?Math.max(-1,Math.min(1,raw)):0;
        sum+=x;count++;phase+=RATE;
        if(phase>=sampleRate){
          const avg=sum/count;block.push(Math.round(avg*(avg<0?32768:32767)));
          phase-=sampleRate;sum=0;count=0;
        }
      }
      for(const x of block){ring[head]=x;head=(head+1)%PRE;size=Math.min(PRE,size+1)}
      if(active){
        if(active.length+block.length>MAX){active=null;return}
        active.samples.set(block,active.length);active.length+=block.length;
      }
    },
    begin(now){
      if(active)return;
      if(last===null||now-last>150||size<RATE*.20)return;
      const samples=new Int16Array(MAX);
      for(let i=0;i<size;i++)samples[i]=ring[(head-size+i+PRE)%PRE];
      active={samples,length:size,pre:size,at:now};
    },
    discard(){active=null},
    finish(now){
      const item=active;active=null;
      if(!item||last===null||now-last>250||now-item.at>8000)return null;
      const expected=(now-item.at)*RATE/1000;
      if(item.length-item.pre<Math.max(RATE*.12,expected-RATE*.25))return null;
      return encodeCoachPcmWav(item.samples.subarray(0,item.length));
    },
    reset,
  };
}
