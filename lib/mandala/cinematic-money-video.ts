/**
 * First-party cinematic money-flow animation, not generative AI.
 * Real motion is encoded into a local MP4/WebM by the existing MediaRecorder
 * studio; the visitor's portrait is never uploaded or stored.
 *
 * Art direction: deep atmospheric scenery, volumetric light, textured metal
 * coins with depth, parallax and foreground/background occlusion. The original
 * portrait remains a still photograph (no synthetic identity motion).
 */
import type { MoneySceneId } from "./money-flow-effects";
import {ovalPortraitCrop,paintOvalPortrait} from "./portrait-oval";

export type CinematicAspect = "portrait" | "square" | "landscape";
type Ctx = CanvasRenderingContext2D;
type Palette = readonly [string, string, string, string];

const LOOK: Record<MoneySceneId, Palette> = {
  "golden-rain": ["#21130f", "#795024", "#f5bf52", "#fff0b8"],
  "cosmic-flow": ["#070c29", "#3d2668", "#f7a23b", "#e8c0ff"],
  "abundance-tree": ["#3a2418", "#976137", "#ffd06b", "#f5dfae"],
  "opportunity-falls": ["#193338", "#3a6050", "#f7c454", "#d6fff5"],
  "money-magnet": ["#211626", "#634225", "#ffbc42", "#ffefb5"],
  "path-to-goals": ["#2b2548", "#aa6941", "#ffda7a", "#ffedc7"],
  partners: ["#191b36", "#6e4968", "#eeb766", "#ffe1a0"],
  "infinite-flow": ["#0b1430", "#4a315f", "#f9aa38", "#d4e4ff"],
  "golden-shield": ["#151f2f", "#584328", "#ffd273", "#f9efd5"],
  "abundance-circle": ["#18332b", "#6c5633", "#f6c864", "#faf1c9"],
  "life-gifts": ["#403047", "#b36d69", "#ffcf67", "#fff3da"],
  "wealth-sunrise": ["#2e2f42", "#cc8b4e", "#ffcc76", "#fff4c7"],
  "golden-harvest": ["#263a28", "#bf9341", "#f8db8a", "#fff7ce"],
  "radiant-portal": ["#5b2d1d", "#dfb77c", "#ffea9f", "#fff6d5"],
  "prosperity-coast": ["#233f45", "#9abf9a", "#f9dc90", "#fdf6e1"],
  dreams: ["#254b60", "#c78662", "#f9d57f", "#ebffff"],
};

const TAU = Math.PI * 2;
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
};
const mod = (n: number, m: number) => ((n % m) + m) % m;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

let metallicCoin: HTMLCanvasElement | null = null;

function coinTexture(): HTMLCanvasElement {
  if (metallicCoin) return metallicCoin;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 144;
  const c = canvas.getContext("2d");
  if (!c) return canvas;
  const centre = 72;
  // Three concentric embossed rims and directional highlights evoke metal,
  // not flat circles or emoji.
  const outer = c.createRadialGradient(48, 44, 9, 72, 72, 70);
  outer.addColorStop(0, "#fff9d0");
  outer.addColorStop(.32, "#ffdd6a");
  outer.addColorStop(.61, "#b57727");
  outer.addColorStop(.81, "#fbe09b");
  outer.addColorStop(1, "#6b3b18");
  c.fillStyle = outer;
  c.beginPath(); c.arc(centre, centre, 68, 0, TAU); c.fill();
  c.lineWidth = 7; c.strokeStyle = "#fff4b4"; c.stroke();
  c.beginPath(); c.arc(centre, centre, 57, 0, TAU);
  c.lineWidth = 5; c.strokeStyle = "#81501d"; c.stroke();
  const inner = c.createLinearGradient(20, 20, 118, 128);
  inner.addColorStop(0, "#fff6be");
  inner.addColorStop(.26, "#c18c32");
  inner.addColorStop(.56, "#f9cb5a");
  inner.addColorStop(1, "#8f5621");
  c.fillStyle = inner;
  c.beginPath(); c.arc(centre, centre, 50, 0, TAU); c.fill();
  c.beginPath(); c.arc(centre, centre, 44, 0, TAU);
  c.lineWidth = 2.5; c.strokeStyle = "rgba(255,249,205,.88)"; c.stroke();
  for (let i = 0; i < 28; i++) {
    const a = i / 28 * TAU;
    c.beginPath();
    c.arc(72 + Math.cos(a)*62, 72 + Math.sin(a)*62, 1.2, 0, TAU);
    c.fillStyle = i%3 ? "#f4d67d" : "#714b23";
    c.fill();
  }
  c.fillStyle = "#754516";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = "bold 64px Georgia,serif";
  c.fillText("$", 72.5, 75);
  c.fillStyle = "rgba(255,245,172,.9)";
  c.font = "bold 62px Georgia,serif";
  c.fillText("$", 70.5, 72);
  metallicCoin = canvas;
  return canvas;
}

