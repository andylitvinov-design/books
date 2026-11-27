// Observed upstream transcriptions only; no browser captions, inferred
// practice consent, reviewed fields, or proof of audible playback.
export function createAntiStressObservedTranscript(){
 let input='',output='',invalid=false
 function append(old,chunk){
  if(typeof chunk!=='string'||!chunk.trim())return old
  const v=chunk.trim()
  if(v===old||old.endsWith(v))return old
  if(old&&v.startsWith(old))return v
  return (old+(old?' ':'')+v).trim()
 }
 function reset(){input='';output='';invalid=false}
 function observe(content,atMs){
  if(!content||typeof content!=='object'||!Number.isSafeInteger(atMs))return []
  if(content.interrupted===true)invalid=true
  if(!invalid){
   input=append(input,content.inputTranscription?.text)
   output=append(output,content.outputTranscription?.text)
   if(input.length>8000||output.length>8000){invalid=true;input='';output=''}
  }
  if(content.turnComplete!==true)return []
  const completed=invalid?[]:[...(input?[{role:'client',text:input,atMs}]:[]),...(output?[{role:'coach',text:output,atMs}]:[])]
  reset();return completed
 }
 return {observe,reset}
}
