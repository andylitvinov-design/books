// Read-only projection of the authenticated server clock. Never infer elapsed time from a coach, practice, URL or browser timer.
export function projectCourseSession(clock,count=3){
 if(!Number.isInteger(count)||count<1||count>8)return null
 if(clock===null)return {session:1,percent:0,complete:false}
 if(!clock||typeof clock.complete!=='boolean'||!Array.isArray(clock.days)||clock.days.length!==count)return null
 let next=null
 for(let i=0;i<count;i++){
  const d=clock.days[i]
  if(!d||d.day!==i+1||!Number.isSafeInteger(d.elapsedMs)||d.elapsedMs<0||d.elapsedMs>1200000||!['not_started','active','paused','time_limit'].includes(d.status)||d.remainingMs!==1200000-d.elapsedMs)return null
  if((d.status==='time_limit')!==(d.elapsedMs===1200000)||(d.status==='not_started'&&d.elapsedMs!==0))return null
  if(next!==null&&d.status!=='not_started')return null
  if(next===null&&d.status!=='time_limit')next=d
 }
 if(clock.complete!==(next===null)||clock.currentDay!==(next?.day??null))return null
 return next?{session:next.day,percent:Math.floor(next.elapsedMs/12000),complete:false}:{session:count,percent:100,complete:true}
}

// A new day is allowed only on an exact owner-verified server start receipt.
// Unknown or partial draft history is never proof of absence.
export function validBoundClarityStart(receipt,courseRunId,topic){
 const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
 return Boolean(uuid(courseRunId)&&receipt?.courseRunId===courseRunId&&[1,2,3].includes(receipt.day)&&topic==='clarity_day_'+receipt.day&&uuid(receipt.protocolId)&&receipt.protocolId!==courseRunId)
}
export function resolveSavedCoachSession({accountSaving,ready,busy,error,cursor,items=[],topic,personaId,courseRunId=null,boundStart=null,canResume}){
 if(!accountSaving)return {kind:courseRunId?'lookup':'new'}
 if(busy||!ready||error)return {kind:'lookup'}
 const matches=items.filter(item=>item.courseSessionId===topic&&(!courseRunId||item.courseRunId===courseRunId))
 if(cursor||matches.length>1)return {kind:'choose'}
 if(!matches.length)return courseRunId?(validBoundClarityStart(boundStart,courseRunId,topic)&&items.length===0?{kind:'new',boundStart}:{kind:'choose'}):{kind:'new'}
 const item=matches[0]
 return {kind:(canResume?canResume(item):item.personaId===personaId)?'resume':'choose',item}
}
