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
