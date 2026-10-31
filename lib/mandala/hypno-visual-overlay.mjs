// Deliberate, non-flashing Canvas 2D overlay. This must be painted by the SAME
// frame renderer used for both live preview and the captured MP4/WebM.
// No medical/brainwave entrainment claims and no paid provider calls.
export function hypnoWavePhase(seconds, cyclesPerMinute=6){
  const cycles=Math.min(8,Math.max(5,Number(cyclesPerMinute)||6));
  const t=Math.max(0,Number(seconds)||0);
  return (1-Math.cos(t*Math.PI*2*cycles/60))/2;
}
export function paintHypnoLightOverlay(ctx,seconds,{enabled=false,cyclesPerMinute=6,opacity=.18}={}){
  if(!enabled||!ctx?.canvas)return;
  const w=ctx.canvas.width,h=ctx.canvas.height;
  if(!(w>0&&h>0))return;
  const level=Math.min(.35,Math.max(.05,Number(opacity)||.18));
  // Honour the OS reduced-motion setting in BOTH live preview and exported frames.
  const reduceMotion=typeof window!=="undefined" && typeof window.matchMedia==="function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress=reduceMotion?.5:hypnoWavePhase(seconds,cyclesPerMinute);
  const x=w*.5,y=h*.45,r=Math.min(w,h)*(.18+progress*.13);
  ctx.save();
  try{
    // Smooth transparency modulation (5-8 complete cycles/minute), no strobe.
    ctx.globalCompositeOperation="screen";
    const aura=ctx.createRadialGradient(x,y,0,x,y,r*2.9);
    aura.addColorStop(0,"rgba(255,228,170,"+(level*.30).toFixed(3)+")");
    aura.addColorStop(.45,"rgba(110,219,218,"+(level*.18).toFixed(3)+")");
    aura.addColorStop(1,"rgba(110,219,218,0)");
    ctx.fillStyle=aura;
    ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="rgba(173,235,217,"+(level*.68).toFixed(3)+")";
    ctx.lineWidth=Math.max(2,w/560);
    for(let i=0;i<3;i++){
      const radius=r*(.7+i*.34);
      ctx.beginPath();ctx.ellipse(x,y,radius,radius*.65,0,0,Math.PI*2);ctx.stroke();
    }
    // Stationary rays with gently varying length; no brightness flashes.
    ctx.strokeStyle="rgba(255,231,184,"+(level*.36).toFixed(3)+")";
    for(let i=0;i<8;i++){
      const angle=Math.PI*2*i/8;
      ctx.beginPath();
      ctx.moveTo(x+Math.cos(angle)*r*.55,y+Math.sin(angle)*r*.38);
      ctx.lineTo(x+Math.cos(angle)*r*1.45,y+Math.sin(angle)*r*1.02);
      ctx.stroke();
    }
  }finally{ctx.restore();}
}
