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