function coin(ctx: Ctx, x: number, y: number, radius: number, angle: number, alpha = 1) {
  if (radius < 1.7 || alpha <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle * .2);
  const perspective = .14 + .86 * Math.abs(Math.cos(angle));
  ctx.scale(perspective, .76);
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.shadowColor = "rgba(255,183,44,.76)";
  ctx.shadowBlur = radius * .7;
  ctx.drawImage(coinTexture(), -radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

function light(ctx: Ctx, x: number, y: number, r: number, hue: string, power: number) {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
  glow.addColorStop(0, "rgba(" + hue + "," + power + ")");
  glow.addColorStop(.2, "rgba(" + hue + "," + power * .24 + ")");
  glow.addColorStop(1, "rgba(" + hue + ",0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x-r, y-r, r*2, r*2);
}

function streak(ctx: Ctx, points: number[], weight: number, opacity: number, bloom = 0) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,216,119," + opacity + ")";
  ctx.lineWidth = weight;
  ctx.shadowBlur = bloom;
  ctx.shadowColor = "#ffc057";
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i=2; i<points.length; i+=2) ctx.lineTo(points[i], points[i+1]);
  ctx.stroke();
  ctx.restore();
}

function glint(ctx: Ctx, x: number, y: number, radius: number, alpha = .65) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,239,171," + alpha + ")";
  ctx.lineWidth = Math.max(.8, radius*.13);
  ctx.shadowBlur = radius*1.3;
  ctx.shadowColor = "#ffe2a0";
  ctx.beginPath();
  ctx.moveTo(x-radius*2,y);ctx.lineTo(x+radius*2,y);
  ctx.moveTo(x,y-radius*2);ctx.lineTo(x,y+radius*2);
  ctx.stroke();
  ctx.restore();
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, angle: number, alpha: number, width: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,207,116," + alpha + ")";
  ctx.shadowColor="#ffc15c";
  ctx.shadowBlur=10;
  ctx.lineWidth=width;
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,angle,0,TAU);ctx.stroke();
  ctx.restore();
}

function mountain(ctx: Ctx, w:number,h:number, level:number, color:string, phase:number) {
  ctx.beginPath();ctx.moveTo(0,h);
  ctx.lineTo(0,level);
  for(let i=0;i<=16;i++){
    const x=i/16*w;
    ctx.lineTo(x,level + Math.sin(i*1.7+phase)*h*.035 + Math.sin(i*.59+phase)*h*.045);
  }
  ctx.lineTo(w,h);ctx.closePath();ctx.fillStyle=color;ctx.fill();
}

