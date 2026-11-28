/** Display-only archive metadata. Never substitutes last saved for known start, or invents duration. */
export function coachArchiveSessionMetadata(protocol={},updatedAt=null){
 const valid=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))
 const fallback=valid(updatedAt)?updatedAt:valid(protocol.completedAt)?protocol.completedAt:null
 const started=valid(protocol.startedAt)&&(!fallback||Date.parse(protocol.startedAt)<=Date.parse(fallback))
 const seconds=protocol.durationSeconds
 return {date:started?protocol.startedAt:fallback,dateKind:started?'start':fallback?'saved':null,
  duration:Number.isInteger(seconds)&&seconds>=0&&seconds<=7200?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):null,
  personaId:typeof protocol.personaId==='string'?protocol.personaId:null,
  courseSessionId:typeof protocol.courseSessionId==='string'?protocol.courseSessionId:null}
}
