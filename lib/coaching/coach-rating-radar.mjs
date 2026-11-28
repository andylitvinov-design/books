// Read-only geometry for saved, already normalized coaching self-ratings (0–10).
// Structured fields require explicit confirmation. No interpolation or defaults.
export function coachRatingValue(input){
 const v=input!==null&&typeof input==='object'?(input.status==='confirmed'?input.value:null):input
 return Number.isInteger(v)&&v>=0&&v<=10?v:null
}
export function buildCoachRatingRadar(input){
 if(!Array.isArray(input)||input.length!==8||input.some(a=>!a||typeof a.id!=='string'||!a.id||typeof a.label!=='string'||!a.label)||new Set(input.map(a=>a.id)).size!==8)return null
 const rows=input.map(a=>({id:a.id,label:a.label,current:coachRatingValue(a.current),desired:coachRatingValue(a.desired)}))
 const point=(i,v)=>[110+8*v*Math.cos(-Math.PI/2+i*Math.PI/4),110+8*v*Math.sin(-Math.PI/2+i*Math.PI/4)]
 const spokes=rows.map((r,i)=>({id:r.id,end:point(i,10),label:point(i,12)}))
 const grid=[2,4,6,8,10].map(v=>({value:v,points:rows.map((_,i)=>point(i,v))}))
 const series=['current','desired'].map(key=>{
  const points=rows.map((r,i)=>r[key]===null?null:point(i,r[key]))
  const count=points.filter(p=>p!==null).length,complete=count===rows.length
  // Never bridge an unanswered axis or fill a partial polygon.
  const segments=complete?[]:points.flatMap((p,i)=>{
   const next=points[(i+1)%points.length]
   return p!==null&&next!==null?[[p,next]]:[]
  })
  return {key,points,count,complete,segments}
 })
 return {rows,spokes,grid,series,hasData:series.some(s=>s.count>0)}
}
