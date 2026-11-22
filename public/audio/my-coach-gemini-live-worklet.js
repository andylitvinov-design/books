// Browser-local microphone PCM frames; no recording, network, storage or imports.
// Capture every 1536 native samples (~32ms at 48kHz / ~35ms at 44.1kHz).
class HolisticGeminiLiveCaptureProcessor extends AudioWorkletProcessor {
  constructor(){
    super()
    this.pending=new Float32Array(1536)
    this.count=0
  }
  process(inputs){
    const input=inputs[0]?.[0]
    if(input)for(let i=0;i<input.length;i++){
      this.pending[this.count++]=input[i]
      if(this.count===this.pending.length){
        const chunk=this.pending
        this.pending=new Float32Array(1536)
        this.count=0
        this.port.postMessage(chunk,[chunk.buffer])
      }
    }
    return true
  }
}
registerProcessor('holistic-gemini-live-capture',HolisticGeminiLiveCaptureProcessor)
