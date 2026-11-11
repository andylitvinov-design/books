export function reconcileCoachingDraft({prior,current,questions,questionId,draft,dirty,fallbackIndex,unresolvedAnswer}){
  const answers=current?.answers||{}
  const questionIndex=questions.findIndex(item=>item.id===questionId)
  if(dirty&&prior?.id&&prior.id===current?.id&&current.status==='active'&&questionIndex>=0){
    const changedAnswer=Object.prototype.hasOwnProperty.call(answers,questionId)&&(answers[questionId]!==prior.answers?.[questionId]||unresolvedAnswer!==undefined)
      ?answers[questionId]:undefined
    return {index:questionIndex,draft,retained:true,changedAnswer}
  }
  const first=questions.findIndex(item=>!Object.prototype.hasOwnProperty.call(answers,item.id))
  const index=Number.isInteger(fallbackIndex)?fallbackIndex:first<0?Math.max(questions.length-1,0):first
  const saved=answers[questions[index]?.id]
  return {index,draft:typeof saved==='string'?saved:'',retained:false,changedAnswer:undefined}
}

const planFields=['goal','obstacle','actionText','when','confidence','feasibilityReview','fallback']
export function coachingPlansEqual(a,b){
  if(!a||!b)return !a&&!b
  const basics=planFields.every(key=>key==='confidence'?(a[key]??null)===(b[key]??null):(a[key]||'')===(b[key]||''))
  const actions=plan=>Array.isArray(plan?.nextActions)?plan.nextActions.map(row=>({text:row?.text||'',when:row?.when||''})):[]
  return basics&&JSON.stringify(actions(a))===JSON.stringify(actions(b))
}
export function reconcileCoachingPlan(prior,current,unresolved){
  if(current?.status==='safety_hold')return {kind:'safety_hold'}
  if(!prior?.id||prior.id!==current?.id||current.status!=='completed')return {kind:'changed'}
  const changed=!coachingPlansEqual(prior.actionPlan,current.actionPlan)||unresolved!==undefined
  return {kind:'ready',conflict:changed?(current.actionPlan||null):undefined}
}

export function reconcileFollowupDraft(prior,current,pending,draft){
  if(!pending||typeof draft!=='string'||!draft.trim())return 'none'
  if(current?.status==='safety_hold')return 'safety_hold'
  if(!prior?.id||prior.id!==current?.id)return 'confirm_discard'
  const saved=current?.reflections?.[pending.questionId]
  if(saved?.key===pending.key&&saved.text===draft.trim())return 'saved'
  const next=current?.pendingFollowup
  if(current?.status==='active'&&current.dialogueProtocol===1&&
    next?.questionId===pending.questionId&&next?.key===pending.key&&
    prior.answers?.[pending.questionId]===current.answers?.[pending.questionId])return 'retain'
  return 'confirm_discard'
}
