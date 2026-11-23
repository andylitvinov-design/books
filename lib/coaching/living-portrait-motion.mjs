// Low-cost, visual-only portrait cues. Web Speech word boundaries are not visemes.
export function speechRms(samples){
  if(!samples||!Number.isFinite(samples.length)||samples.length<1)return 0
  let energy=0
  for(let i=0;i<samples.length;i++){
    const sample=Number(samples[i])
    if(!Number.isFinite(sample))return 0
    const value=(sample-128)/128
    energy+=value*value
  }
  return Math.min(1,Math.sqrt(energy/samples.length))
}

// Real waveform amplitude takes precedence; otherwise this is deliberately
// approximate word-boundary/fallback movement, not a phoneme-level lip-sync.
export function portraitMouthAperture({phase='idle',beat=0,lastBoundaryAgoMs=Infinity,nowMs=0,amplitude=null}={}){
  if(phase!=='speaking')return 0
  if(amplitude!==null&&Number.isFinite(Number(amplitude)))
    return Math.min(1,Math.max(0,Number(amplitude)*5))
  const count=Number(beat),age=Number(lastBoundaryAgoMs)
  const pulse=Number.isFinite(count)&&count>0&&Number.isFinite(age)
    ? Math.max(0,1-Math.max(0,age)/260)*(0.44+(Math.abs(count)%3)*0.12):0
  const fallback=0.13+0.16*Math.max(0,Math.sin((Number.isFinite(nowMs)?nowMs:0)/120))
  return Math.min(1,Math.max(fallback,pulse))
}


// Read-only 20 Hz speech energy envelope from already downloaded MP3 PCM.
// Fails closed on malformed frames; bounded to 90 seconds and <=64 samples/window.
export function speechPcmEnvelope(samples,sampleRate){
  if(!samples||!Number.isFinite(samples.length)||samples.length<1||
     !Number.isFinite(sampleRate)||sampleRate<1000)return new Float32Array(0)
  const hz=20,windowSize=sampleRate/hz
  const windows=Math.min(1800,Math.ceil(samples.length/windowSize))
  const envelope=new Float32Array(windows)
  for(let index=0;index<windows;index++){
    const begin=Math.floor(index*windowSize)
    const end=Math.min(samples.length,Math.max(begin+1,Math.floor((index+1)*windowSize)))
    const stride=Math.max(1,Math.floor((end-begin)/64))
    let energy=0,count=0
    for(let j=begin;j<end;j+=stride){
      const sample=Number(samples[j])
      if(!Number.isFinite(sample))continue
      energy+=sample*sample;count++
    }
    envelope[index]=count?Math.min(1,Math.sqrt(energy/count)*4):0
  }
  return envelope
}
