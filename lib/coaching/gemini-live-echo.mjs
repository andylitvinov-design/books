// Compare mic audio with the PCM actually scheduled on this AudioContext.
// A short, low-rate copy stays in the tab. Time tags exclude gaps, future
// playback and parts cancelled by barge-in. No microphone history is stored here.
const RATE=3000
const RING_SIZE=16384
const MAX_DELAY=Math.ceil(RATE*.32)

function average(samples,start,end){
  let sum=0
  for(let i=start;i<end;i++)sum+=samples[i]
  return sum/(end-start)
}

// Fit a delayed, gain-scaled copy of the speaker to the centered mic block.
// Rolling reference energy keeps the delay search bounded on the audio clock.
function bestPath(mic,ref,first,last){
  const count=mic.length
  let sum=0,power=0,best=null
  for(let i=0;i<count;i++){sum+=ref[first+i];power+=ref[first+i]*ref[first+i]}
  for(let offset=first;offset<=last;offset++){
    const variance=power-sum*sum/count
    if(variance>1e-8){
      let dot=0
      for(let i=0;i<count;i++)dot+=mic[i]*ref[offset+i]
      const explained=dot*dot/variance
      if(!best||explained>best.explained)
        best={offset,mean:sum/count,gain:dot/variance,variance,explained}
    }
    if(offset<last){
      const a=ref[offset],b=ref[offset+count]
      sum+=b-a;power+=b*b-a*a
    }
  }
  return best
}

function subtractPath(mic,ref,path){
  let power=0
  for(let i=0;i<mic.length;i++){
    mic[i]-=path.gain*(ref[path.offset+i]-path.mean)
    power+=mic[i]*mic[i]
  }
  return power
}

export class GeminiLiveEchoReference{
  constructor(){
    this.wave=new Float32Array(RING_SIZE)
    this.at=new Int32Array(RING_SIZE).fill(-1)
    this.end=-Infinity
  }
  schedule(samples,start,sampleRate){
    const stride=sampleRate/RATE
    const first=Math.round(start*RATE)
    const length=Math.floor(samples.length/stride)
    for(let i=0;i<length;i++){
      const time=first+i,index=time%RING_SIZE
      this.wave[index]=average(samples,Math.floor(i*stride),Math.floor((i+1)*stride))
      this.at[index]=time
    }
    this.end=Math.max(this.end,first+length)
  }
  stop(now){
    const first=Math.max(0,Math.ceil(now*RATE))
    for(let t=first;t<this.end;t++)this.at[t%RING_SIZE]=-1
    this.end=Math.min(first,this.end)
  }
  recent(now){return now*RATE<=this.end+MAX_DELAY}
  residualLevel(audio,sampleRate,now){
    if(!this.recent(now))return null
    // Up to 32 ms is enough to compare one capture block. Allow variable
    // worklet delivery, device latency and the acoustic path to the mic.
    const stride=sampleRate/RATE
    const count=Math.min(96,Math.floor(audio.length/stride))
    if(count<20)return null
    const mic=new Float32Array(count)
    const offset=audio.length-Math.floor(count*stride)
    let micMean=0
    for(let i=0;i<count;i++){
      mic[i]=average(audio,offset+Math.floor(i*stride),offset+Math.floor((i+1)*stride))
      micMean+=mic[i]/count
    }
    let micPower=0
    for(let i=0;i<count;i++){mic[i]-=micMean;micPower+=mic[i]*mic[i]}
    if(micPower<1e-8)return null
    const start=Math.floor(now*RATE)-count-MAX_DELAY
    const ref=new Float32Array(count+MAX_DELAY)
    for(let i=0;i<ref.length;i++){
      const t=start+i,index=t%RING_SIZE
      if(t>=0&&this.at[index]===t)ref[i]=this.wave[index]
    }
    const direct=bestPath(mic,ref,0,MAX_DELAY)
    if(!direct||direct.explained<.55*micPower)return null
    let residual=subtractPath(mic,ref,direct)
    const paths=[direct]
    // A loudspeaker may return via the room as well as directly. Subtract
    // at most two correlated reflections in a 50 ms neighborhood before
    // testing for quiet independent speech. Never upload the fitted signal.
    const first=Math.max(0,direct.offset-Math.ceil(.05*RATE))
    const last=Math.min(MAX_DELAY,direct.offset+Math.ceil(.05*RATE))
    for(let i=0;i<2&&residual>count*.009**2;i++){
      const reflection=bestPath(mic,ref,first,last)
      if(!reflection||reflection.explained<.18*residual)break
      residual=subtractPath(mic,ref,reflection)
      paths.push(reflection)
      // Reflections can be correlated with the direct sound. Refit the
      // selected gains so that one path does not leave part of another.
      for(const path of paths){
        let dot=0
        for(let j=0;j<count;j++)dot+=mic[j]*(ref[path.offset+j]-path.mean)
        path.gain=dot/path.variance
        residual=subtractPath(mic,ref,path)
      }
    }
    return Math.sqrt(residual/count)
  }
}
