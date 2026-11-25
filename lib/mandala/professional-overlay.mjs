/**
 * Tiny, deterministic professional headline/end-card overlay for the existing
 * Canvas/MediaRecorder pipeline. Does not create media, access network or
 * publish. Must be painted in BOTH preview and exported frames.
 */
function text(value, max = 110) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/<[^>]*>/g,'').trim().slice(0,max) : '';
}
function splitLines(ctx, value, availableWidth, fontPx, limit = 2) {
  const chars = text(value,180).split(/\s+/).filter(Boolean);
  let result=[],line='';
  for(const word of chars){
    const next=line ? line+' '+word : word;
    const width=typeof ctx.measureText==='function' ? ctx.measureText(next).width : next.length*fontPx*.58;
    if(line && width>availableWidth && result.length<limit-1){result.push(line);line=word;}
    else line=next;
  }
  if(line)result.push(line);
  return result.slice(0,limit).map(item=>item.length>82?item.slice(0,81)+'…':item);
}
export function paintProfessionalPromoFrame(ctx,seconds,proposal) {
  if(!proposal || !Array.isArray(proposal.shotPlan) || !ctx?.canvas ||
    typeof ctx.fillRect!=='function' || typeof ctx.fillText!=='function')return false;
  const width=ctx.canvas.width,height=ctx.canvas.height;
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)return false;
  const total=Number(proposal.durationSec)||30;
  const safeSecond=Math.max(0,Math.min(total-0.001,Number.isFinite(seconds)?seconds:0));
  const shot=proposal.shotPlan.find(s=>safeSecond>=s.startSec&&safeSecond<s.endSec)
    ||proposal.shotPlan.at(-1);
  if(!shot)return false;
  const isEnd=safeSecond>=Math.max(0,total-6);
  const margin=Math.round(width*.075);
  const font=Math.max(20,Math.round(width*.039));
  const lines=isEnd&&proposal.cta?.verifiedPublicSource
    ?splitLines(ctx,proposal.cta.label,width-margin*2,font,2)
    :splitLines(ctx,shot.onScreenText,width-margin*2,font,2);
  ctx.save();
  try{
    ctx.textBaseline='middle';
    ctx.textAlign='left';
    ctx.font='700 '+font+'px system-ui, sans-serif';
    const bandHeight=Math.min(height*.27,lines.length*font*1.55+font*2.1);
    const top=Math.round(height-bandHeight-height*.08);
    ctx.fillStyle='rgba(15,35,41,.82)';
    ctx.fillRect(0,top,width,bandHeight);
    ctx.fillStyle='#fffefa';
    lines.forEach((line,i)=>ctx.fillText(line,margin,top+font*1.2+i*font*1.52,width-margin*2));
    if(isEnd && proposal.cta?.href && proposal.cta.verifiedPublicSource){
      ctx.font='500 '+Math.max(15,Math.round(font*.58))+'px system-ui, sans-serif';
      const href=text(proposal.cta.href,92);
      ctx.fillText(href,margin,top+bandHeight-font*.6,width-margin*2);
    }
  }finally{ctx.restore();}
  return true;
}
