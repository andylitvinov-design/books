// Client-safe view calculations; never convert a self-rating into goal completion.
export const PRIMARY_GOAL_AREAS=Object.freeze(['body_health','emotional_wellbeing','relationships','career_business','meaning_purpose'])
const DONE=new Set(['completed','achieved','done'])
const RUNNING=new Set(['in_progress','active','started'])
export function summarizeCoachingProgress(domains){
 const areas=Array.isArray(domains)?domains:[]
 const goals=areas.flatMap(area=>Array.isArray(area?.goals)?area.goals:[])
 const totalGoals=goals.length
 const completedGoals=goals.filter(goal=>DONE.has(String(goal?.status||'').toLowerCase())).length
 const inProgressGoals=goals.filter(goal=>RUNNING.has(String(goal?.status||'').toLowerCase())).length
 return {
  totalGoals,completedGoals,inProgressGoals,
  completionPercent:totalGoals?Math.round(completedGoals*100/totalGoals):null,
  areasWithGoals:areas.filter(area=>Array.isArray(area?.goals)&&area.goals.length>0).length,
  acceptedActions:goals.flatMap(goal=>Array.isArray(goal?.actions)?goal.actions:[])
   .filter(action=>action?.status==='accepted').length,
 }
}
export function orderedCoachingAreas(domains,showAll=false){
 const areas=Array.isArray(domains)?domains:[]
 const byKey=new Map(areas.map(area=>[area.areaKey,area]))
 const main=PRIMARY_GOAL_AREAS.map(key=>byKey.get(key)).filter(Boolean)
 return showAll?[...main,...areas.filter(area=>!PRIMARY_GOAL_AREAS.includes(area.areaKey))]:main
}
