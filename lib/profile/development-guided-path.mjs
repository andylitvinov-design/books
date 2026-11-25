/** One-question intake navigation, never re-label blanks as zero or completion. */
const number=value=>typeof value==='number'
 ?Number.isInteger(value)&&value>=0&&value<=10
 :typeof value==='string'&&/^(?:10|[0-9])$/.test(value)
export function vectorGuidedProgress(items,ratings={}){
 if(!Array.isArray(items)||items.length!==8)return {complete:0,total:0,missing:[],partial:[]}
 const rows=items.map((item,index)=>{
  const r=ratings?.[item.id]
  const current=number(r?.current),desired=number(r?.desired)
  return {index,id:item.id,current,desired,complete:current&&desired}
 })
 return {
  total:rows.length,complete:rows.filter(row=>row.complete).length,
  missing:rows.filter(row=>!row.complete).map(row=>row.index),
  partial:rows.filter(row=>!row.complete&&(row.current||row.desired)).map(row=>row.index)
 }
}
export function firstIncompleteVector(items,ratings){
 return vectorGuidedProgress(items,ratings).missing[0]??null
}
export function nextIncompleteVector(items,ratings,index){
 const pending=vectorGuidedProgress(items,ratings).missing
 if(!Number.isInteger(index)||index<0||index>=8)return pending[0]??null
 return pending.find(next=>next>index)??pending.find(next=>next<index)??null
}
