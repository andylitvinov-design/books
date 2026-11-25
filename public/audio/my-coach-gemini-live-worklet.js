// Browser-local microphone PCM frames; no recording, network, storage or imports.
// Keep about 32 ms of speech evidence even with a 96 or 192 kHz audio device.
class HolisticGeminiLiveCaptureProcessor extends AudioWorkletProcessor {
  constructor(){
    super()
    this.frameSize=128*Math.max(1,Math.round(sampleRate*.032/128))
    this.pending=new Float32Array(this.frameSize)
    this.count=0
  }
  process(inputs){
    const input=inputs[0]?.[0]
    if(input)for(let i=0;i<input.length;i++){
      this.pending[this.count++]=input[i]
      if(this.count===this.pending.length){
        const chunk=this.pending
        this.pending=new Float32Array(this.frameSize)
        this.count=0
        this.port.postMessage(chunk,[chunk.buffer])
      }
    }
    return true
  }
}
registerProcessor('holistic-gemini-live-capture',HolisticGeminiLiveCaptureProcessor)
