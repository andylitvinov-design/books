// Pure geometry for a mobile conversation window. The iOS visual viewport is
// smaller than the layout viewport when the software keyboard is visible.
// Never extend a chat below the top of the bottom navigation or keyboard.
export function availableInboxHeight({visualBottom,windowTop,navigationTop=null,gutter=8}={}){
  if(!Number.isFinite(visualBottom)||!Number.isFinite(windowTop))return null
  const bottom=Number.isFinite(navigationTop)?Math.min(visualBottom,navigationTop):visualBottom
  const free=Math.floor(bottom-windowTop-gutter)
  return Math.max(112,Math.min(free,1100))
}
