// Do not reopen the microphone merely because local PCM has been queued.
// A valid finish requires provider speaking, local drain, then provider silence.
export function createLukasPlaybackGate(){
  let sent=false,talking=false,drained=false,ended=false
  return {
    reset(){sent=false;talking=false;drained=false;ended=false},
    sent(){sent=true},
    speaking(){if(sent&&!ended)talking=true},
    drained(){if(sent)drained=true},
    silent(){
      if(!sent||!talking||!drained||ended)return false
      ended=true;return true
    },
    active(){return sent&&!ended},
  }
}
