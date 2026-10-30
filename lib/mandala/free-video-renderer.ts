/**
 * Actual browser-side frame generator: draws NEW shapes, gradients, petals,
 * rings, light ribbons and seeded particles. Not a stock video selector.
 * No GPU server, third-party request, image model or media upload.
 */
export type FreeVideoPlan={
  version:string;source:string;
  family:"mandala"|"light"|"lotus";
  palette:"gold"|"ocean"|"violet";
  motion:"calm"|"flow"|"dynamic";
  seed:number;variation:number;
};
type Palette={back:string;deep:string;glow:string;light:string;stroke:string};
const PALETTES:Record<FreeVideoPlan["palette"],Palette>={
  gold:{back:"#071b21",deep:"#153a39",glow:"246,187,93",light:"255,234,178",stroke:"244,197,117"},
  ocean:{back:"#081d31",deep:"#104e57",glow:"64,212,221",light:"195,244,247",stroke:"101,228,223"},
  violet:{back:"#1b1336",deep:"#49254f",glow:"224,116,236",light:"250,208,255",stroke:"213,149,240"},
};
const TAU=Math.PI*2;
function random(seed:number,i:number):number{
  let n=(seed+Math.imul(i+1,0x9e3779b1))|0;
  n=Math.imul(n^(n>>>16),0x85ebca6b);
  n=Math.imul(n^(n>>>13),0xc2b2ae35);
  return ((n^(n>>>16))>>>0)/4294967296;
}
function background(ctx:CanvasRenderingContext2D,w:number,h:number,p:Palette,phase:number){
  const g=ctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,p.back);g.addColorStop(.54,p.deep);g.addColorStop(1,p.back);
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  const cx=w*(.5+Math.sin(phase*.12)*.07),cy=h*.47;
  const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(w,h)*.65);
  halo.addColorStop(0,"rgba("+p.glow+",.26)");
  halo.addColorStop(.55,"rgba("+p.glow+",.08)");
  halo.addColorStop(1,"rgba("+p.glow+",0)");
  ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
}
function dust(ctx:CanvasRenderingContext2D,w:number,h,seed:number,time:number,p:Palette,intensity=1){
  ctx.save();ctx.globalCompositeOperation="screen";
  const count=Math.max(28,Math.min(72,Math.round(w/17)));
  for(let i=0;i<count;i++){
    const u=random(seed,i+301),v=random(seed,i+701);
    const drift=(time*(8+random(seed,i+904)*18)*intensity)/(h+16);
    const y=((v-drift)%1+1)%1*h;
    const x=(u+.017*Math.sin(time*.4+i*2))*w;
    const radius=(.6+random(seed,i+1107)*2.2)*Math.min(w,h)/440;
    const a=.2+.58*(.5+.5*Math.sin(time*.6+i*2.13));
    ctx.beginPath();ctx.fillStyle="rgba("+p.glow+","+a.toFixed(3)+")";
    ctx.arc(x,y,Math.max(.6,radius),0,TAU);ctx.fill();
  }
  ctx.restore();
}
function petal(ctx:CanvasRenderingContext2D,cx:number,cy:number,r:number,width:number,angle:number,
  p:Palette,alpha:number){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
  const g=ctx.createLinearGradient(0,-r,0,r*.2);
  g.addColorStop(0,"rgba("+p.light+",.86)");
  g.addColorStop(.4,"rgba("+p.glow+",.38)");
  g.addColorStop(1,"rgba("+p.glow+",.05)");
  ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(0,0);
  ctx.bezierCurveTo(-width,-r*.38,-width*.46,-r*.82,0,-r);
  ctx.bezierCurveTo(width*.46,-r*.82,width,-r*.38,0,0);
  ctx.closePath();ctx.globalAlpha=alpha;ctx.fill();
  ctx.strokeStyle="rgba("+p.light+",.38)";ctx.lineWidth=Math.max(.8,r*.012);
  ctx.stroke();ctx.restore();
}
function mandala(ctx:CanvasRenderingContext2D,w:number,h,seed:number,time:number,p:Palette){
  const scale=Math.min(w,h),cx=w*.5,cy=h*.49;
  const layers=4;
  ctx.save();ctx.globalCompositeOperation="screen";
  for(let layer=layers-1;layer>=0;layer--){
    const count=8+2*Math.floor(random(seed,layer+9)*5);
    const r=scale*(.17+layer*.072);
    const petalLen=r*(.58+random(seed,layer+30)*.18);
    const speed=(layer%2?-1:1)*(.042+random(seed,layer+74)*.044);
    const angleBase=time*speed+random(seed,layer+60)*TAU;
    const alpha=.4+(layers-layer)*.09;
    for(let i=0;i<count;i++){
      const theta=angleBase+i*TAU/count;
      petal(ctx,cx+Math.cos(theta)*r*.40,cy+Math.sin(theta)*r*.40,petalLen,
        r*.37,theta+Math.PI/2,p,alpha);
    }
    ctx.strokeStyle="rgba("+p.glow+","+(0.26+layer*.09).toFixed(3)+")";
    ctx.lineWidth=1.4+layer*.27;
    ctx.beginPath();ctx.arc(cx,cy,r*.92,0,TAU);ctx.stroke();
  }
  for(let i=0;i<12;i++){
    const theta=i*TAU/12-time*.044+random(seed,141)*TAU;
    const r=scale*.33;
    const x=cx+Math.cos(theta)*r,y=cy+Math.sin(theta)*r;
    ctx.fillStyle="rgba("+p.light+",.8)";ctx.beginPath();
    ctx.arc(x,y,scale*.0035,0,TAU);ctx.fill();
  }
  const core=ctx.createRadialGradient(cx,cy,0,cx,cy,scale*.095);
  core.addColorStop(0,"rgba("+p.light+",.95)");
  core.addColorStop(.23,"rgba("+p.glow+",.65)");
  core.addColorStop(1,"rgba("+p.glow+",0)");
  ctx.fillStyle=core;ctx.fillRect(cx-scale*.1,cy-scale*.1,scale*.2,scale*.2);
  ctx.restore();
}
function light(ctx:CanvasRenderingContext2D,w:number,h,seed:number,time:number,p:Palette){
  const s=Math.min(w,h),cx=w*.5,cy=h*.47;
  ctx.save();ctx.globalCompositeOperation="screen";
  // Never a pre-existing MP4: every ribbon follows a parameterized path.
  for(let i=0;i<9;i++){
    const a=i*TAU/9+random(seed,i)*.36+time*(.065+random(seed,40+i)*.028);
    const r=s*(.22+random(seed,i+10)*.19);
    const startX=cx+Math.cos(a)*s*.10,startY=cy+Math.sin(a)*s*.10;
    const endX=cx+Math.cos(a+time*.09)*r,endY=cy+Math.sin(a+time*.09)*r;
    ctx.beginPath();ctx.moveTo(startX,startY);
    ctx.bezierCurveTo(cx+Math.cos(a+.7)*r*.56,cy+Math.sin(a+.7)*r*.46,
      cx+Math.cos(a-.5)*r*.70,cy+Math.sin(a-.5)*r*.65,endX,endY);
    ctx.strokeStyle="rgba("+p.glow+","+(0.17+random(seed,i+20)*.24).toFixed(3)+")";
    ctx.lineWidth=s*(.005+random(seed,i+60)*.018);
    ctx.lineCap="round";ctx.stroke();
  }
  for(let k=0;k<4;k++){
    const orbit=s*(.10+k*.07);
    const tilt=Math.sin(time*.2+random(seed,k+80)*TAU)*.12;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(tilt+time*(k%2?-.025:.03));
    ctx.scale(1,.78+.06*k);
    ctx.strokeStyle="rgba("+p.light+","+(0.46-k*.07).toFixed(3)+")";
    ctx.lineWidth=Math.max(1,s*.003);
    ctx.beginPath();ctx.arc(0,0,orbit,0,TAU);ctx.stroke();
    ctx.restore();
  }
  const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,s*.22);
  halo.addColorStop(0,"rgba("+p.light+",.94)");
  halo.addColorStop(.20,"rgba("+p.glow+",.66)");
  halo.addColorStop(.62,"rgba("+p.glow+",.12)");
  halo.addColorStop(1,"rgba("+p.glow+",0)");
  ctx.fillStyle=halo;ctx.fillRect(cx-s*.24,cy-s*.24,s*.48,s*.48);
  ctx.restore();
}
function lotus(ctx:CanvasRenderingContext2D,w:number,h,seed:number,time:number,p:Palette){
  const s=Math.min(w,h),cx=w*.5,cy=h*.59;
  ctx.save();
  const water=ctx.createLinearGradient(0,h*.55,0,h);
  water.addColorStop(0,"rgba("+p.glow+",.02)");
  water.addColorStop(1,"rgba("+p.glow+",.25)");
  ctx.fillStyle=water;ctx.fillRect(0,h*.55,w,h*.45);
  for(let wave=0;wave<12;wave++){
    const ry=cy+s*.095+wave*s*.018;
    const r=s*(.15+wave*.038);
    ctx.strokeStyle="rgba("+p.glow+","+(0.24*(1-wave/13)).toFixed(3)+")";
    ctx.lineWidth=Math.max(.6,s*.002);
    ctx.beginPath();ctx.ellipse(cx,ry,r*(1+Math.sin(time*.43+wave*.7)*.025),
      s*.017+wave*s*.001,0,0,TAU);ctx.stroke();
  }
  ctx.globalCompositeOperation="screen";
  // Distinct seed-dependent leaf geometry with actual blooming, not a still PNG.
  const opening=.58+.21*(1+Math.sin(time*.29+random(seed,30)*TAU))*.5;
  for(let layer=3;layer>=0;layer--){
    const count=5+layer*2;
    for(let i=0;i<count;i++){
      const offset=(i-(count-1)/2)/(count/2);
      const angle=offset*(.46+opening*.52)+Math.sin(time*.15+i)*.015;
      const radius=s*(.18+layer*.015)*(1-.15*Math.abs(offset));
      const x=cx+offset*s*.043,y=cy+Math.abs(offset)*s*.026;
      petal(ctx,x,y,radius,s*(.052+.016*layer),angle,p,.55+(.09*(3-layer)));
    }
  }
  const center=ctx.createRadialGradient(cx,cy-s*.04,0,cx,cy-s*.04,s*.10);
  center.addColorStop(0,"rgba("+p.light+",.88)");
  center.addColorStop(1,"rgba("+p.glow+",0)");
  ctx.fillStyle=center;ctx.fillRect(cx-s*.11,cy-s*.15,s*.22,s*.22);
  ctx.restore();
}
function portrait(ctx:CanvasRenderingContext2D,w:number,h,image:HTMLImageElement,p:Palette){
  if(!image.naturalWidth||!image.naturalHeight)return;
  const s=Math.min(w,h)*.29,cx=w*.5,cy=h*.47;
  const ratio=Math.max(s/image.naturalWidth,s/image.naturalHeight);
  const drawnW=image.naturalWidth*ratio,drawnH=image.naturalHeight*ratio;
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,s*.5,0,TAU);ctx.clip();
  ctx.drawImage(image,cx-drawnW/2,cy-drawnH/2,drawnW,drawnH);
  ctx.restore();
  ctx.strokeStyle="rgba("+p.light+",.77)";
  ctx.lineWidth=Math.max(2,s*.018);ctx.beginPath();ctx.arc(cx,cy,s*.52,0,TAU);ctx.stroke();
}
/** Identical drawing API for live preview and downloaded MediaRecorder frames. */
export function paintFreeVideoFrame(
  ctx:CanvasRenderingContext2D,plan:FreeVideoPlan,time:number,
  permittedLocalPortrait:HTMLImageElement|null=null,
):void{
  if(!plan||!Number.isInteger(plan.seed)||!PALETTES[plan.palette]||
    !["mandala","light","lotus"].includes(plan.family))return;
  const w=ctx.canvas.width,h=ctx.canvas.height;
  if(!w||!h)return;
  const p=PALETTES[plan.palette];
  const multiplier=plan.motion==="calm"?.48:plan.motion==="dynamic"?1.55:1;
  const t=Math.max(0,Number.isFinite(time)?time:0)*multiplier;
  ctx.save();
  background(ctx,w,h,p,t);
  dust(ctx,w,h,plan.seed,t,p);
  if(plan.family==="mandala")mandala(ctx,w,h,plan.seed,t,p);
  else if(plan.family==="lotus")lotus(ctx,w,h,plan.seed,t,p);
  else light(ctx,w,h,plan.seed,t,p);
  if(permittedLocalPortrait)portrait(ctx,w,h,permittedLocalPortrait,p);
  ctx.restore();
}
