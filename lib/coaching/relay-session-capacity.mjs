// Optimistic upper bound, not a grant or provider availability claim.
// If even the entire hourly allowance cannot cover a new logical session,
// do not mint credentials. Previously enrolled runs can resume.
export function canFitNewLogicalSession({remainingMs,segmentMs,quota}={}){
 if(!Number.isSafeInteger(remainingMs)||remainingMs<=0||
    !Number.isSafeInteger(segmentMs)||segmentMs<=0||
    !Array.isArray(quota?.successful)||quota.successful.length!==3)return false
 const hour=quota.successful.find(row=>row?.bucket?.op==='my-coach-live-free-actor-hour'&&row.seconds===3600)
 const day=quota.successful.find(row=>row?.bucket?.op==='my-coach-live-free-actor-day'&&row.seconds===86400)
 const globalDay=quota.successful.find(row=>row?.bucket?.op==='my-coach-live-free-global-day'&&row.seconds===86400)
 if(![hour,day,globalDay].every(row=>Number.isSafeInteger(row?.limit)&&row.limit>0))return false
 // Setup, consent, disconnects and spent slots further reduce usable time.
 return Math.ceil(remainingMs/segmentMs)<=Math.min(hour.limit,day.limit,globalDay.limit)
}