function backdrop(ctx:Ctx,scene:MoneySceneId,t:number,w:number,h:number){
  const [deep,mid]=LOOK[scene];
  const sky=ctx.createLinearGradient(0,0,w,h);
  sky.addColorStop(0,deep);sky.addColorStop(.55,mid);sky.addColorStop(1,deep);
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
  light(ctx,w*.50,h*.35,w*.78,scene==="cosmic-flow"||scene==="infinite-flow"?"172,87,231":"248,177,66",.31);
  light(ctx,w*.83,h*.70,w*.70,"245,175,60",.19);
  if(["cosmic-flow","infinite-flow"].includes(scene)) {
    for(let i=0;i<6;i++){
      const a=t*.028+i*.17;
      ellipse(ctx,w*.50,h*.40,w*(.25+i*.064),h*(.11+i*.028),a,.18+i*.043,1.6+i*.25);
    }
    light(ctx,w*.49,h*.34,w*.24,"254,241,189",.7);
    light(ctx,w*.28,h*.25,w*.28,"94,105,255",.16);
  }
  if(["abundance-tree","path-to-goals","opportunity-falls","dreams"].includes(scene)){
    mountain(ctx,w,h,h*.67,"rgba(22,43,42,.48)",.7);
    mountain(ctx,w,h,h*.77,"rgba(32,47,30,.62)",1.7);
  }
  // Hundreds of minuscule stars and atmospheric bokeh; fixed seeds prevent
  // distracting frame-to-frame flicker while the field drifts slowly.
  for(let i=0;i<115;i++){
    const x=w*rnd(i+19);
    const y=mod(h*rnd(i+339)+t*(i%3-1)*1.3,h);
    const r=(i%11===0?3.1:.75)+(i%4)*.24;
    const pulse=.36+.34*Math.sin(t*.7+i);
    ctx.beginPath();ctx.arc(x,y,r,0,TAU);
    ctx.fillStyle=i%8===0?"rgba(255,237,175,"+pulse+")":"rgba(255,218,153,"+(pulse*.48)+")";
    ctx.fill();
    if(i%23===0)glint(ctx,x,y,2.4,pulse);
  }
  if(scene==="golden-rain"){
    for(let i=0;i<13;i++){
      const x=w*(i+.5)/13;
      const beam=ctx.createLinearGradient(x-14,0,x+14,h);
      beam.addColorStop(0,"rgba(255,217,104,0)");
      beam.addColorStop(.36,"rgba(255,198,77,.13)");
      beam.addColorStop(1,"rgba(255,230,169,0)");
      ctx.fillStyle=beam;ctx.fillRect(x-13,0,26,h);
    }
    light(ctx,w*.5,h*.15,w*.55,"255,218,138",.4);
  }
  if(scene==="abundance-tree"){
    // Branching canopy behind the visitor and hundreds of metallic leaves.
    ctx.save();ctx.strokeStyle="#6a3f18";ctx.lineCap="round";
    ctx.lineWidth=w*.074;
    ctx.beginPath();ctx.moveTo(w*.50,h*.99);ctx.bezierCurveTo(w*.44,h*.72,w*.51,h*.54,w*.5,h*.30);ctx.stroke();
    for(const side of [-1,1])for(let i=0;i<8;i++){
      const x=w*.5,y=h*(.36+i*.055);
      ctx.lineWidth=Math.max(2,w*(.026-i*.0014));
      ctx.beginPath();ctx.moveTo(x,y+.08*h);ctx.quadraticCurveTo(x+side*w*.27,y-h*.09,x+side*w*(.25+rnd(i)*.19),y-h*.2);ctx.stroke();
    }
    ctx.restore();
    for(let i=0;i<155;i++){
      const a=rnd(i+418)*TAU;
      const radius=Math.sqrt(rnd(i+608));
      const x=w*.50+Math.cos(a)*w*.47*radius;
      const y=h*.30+Math.sin(a)*h*.24*radius;
      ctx.save();ctx.translate(x+Math.sin(t*.65+i)*2.5,y);
      ctx.rotate(a+Math.sin(t*.35+i)*.4);
      const size=2+rnd(i+801)*6;
      ctx.fillStyle=i%3===0?"#fff0ad":i%3===1?"#e9b74a":"#a16b27";
      ctx.beginPath();ctx.ellipse(0,0,size*1.7,size*.7,0,0,TAU);ctx.fill();
      ctx.restore();
    }
  }
  if(scene==="opportunity-falls"){
    for(const side of [-1,1]){
      const x=w*(side<0?.15:.84);
      mountain(ctx,w,h,h*.61,side<0?"rgba(17,41,43,.65)":"rgba(20,55,47,.67)",side);
      for(let i=0;i<8;i++){
        const xx=x+(i-4)*w*.02;
        streak(ctx,[xx,-40,xx+Math.sin(t*.2+i)*8,h*.55,xx+Math.sin(t*.31+i)*13,h*.94],3+(i%3),.23+i%3*.11,7);
      }
    }
  }
  if(scene==="path-to-goals"){
    const vanX=w*.51,vanY=h*.30;
    for(let i=0;i<18;i++){
      const f=i/18;
      const y=lerp(vanY,h*1.05,f);
      const bend=Math.sin(f*8+t*.08)*w*f*.18;
      const x=vanX+bend;
      if(i>0){
        ctx.strokeStyle="rgba(252,204,103,"+(.15+.35*f)+")";
        ctx.lineWidth=2+f*24;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.11*f,y+12);ctx.stroke();
      }
    }
    light(ctx,vanX,vanY,w*.25,"255,231,155",.57);
    ctx.fillStyle="#ffe0a0";ctx.fillRect(vanX-19,vanY-39,38,39);
    ctx.fillRect(vanX-27,vanY-49,16,48);ctx.fillRect(vanX+12,vanY-58,14,57);
  }
  if(scene==="partners"){
    for(let i=0;i<15;i++){
      const x=w*(i/15),height=h*(.25+rnd(i+277)*.26);
      ctx.fillStyle=i%2===0?"rgba(31,39,57,.84)":"rgba(67,52,68,.86)";
      ctx.fillRect(x,h*.78-height,w*.075,height);
      for(let floor=0;floor<12;floor++){
        if(rnd(i*24+floor)> .34){
          ctx.fillStyle="rgba(254,209,121,"+(.33+.45*rnd(i*8+floor))+")";
          ctx.fillRect(x+4,h*.78-height+9+floor*height/13,3,4);
          ctx.fillRect(x+12,h*.78-height+9+floor*height/13,3,4);
        }
      }
    }
    for(let i=0;i<12;i++){
      const x=w*rnd(i+62),y=h*(.41+.28*rnd(i+83));
      const x2=w*rnd(i+72),y2=h*(.43+.27*rnd(i+113));
      streak(ctx,[x,y,x2,y2],1.3,.32);
      glint(ctx,x,y,3,.56);
    }
  }
  if(scene==="dreams"){
    // Abstract aspirational destinations, not fabricated photos of outcomes.
    for(let i=0;i<5;i++){
      const x=w*(.16+.17*i), y=h*(.22+.055*Math.sin(i*3.1+t*.21));
      light(ctx,x,y,w*.13,"255,234,165",.19);
      ellipse(ctx,x,y,w*.078,w*.09,0,.44,2);
      ctx.fillStyle="#ffecb1";
      ctx.font="bold "+(w*.038)+"px Georgia,serif";
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(["✦","⌂","✧","◇","☆"][i],x,y);
    }
  }
  if(scene==="life-gifts"){
    for(let i=0;i<9;i++){
      const x=w*(.1+.8*rnd(i+84));
      const y=mod(h*(.2+.8*rnd(i+69))-t*(9+i*3),h+70);
      const size=12+rnd(i+300)*21;
      ctx.fillStyle="#d29b38";
      ctx.fillRect(x-size/2,y-size/2,size,size);
      ctx.strokeStyle="#ffecab";ctx.lineWidth=3;
      ctx.strokeRect(x-size/2,y-size/2,size,size);
      streak(ctx,[x,y-size/2,x,y+size/2],2,.9);
      streak(ctx,[x-size/2,y,x+size/2,y],2,.85);
    }
  }
  if(["golden-shield","abundance-circle"].includes(scene)){
    const rings=scene==="golden-shield"?4:7;
    for(let i=0;i<rings;i++){
      ellipse(ctx,w*.50,h*.49,w*(.26+i*.044),w*(.28+i*.047),
        Math.sin(t*.15+i)*.05,.55-i*.052,2.5);
    }
  }
  if(scene==="infinite-flow"){
    for(let q=0;q<3;q++){
      const points:number[]=[];
      for(let i=0;i<=130;i++){
        const a=i/130*TAU;
        points.push(w*.5+Math.sin(a)*w*(.34+q*.047),h*.49+Math.sin(a*2)*h*(.115+q*.012));
      }
      streak(ctx,points,2.4+q*1.1,.42+q*.08,14);
    }
  }
  // Translucent cinematic bars of flare, deliberately subtle.
  for(let i=0;i<5;i++){
    const x=w*rnd(i+950), y=h*rnd(i+880);
    if(i%2===0)light(ctx,x,y,w*.2,"255,219,138",.13);
  }
}

