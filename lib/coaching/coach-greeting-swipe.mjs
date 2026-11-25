// Horizontal greeting-only gestures: never turn vertical profile scrolling into a coach change.
export function greetingSwipeDirection(dx,dy){
  if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)<56||Math.abs(dx)<=Math.abs(dy)*1.4)return 0
  return dx<0?1:-1
}
export function greetingCoachNeighbor(ids,id,direction){
  const index=ids.indexOf(id)
  if(index<0||ids.length<2||(direction!==1&&direction!==-1))return null
  return ids[(index+direction+ids.length)%ids.length]
}
