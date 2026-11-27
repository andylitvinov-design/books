// Navigation selector only; no voice or billing entitlement.
export function clarityResumeRunId(value){
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)?value:null
}
export function clarityResumeMatches(binding,requested){
 return requested==null?!binding:clarityResumeRunId(requested)!==null&&binding?.courseRunId===requested
}

export function clarityDaybookRunSelection(params){
 const ids=params?.getAll('courseRunId')||[]
 if(!ids.length)return {requested:false,id:null,day:null,invalid:false}
 const days=params?.getAll('clarityDay')||[]
 const id=ids.length===1?clarityResumeRunId(ids[0]):null
 const day=days.length===1&&/^[123]$/.test(days[0])?Number(days[0]):null
 return {requested:true,id,day,invalid:!id||days.length>1||days.length===1&&!day}
}
export function validClarityRunSummary(run,id){
 if(!clarityResumeRunId(id)||run?.id!==id||!Number.isSafeInteger(run.ordinal)||run.ordinal<1||
 !['free','paid'].includes(run.access)||(run.ordinal===1)!==(run.access==='free')||
 !['ready','in_progress','completed'].includes(run.status)||!Number.isSafeInteger(run.totalElapsedMs)||
 run.totalElapsedMs<0||run.totalElapsedMs>3600000||!Array.isArray(run.days)||run.days.length!==3)return false
 if(!run.days.every((d,i)=>d?.day===i+1&&clarityResumeRunId(d.protocolId)&&Number.isSafeInteger(d.elapsedMs)&&d.elapsedMs>=0&&d.elapsedMs<=1200000&&d.remainingMs===1200000-d.elapsedMs&&['not_started','active','paused','time_limit'].includes(d.status)))return false
 return new Set(run.days.map(d=>d.protocolId)).size===3&&run.days.reduce((sum,d)=>sum+d.elapsedMs,0)===run.totalElapsedMs
}