function portrait(ctx:Ctx,image:HTMLImageElement|null,w:number,h:number,t:number){
  const {cx,cy,rx,ry}=ovalPortraitCrop(600,800,w,h);
  light(ctx,cx,cy,w*.48,"255,207,119",.38+.06*Math.sin(t*.2));
  if(paintOvalPortrait(ctx,image,w,h,"gold"))return;
  // When no photo is supplied, do not invent a user or render stock faces.
  ellipse(ctx,cx,cy,rx,ry,0,.66,3);
  light(ctx,cx,cy,rx*1.5,"255,231,164",.30);
  glint(ctx,cx,cy,Math.max(4,rx*.20),.88);
}

function movingCoins(ctx:Ctx,scene:MoneySceneId,t:number,w:number,h:number,front:boolean){
  const isRain=scene==="golden-rain"||scene==="opportunity-falls";
  const count=isRain?78:scene==="abundance-tree"?44:scene==="infinite-flow"?65:56;
  for(let i=0;i<count;i++){
    if((i%4===0)!==!front)continue;
    const depth=.35+rnd(i+450)*1.25;
    let x=w*rnd(i+22),y=h*rnd(i+525);
    const speed=37+depth*66;
    if(isRain){
      x=w*(rnd(i+22)+Math.sin(t*.4+i)*.02);
      y=mod(h*rnd(i+525)+t*speed,h+100)-50;
    }else if(scene==="money-magnet"){
      const side=i%2===0?-1:1;
      const p=mod(t*.13+rnd(i+31),1);
      x=w*(.5+side*(.65-p*.48));
      y=h*(.60+.19*rnd(i+45))+Math.sin(t*1.6+i)*10;
    }else if(scene==="infinite-flow"){
      const a=rnd(i+66)*TAU+t*(.25+depth*.19);
      x=w*(.5+Math.sin(a)*.47);
      y=h*(.52+Math.sin(2*a)*.21);
    }else if(scene==="cosmic-flow"||scene==="abundance-circle"){
      const a=rnd(i+66)*TAU+t*(.11+depth*.11);
      const orbit=.25+rnd(i+91)*.25;
      x=w*(.5+Math.cos(a)*orbit);
      y=h*(.50+Math.sin(a)*orbit*.62);
    }else if(scene==="path-to-goals"){
      const p=mod(t*.072+rnd(i+39),1);
      y=h*(.35+p*.65);
      x=w*(.50+Math.sin(p*6+t*.09)*p*.42);
    }else{
      const a=rnd(i+40)*TAU+t*(.12+depth*.10);
      x=w*(.5+Math.cos(a)*(.28+rnd(i+111)*.26));
      y=h*(.49+Math.sin(a)*(.16+rnd(i+113)*.22));
    }
    // Foreground coins can fly in front of the body, but not obscure the
    // approximate central face area. This is a compositing constraint, not
    // actual face detection or transformation.
    if(front&&Math.abs(x-w*.5)<w*.24 && y>h*.27&&y<h*.52)continue;
    const radius=2.5+depth*(front?14:7);
    const spin=t*(.72+depth*.22)+i;
    const alpha=front?.91:.54;
    if(i%3===0)streak(ctx,[x-5*depth,y-5*depth,x-18*depth,y-28*depth],1.5,.25);
    coin(ctx,x,y,radius,spin,alpha);
    if(front&&i%9===0)glint(ctx,x+radius*.2,y-radius*.2,radius*.36,.64);
  }
}

