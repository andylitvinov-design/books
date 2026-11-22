const OPEN=new Set(['accepted','active','in_progress'])
export function journalGoalContext(plan,selectedId){
 const goals=(Array.isArray(plan?.goals)?plan.goals:[]).filter(goal=>
  typeof goal?.id==='string'&&typeof goal.title==='string'&&goal.title.trim()&&(OPEN.has(goal.status)||goal.id===selectedId))
 const selected=goals.find(goal=>goal.id===selectedId)||null
 const actions=selected?(Array.isArray(plan?.actions)?plan.actions:[]).filter(action=>
  action?.goalId===selected.id&&['accepted','in_progress'].includes(action.status)&&
  typeof action.clientConfirmedAt==='string'&&Number.isFinite(Date.parse(action.clientConfirmedAt))&&
  typeof action.description==='string'&&action.description.trim()):[]
 return {goals,selected,actions}
}
