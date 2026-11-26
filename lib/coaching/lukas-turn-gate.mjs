// The video session is independent of reply lifetime. Each new turn invalidates queued speech.
export function createLukasTurnGate(){
  let generation=0
  return {
    begin(text){
      const value=typeof text==='string'?text.trim():''
      if(!value||value.length>500)return null
      return Object.freeze({generation:++generation,text:value})
    },
    invalidate(){generation++},
    isCurrent(ticket){return Boolean(ticket&&ticket.generation===generation)}
  }
}
