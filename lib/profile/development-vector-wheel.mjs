/** Pure, intentionally sparse geometry for the voluntary 8-axis self-rating wheel.
 * Missing ratings are never converted to 0 or connected as real observations.
 */
export const VECTOR_WHEEL_SIZE=8
const MIN=0,MAX=10,CENTER_X=170,CENTER_Y=158,RADIUS=109
export function vectorWheelScore(value){
 if(typeof value==='number')return Number.isInteger(value)&&value>=MIN&&value<=MAX?value:null
 if(typeof value!=='string'||!/^(?:10|[0-9])$/.test(value))return null
 return Number(value)
}
export function vectorWheelRows(items,ratings={}){
 if(!Array.isArray(items)||items.length!==VECTOR_WHEEL_SIZE)return []
 return items.map((item,index)=>{
  const pair=ratings&&typeof ratings==='object'?ratings[item.id]:null
  const current=vectorWheelScore(pair?.current),desired=vectorWheelScore(pair?.desired)
  // A half-filled pair is a draft, not an observation.
  const rated=current!==null&&desired!==null
  return {id:item.id,name:item.name,index,current:rated?current:null,
   desired:rated?desired:null,gap:rated?desired-current:null}
 })
}
export function vectorWheelPoint(index,value){
 const angle=-Math.PI/2+index*2*Math.PI/VECTOR_WHEEL_SIZE
 return {x:Math.round((CENTER_X+Math.cos(angle)*RADIUS*value/MAX)*10)/10,
  y:Math.round((CENTER_Y+Math.sin(angle)*RADIUS*value/MAX)*10)/10}
}
export function vectorWheelPolygon(rows,key){
 if(!['current','desired'].includes(key)||rows.length!==VECTOR_WHEEL_SIZE||
    rows.some(row=>row[key]===null))return null
 return rows.map((row,index)=>{
  const p=vectorWheelPoint(index,row[key]);return p.x+','+p.y
 }).join(' ')
}
export function vectorWheelSegments(rows,key){
 if(!['current','desired'].includes(key)||rows.length!==VECTOR_WHEEL_SIZE)return []
 const result=[]
 rows.forEach((row,index)=>{
  const next=rows[(index+1)%VECTOR_WHEEL_SIZE]
  if(row[key]===null||next[key]===null)return
  result.push({from:vectorWheelPoint(index,row[key]),
   to:vectorWheelPoint((index+1)%VECTOR_WHEEL_SIZE,next[key]),key:index})
 })
 return result
}
