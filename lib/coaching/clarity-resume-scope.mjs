// Navigation selector only; no voice or billing entitlement.
export function clarityResumeRunId(value){
 return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)?value:null
}
export function clarityResumeMatches(binding,requested){
 return requested==null?!binding:clarityResumeRunId(requested)!==null&&binding?.courseRunId===requested
}
