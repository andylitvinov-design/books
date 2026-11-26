// Keeps the AI composer popup inside the visible iOS Safari viewport.
export function positionComposerPopover({anchor,viewport,contentHeight=230,maxWidth=300,margin=12,gap=8}){
  const x=Number(viewport?.offsetLeft)||0;
  const y=Number(viewport?.offsetTop)||0;
  const vw=Math.max(0,Number(viewport?.width)||0);
  const vh=Math.max(0,Number(viewport?.height)||0);
  const inset=Math.min(margin,vw/6,vh/6);
  const width=Math.max(0,Math.min(maxWidth,vw-2*inset));
  const maxHeight=Math.max(0,Math.min(520,vh-2*inset));
  const usedHeight=Math.min(maxHeight,Math.max(44,Number(contentHeight)||0));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const left=clamp(Number(anchor.left)||0,x+inset,x+vw-inset-width);
  const availableAbove=Math.max(0,(Number(anchor.top)||0)-gap-(y+inset));
  const availableBelow=Math.max(0,y+vh-inset-((Number(anchor.bottom)||0)+gap));
  const above=availableAbove>=usedHeight||availableAbove>=availableBelow;
  const desiredTop=above?anchor.top-gap-usedHeight:anchor.bottom+gap;
  const top=clamp(desiredTop,y+inset,y+vh-inset-usedHeight);
  return {left:Math.round(left),top:Math.round(top),width:Math.round(width),maxHeight:Math.round(maxHeight)};
}
