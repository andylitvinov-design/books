export function reconcileCoachingDraft({prior,current,questions,questionId,draft,dirty,fallbackIndex}){
  const answers=current?.answers||{}
  const questionIndex=questions.findIndex(item=>item.id===questionId)
  if(dirty&&prior?.id&&prior.id===current?.id&&current.status==='active'&&questionIndex>=0)
    return {index:questionIndex,draft,retained:true}
  const first=questions.findIndex(item=>!Object.prototype.hasOwnProperty.call(answers,item.id))
  const index=Number.isInteger(fallbackIndex)?fallbackIndex:first<0?Math.max(questions.length-1,0):first
  const saved=answers[questions[index]?.id]
  return {index,draft:typeof saved==='string'?saved:'',retained:false}
}