function lastLight(ctx:Ctx,scene:MoneySceneId,t:number,w:number,h:number,title:string){
  // Photographic flare and three depth-separated particle planes create an
  // animated frame, not a static collage with a play icon.
  const flareY=h*(scene==="cosmic-flow"?.33:.72);
  light(ctx,w*.5,flareY,w*.53,"255,209,112",.18+.04*Math.sin(t*1.3));
  for(let i=0;i<33;i++){
    const x=mod(w*rnd(i+601)+Math.sin(t*.3+i)*w*.033,w);
    const y=mod(h*rnd(i+870)-t*(5+rnd(i+777)*9),h);
    if(i%5===0)glint(ctx,x,y,1.6+rnd(i)*3,.42);
  }
  const bottom=ctx.createLinearGradient(0,h*.75,0,h);
  bottom.addColorStop(0,"rgba(6,13,18,0)");
  bottom.addColorStop(1,"rgba(8,15,18,.75)");
  ctx.fillStyle=bottom;ctx.fillRect(0,h*.75,w,h*.25);
  const fontSize=Math.max(12,Math.min(28,w*.041));
  ctx.font="600 "+fontSize+"px Georgia,serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.shadowBlur=10;ctx.shadowColor="#37230d";
  ctx.fillStyle="#fff1d3";
  ctx.fillText(title,w*.5,h*.86,w*.84);
  ctx.shadowBlur=0;
  ctx.font="600 "+Math.max(10,w*.021)+"px Arial,sans-serif";
  ctx.fillStyle="rgba(255,225,173,.82)";
  ctx.fillText("H O L I S T I C   H O U S E",w*.5,h*.095,w*.92);
}

