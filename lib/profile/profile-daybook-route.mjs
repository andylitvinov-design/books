/** A single canonical profile -> Daybook route. Never put goal titles or private answers in URLs. */
export function profileDaybookHref(root, goalId, stage = 1, step = 1) {
  const validGoal = typeof goalId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(goalId)
  const bounded = (n, max) => Number.isInteger(n) && n >= 1 && n <= max ? n : 1
  const query = new URLSearchParams({tab:'stages',stage:String(bounded(stage,8)),level:'1',step:String(bounded(step,7))})
  if (validGoal) query.set('goal',goalId)
  return root + '/daybook?' + query.toString()
}
