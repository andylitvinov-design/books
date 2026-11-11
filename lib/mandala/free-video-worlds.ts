/**
 * Five distinct original procedural worlds, painted locally on the same Canvas
 * as the Free preview and MediaRecorder export. No media downloads or network.
 * Kept separate from the original three families to preserve their geometry.
 */
type PaintPalette = {back:string;deep:string;glow:string;light:string;stroke:string};
export type ExtendedWorld = "temple"|"tree"|"cosmic"|"light_tunnel"|"flowering_garden";
const TAU=Math.PI*2;
function rand(seed:number,index:number):number{
  let n=(seed+Math.imul(index+1,0x9e3779b1))|0;
  n=Math.imul(n^(n>>>16),0x85ebca6b);
  n=Math.imul(n^(n>>>13),0xc2b2ae35);
  return ((n^(n>>>16))>>>0)/4294967296;
}
function rgba(rgb:string,alpha:number):string{
  return "rgba("+rgb+","+Math.max(0,Math.min(1,alpha)).toFixed(3)+")";
}
function temple(ctx:CanvasRenderingContext2D,w:number,h:number,seed:number,t:number,p:PaintPalette){
  const s=Math.min(w,h),cx=w*(.5+Math.sin(t*.12)*.012),horizon=h*.70;
  ctx.save();
  const gate=ctx.createRadialGradient(cx,h*.44,0,cx,h*.44,s*.50);
  gate.addColorStop(0,rgba(p.light,.72));gate.addColorStop(.28,rgba(p.glow,.34));
  gate.addColorStop(1,rgba(p.glow,0));ctx.fillStyle=gate;
  ctx.fillRect(0,0,w,horizon);
  const floor=ctx.createLinearGradient(0,horizon,0,h);
  floor.addColorStop(0,rgba(p.glow,.12));floor.addColorStop(1,rgba(p.glow,.43));
  ctx.fillStyle=floor;ctx.fillRect(0,horizon,w,h-horizon);
  // Perspective aisles visually move toward an illuminated vaulted sanctuary.
  for(let i=-5;i<=5;i++){
    ctx.beginPath();ctx.moveTo(cx+i*s*.09,h);ctx.lineTo(cx+i*s*.006,horizon);
    ctx.strokeStyle=rgba(p.light,.11+.04*(i===0?1:0));ctx.lineWidth=Math.max(1,s*.002);ctx.stroke();
  }
  for(let d=5;d>=0;d--){
    const depth=(5-d)/5,phase=t*.12+rand(seed,d)*.08;
    const r=s*(.17+depth*.35),x=cx+Math.sin(phase)*s*.008,base=horizon+depth*s*.26;
    ctx.beginPath();ctx.moveTo(x-r,base);ctx.lineTo(x-r,h*.40-depth*s*.14);
    ctx.bezierCurveTo(x-r,h*.16-depth*s*.08,x+r,h*.16-depth*s*.08,x+r,h*.40-depth*s*.14);
    ctx.lineTo(x+r,base);
    ctx.strokeStyle=rgba(p.light,.18+depth*.43);
    ctx.lineWidth=Math.max(1,s*(.003+depth*.007));ctx.stroke();
    ctx.fillStyle=rgba(p.glow,.07+depth*.13);
    ctx.fillRect(x-r-s*.018,h*.37-depth*s*.08,s*.03,base-h*.37+depth*s*.08);
    ctx.fillRect(x+r-s*.012,h*.37-depth*s*.08,s*.03,base-h*.37+depth*s*.08);
  }
  ctx.restore();
}
function tree(ctx:CanvasRenderingContext2D,w:number,h:number,seed:number,t:number,p:PaintPalette){
  const s=Math.min(w,h),cx=w*.5,ground=h*.85,wind=Math.sin(t*.45+rand(seed,1))*s*.017;
  ctx.save();
  const earth=ctx.createLinearGradient(0,h*.74,0,h);
  earth.addColorStop(0,rgba(p.glow,0));earth.addColorStop(1,rgba(p.glow,.22));
  ctx.fillStyle=earth;ctx.fillRect(0,h*.74,w,h*.26);
  ctx.lineCap="round";ctx.strokeStyle=p.stroke;ctx.lineWidth=s*.035;
  ctx.beginPath();ctx.moveTo(cx,ground);ctx.bezierCurveTo(cx-s*.014,h*.68,cx+wind*.35,h*.48,cx+wind,h*.33);ctx.stroke();
  for(let b=0;b<13;b++){
    const side=b%2===0?1:-1,level=b/13;
    const y=ground-s*(.10+level*.42),x=cx+wind*(.6+level*.3);
    const spread=side*s*(.14+rand(seed,b+50)*.17);
    ctx.beginPath();ctx.moveTo(x,y+s*.055);
    ctx.quadraticCurveTo(x+spread*.60,y-s*.035,x+spread,y-s*(.09+rand(seed,b+90)*.07));
    ctx.strokeStyle=rgba(p.light,.36+level*.35);
    ctx.lineWidth=Math.max(1.1,s*(.010-level*.005));ctx.stroke();
  }
  for(let i=0;i<92;i++){
    const a=rand(seed,i+110)*TAU,r=Math.sqrt(rand(seed,i+250));
    const px=cx+Math.cos(a)*r*s*.37,py=h*.38+Math.sin(a)*r*s*.26;
    const flutter=Math.sin(t*(.37+rand(seed,i+370)*.3)+i)*s*.006;
    const radius=s*(.006+rand(seed,i+470)*.012);
    ctx.beginPath();ctx.ellipse(px+wind+flutter,py+flutter*.5,radius*1.2,radius*.72,a+t*.035,0,TAU);
    ctx.fillStyle=rgba(i%3===0?p.light:p.glow,.28+rand(seed,i+580)*.42);ctx.fill();
  }
  ctx.restore();
}
function cosmic(ctx:CanvasRenderingContext2D,w:number,h:number,seed:number,t:number,p:PaintPalette){
  const s=Math.min(w,h),cx=w*.49,cy=h*.46;
  ctx.save();ctx.globalCompositeOperation="screen";
  for(let cloud=0;cloud<5;cloud++){
    const a=rand(seed,cloud+30)*TAU,r=s*(.08+rand(seed,cloud+60)*.31);
    const x=cx+Math.cos(a)*r+Math.sin(t*.09+cloud)*s*.02;
    const y=cy+Math.sin(a)*r*.7;
    const rad=s*(.18+rand(seed,cloud+90)*.22);
    const g=ctx.createRadialGradient(x,y,0,x,y,rad);
    g.addColorStop(0,rgba(cloud%2?p.light:p.glow,.23));
    g.addColorStop(1,rgba(p.glow,0));ctx.fillStyle=g;ctx.fillRect(x-rad,y-rad,2*rad,2*rad);
  }
  for(let i=0;i<180;i++){
    const depth=.2+rand(seed,i+170),parallax=(1.2-depth)*t*.0018;
    const x=(((rand(seed,i+320)+parallax)%1)+1)%1*w;
    const y=rand(seed,i+480)*h;
    const r=s*(.0008+depth*.0022);
    ctx.beginPath();ctx.arc(x,y,Math.max(.4,r),0,TAU);
    ctx.fillStyle=rgba(p.light,.27+depth*.50);ctx.fill();
  }
  const orbit=s*.21,angle=t*.13+rand(seed,5)*TAU;
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-.33);
  ctx.beginPath();ctx.ellipse(0,0,orbit*1.9,orbit*.56,0,0,TAU);
  ctx.strokeStyle=rgba(p.light,.3);ctx.lineWidth=Math.max(.7,s*.0018);ctx.stroke();
  ctx.restore();
  ctx.beginPath();ctx.arc(cx+Math.cos(angle)*orbit*1.9,cy+Math.sin(angle)*orbit*.56,s*.017,0,TAU);
  ctx.fillStyle=rgba(p.light,.78);ctx.fill();ctx.restore();
}
function lightTunnel(ctx:CanvasRenderingContext2D,w:number,h:number,seed:number,t:number,p:PaintPalette){
  const s=Math.min(w,h),cx=w*(.5+Math.sin(t*.12)*.012),cy=h*.48;
  ctx.save();ctx.globalCompositeOperation="screen";
  for(let i=0;i<18;i++){
    const a=i*TAU/18+rand(seed,i+100)*.025;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*s*.035,cy+Math.sin(a)*s*.035);
    ctx.lineTo(cx+Math.cos(a)*s*.95,cy+Math.sin(a)*s*.95);
    ctx.strokeStyle=rgba(p.glow,.09+rand(seed,i+220)*.16);
    ctx.lineWidth=s*(.0015+rand(seed,i+280)*.002);ctx.stroke();
  }
  for(let i=9;i>=0;i--){
    const depth=(((i/10+t*.105)%1)+1)%1;
    const radius=s*(.05+depth*.70),ry=radius*.76;
    ctx.beginPath();ctx.ellipse(cx,cy,radius,ry,.045*Math.sin(t*.14+i),0,TAU);
    ctx.strokeStyle=rgba(p.light,.06+depth*.48);
    ctx.lineWidth=Math.max(.6,s*(.0014+depth*.004));ctx.stroke();
  }
  const core=ctx.createRadialGradient(cx,cy,0,cx,cy,s*.16);
  core.addColorStop(0,rgba(p.light,.72));core.addColorStop(.25,rgba(p.glow,.42));
  core.addColorStop(1,rgba(p.glow,0));ctx.fillStyle=core;
  ctx.fillRect(cx-s*.16,cy-s*.16,s*.32,s*.32);ctx.restore();
}
function floweringGarden(ctx:CanvasRenderingContext2D,w:number,h:number,seed:number,t:number,p:PaintPalette){
  const s=Math.min(w,h),ground=h*.84;
  ctx.save();
  const meadow=ctx.createLinearGradient(0,h*.50,0,h);
  meadow.addColorStop(0,rgba(p.glow,0));meadow.addColorStop(1,rgba(p.glow,.36));
  ctx.fillStyle=meadow;ctx.fillRect(0,h*.50,w,h*.50);
  for(let k=0;k<34;k++){
    const depth=.35+rand(seed,k+8)*.65;
    const x=rand(seed,k+80)*w,y=ground+(rand(seed,k+130)-.5)*s*.18;
    const height=s*depth*(.10+rand(seed,k+180)*.16);
    const sway=Math.sin(t*(.22+rand(seed,k+210)*.24)+k)*s*.012*depth;
    const headX=x+sway,headY=y-height;
    ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+sway*.4,y-height*.6,headX,headY);
    ctx.strokeStyle=rgba(p.light,.20+depth*.34);
    ctx.lineWidth=Math.max(.8,s*.0025*depth);ctx.stroke();
    const petals=5+Math.floor(rand(seed,k+260)*3);
    for(let i=0;i<petals;i++){
      const theta=i*TAU/petals+t*.035;
      const px=headX+Math.cos(theta)*s*.011*depth;
      const py=headY+Math.sin(theta)*s*.011*depth;
      ctx.beginPath();ctx.ellipse(px,py,s*.012*depth,s*.006*depth,theta,0,TAU);
      ctx.fillStyle=rgba(k%3===0?p.light:p.glow,.38+depth*.46);ctx.fill();
    }
    ctx.beginPath();ctx.arc(headX,headY,s*.005*depth,0,TAU);
    ctx.fillStyle=rgba(p.light,.85);ctx.fill();
  }
  ctx.restore();
}
export function paintExtendedWorld(
  ctx:CanvasRenderingContext2D,w:number,h:number,seed:number,time:number,
  palette:PaintPalette,family:ExtendedWorld,
):void{
  if(family==="temple")temple(ctx,w,h,seed,time,palette);
  else if(family==="tree")tree(ctx,w,h,seed,time,palette);
  else if(family==="cosmic")cosmic(ctx,w,h,seed,time,palette);
  else if(family==="light_tunnel")lightTunnel(ctx,w,h,seed,time,palette);
  else floweringGarden(ctx,w,h,seed,time,palette);
}