export function paintCinematicMoneyFrame(
  ctx:Ctx, image:HTMLImageElement|null, scene:MoneySceneId, seconds:number,
  aspect:CinematicAspect, title:string,
):void {
  const w=ctx.canvas.width,h=ctx.canvas.height;
  const t=Math.max(0,seconds);
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,w,h);
  backdrop(ctx,scene,t,w,h);
  movingCoins(ctx,scene,t,w,h,false);
  portrait(ctx,image,w,h,t);
  movingCoins(ctx,scene,t,w,h,true);
  // Camera vignette darkens corners while keeping faces fully visible.
  const shade=ctx.createRadialGradient(w*.5,h*.47,w*.2,w*.5,h*.52,h*.79);
  shade.addColorStop(0,"rgba(5,11,17,0)");
  shade.addColorStop(.73,"rgba(6,10,17,.04)");
  shade.addColorStop(1,"rgba(4,8,12,.56)");
  ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);
  lastLight(ctx,scene,t,w,h,title);
  if(aspect==="landscape"){
    // Subtle horizontal lens flares in YouTube composition.
    streak(ctx,[w*.10,h*.19,w*.50,h*.20,w*.9,h*.19],1.1,.2,14);
  }
  ctx.restore();
}


/**
 * Compose an ACTUAL first-party MP4 video frame into the personalized movie.
 * This replaces, rather than imitates, the old procedural background. The
 * background element has a same-origin source so Canvas is not tainted and the
 * client's real photograph never leaves their browser.
 */
export function paintRealMoneyVideoFrame(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  scene: MoneySceneId,
  seconds: number,
  aspect: CinematicAspect,
  title: string,
  video: HTMLVideoElement,
): void {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) {
    ctx.restore();
    paintCinematicMoneyFrame(ctx, image, scene, seconds, aspect, title);
    return;
  }
  const cover = Math.max(w / vw, h / vh);
  const dw = vw * cover, dh = vh * cover;
  ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);

  // A localized dark halo makes the actual photograph legible without
  // converting the underlying video to a static screenshot.
  const halo = ctx.createRadialGradient(w / 2, h * .52, 20, w / 2, h * .52, w * .74);
  halo.addColorStop(0, "rgba(9,17,19,.06)");
  halo.addColorStop(.72, "rgba(9,17,19,.12)");
  halo.addColorStop(1, "rgba(9,17,19,.36)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
  portrait(ctx, image, w, h, seconds);
  movingCoins(ctx, scene, seconds, w, h, true);
  lastLight(ctx, scene, seconds, w, h, title);
  ctx.restore();
}
