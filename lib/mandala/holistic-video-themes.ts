/**
 * First-party, client-side symbolic video templates for the four support axes.
 * Each preview and exported video uses this identical renderer.
 * No stock portrait, AI upload, health inference, client storage, or cost.
 */
export type VideoTheme = "money" | "energy" | "life" | "health" | "relationships" | "goals";
export type OtherTheme = Exclude<VideoTheme, "money">;
export type LocalSceneId =
  | "sun-flight" | "green-vortex" | "light-waterfall" | "gentle-shield"
  | "heart-light" | "warm-connection" | "blossom-garden" | "two-circles"
  | "light-path" | "open-door" | "guiding-stars" | "meaning-tree"
  | "solar-surge" | "ocean-pulse" | "sunbeam-flow" | "river-power" | "desert-light" | "mountain-air"
  | "wildflower-dance" | "fern-awakening" | "coastal-freedom" | "lone-tree" | "meadow-morning"
  | "calm-sea" | "morning-dew" | "mossy-stream" | "gentle-falls" | "sea-breeze";
export type VideoLocale = "en" | "ru" | "es";

type LocalScene = {
  id: LocalSceneId;
  label: Record<VideoLocale, string>;
  symbol: string;
};
export const otherVideoScenes: Record<OtherTheme, LocalScene[]> = {
  energy: [
    { id:"solar-surge", symbol:"☀", label:{en:"Solar vitality",ru:"Солнечная энергия",es:"Vitalidad solar"} },
    { id:"ocean-pulse", symbol:"≋", label:{en:"Ocean pulse",ru:"Пульс океана",es:"Pulso del océano"} },
    { id:"sunbeam-flow", symbol:"✧", label:{en:"Sunbeam flow",ru:"Поток солнечных лучей",es:"Flujo de luz solar"} },
    { id:"river-power", symbol:"〰", label:{en:"Power of water",ru:"Сила воды",es:"Fuerza del agua"} },
    { id:"desert-light", symbol:"◇", label:{en:"Light in motion",ru:"Свет в движении",es:"Luz en movimiento"} },
    { id:"mountain-air", symbol:"△", label:{en:"Mountain air",ru:"Горный воздух",es:"Aire de montaña"} },
    { id:"sun-flight", symbol:"☀", label:{en:"Sun energy",ru:"Энергия Солнца",es:"Energía del Sol"} },
    { id:"green-vortex", symbol:"✺", label:{en:"Energy spiral",ru:"Спираль энергии",es:"Espiral de energía"} },
    { id:"light-waterfall", symbol:"≋", label:{en:"Light waterfall",ru:"Водопад света",es:"Cascada de luz"} },
    { id:"gentle-shield", symbol:"◉", label:{en:"Gentle protection",ru:"Мягкая защита",es:"Protección suave"} },
  ],
  life: [
    { id:"wildflower-dance", symbol:"✿", label:{en:"Dance of flowers",ru:"Танец цветов",es:"Danza de flores"} },
    { id:"fern-awakening", symbol:"❧", label:{en:"New beginnings",ru:"Пробуждение жизни",es:"Nuevo comienzo"} },
    { id:"coastal-freedom", symbol:"≋", label:{en:"Freedom and space",ru:"Свобода и простор",es:"Libertad y espacio"} },
    { id:"lone-tree", symbol:"♧", label:{en:"Roots of life",ru:"Корни жизни",es:"Raíces de vida"} },
    { id:"meadow-morning", symbol:"☼", label:{en:"Fresh morning",ru:"Новое утро",es:"Mañana nueva"} },
  ],
  health: [
    { id:"calm-sea", symbol:"≋", label:{en:"Calm sea",ru:"Спокойное море",es:"Mar tranquilo"} },
    { id:"morning-dew", symbol:"✧", label:{en:"Morning freshness",ru:"Утренняя свежесть",es:"Frescura matinal"} },
    { id:"mossy-stream", symbol:"♧", label:{en:"Quiet stream",ru:"Тихий ручей",es:"Arroyo tranquilo"} },
    { id:"gentle-falls", symbol:"〰", label:{en:"Gentle waterfall",ru:"Мягкий водопад",es:"Cascada suave"} },
    { id:"sea-breeze", symbol:"❋", label:{en:"Sea breeze",ru:"Морской бриз",es:"Brisa marina"} },
  ],
  relationships: [
    { id:"heart-light", symbol:"♡", label:{en:"Heart of light",ru:"Сияние сердца",es:"Corazón de luz"} },
    { id:"warm-connection", symbol:"∞", label:{en:"Warm connection",ru:"Тёплая связь",es:"Conexión cálida"} },
    { id:"blossom-garden", symbol:"✿", label:{en:"Garden of acceptance",ru:"Сад принятия",es:"Jardín de aceptación"} },
    { id:"two-circles", symbol:"◌", label:{en:"Meeting in harmony",ru:"Встреча в гармонии",es:"Encuentro en armonía"} },
  ],
  goals: [
    { id:"light-path", symbol:"➤", label:{en:"Path to a goal",ru:"Путь к цели",es:"Camino a la meta"} },
    { id:"open-door", symbol:"⌂", label:{en:"Golden doorway",ru:"Золотой портал",es:"Portal dorado"} },
    { id:"guiding-stars", symbol:"✧", label:{en:"Stars of meaning",ru:"Звёзды смысла",es:"Estrellas del sentido"} },
    { id:"meaning-tree", symbol:"♧", label:{en:"Tree of purpose",ru:"Древо предназначения",es:"Árbol del propósito"} },
  ],
};

const PALETTE: Record<OtherTheme, readonly [string,string,string,string]> = {
  energy:["#0a2930","#065b52","#a2f2cc","#eaf9ce"],
  life:["#123b2c","#327c51","#f7dc96","#e9ffca"],
  health:["#143b48","#2d747d","#b4e9d6","#e4f7f2"],
  relationships:["#42243c","#a05678","#ffc9a7","#ffedf1"],
  goals:["#282446","#6256a5","#ffe4a2","#eef1ff"],
};
const TAU=Math.PI*2;
const mod=(x:number,y:number)=>(x%y+y)%y;
function rnd(x:number){const k=Math.sin(x*127.13+38.71)*51832.117;return k-Math.floor(k);}
function radiance(c:CanvasRenderingContext2D,x:number,y:number,r:number,rgb:string,alpha:number) {
  const g=c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,"rgba("+rgb+","+alpha+")");
  g.addColorStop(.36,"rgba("+rgb+","+(alpha*.20)+")");
  g.addColorStop(1,"rgba("+rgb+",0)");
  c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
}
function line(c:CanvasRenderingContext2D,points:number[],color:string,width:number) {
  c.beginPath();c.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
  c.lineWidth=width;c.strokeStyle=color;c.stroke();
}
function ring(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,angle:number,opacity:number) {
  c.beginPath();c.ellipse(x,y,rx,ry,angle,0,TAU);
  c.lineWidth=2.2;c.strokeStyle="rgba(255,239,192,"+opacity+")";c.stroke();
}
function heart(c:CanvasRenderingContext2D,x:number,y:number,size:number,opacity:number) {
  c.save();c.translate(x,y);c.scale(size,size);
  c.beginPath();c.moveTo(0,.38);
  c.bezierCurveTo(-.95,-.24,-.38,-.75,0,-.33);
  c.bezierCurveTo(.38,-.75,.95,-.24,0,.38);
  c.closePath();
  c.strokeStyle="rgba(255,221,222,"+opacity+")";c.lineWidth=.047;c.stroke();c.restore();
}
function composePortrait(c:CanvasRenderingContext2D,image:HTMLImageElement|null,w:number,h:number,t:number) {
  const fw=Math.min(w*.62,h*.72),fh=Math.min(h*.62,w*.78);
  const x=w*.5-fw*.5,y=h*.50-fh*.5;
  c.save();
  c.shadowColor="rgba(254,224,170,.6)";c.shadowBlur=w*.035;
  c.fillStyle="rgba(253,240,203,.15)";c.beginPath();c.roundRect(x-5,y-5,fw+10,fh+10,fw*.08);c.fill();
  c.restore();
  c.save();c.beginPath();c.roundRect(x,y,fw,fh,fw*.07);c.clip();
  if(image?.naturalWidth&&image.naturalHeight) {
    const scale=Math.max(fw/image.naturalWidth,fh/image.naturalHeight);
    const pw=image.naturalWidth*scale,ph=image.naturalHeight*scale;
    c.drawImage(image,w*.5-pw*.5,h*.50-ph*.5,pw,ph);
  } else {
    const background=c.createLinearGradient(x,y,x+fw,y+fh);
    background.addColorStop(0,"#364c53");background.addColorStop(1,"#7c7d80");
    c.fillStyle=background;c.fillRect(x,y,fw,fh);
    radiance(c,w*.5,h*.52,fw*.56,"255,223,163",.42);
    c.textAlign="center";c.font="bold "+Math.max(36,w*.13)+"px Georgia,serif";
    c.fillStyle="rgba(255,244,220,.85)";c.fillText("✧",w*.5,h*.55);
  }
  c.restore();
  c.strokeStyle="rgba(255,237,203,.7)";c.lineWidth=2.5;
  c.beginPath();c.roundRect(x,y,fw,fh,fw*.07);c.stroke();
  radiance(c,w*.5,h*.17,w*.46,"255,234,184",.18+.03*Math.sin(t));
}
export function paintThemedVideoFrame(
  c:CanvasRenderingContext2D,image:HTMLImageElement|null,
  theme:OtherTheme,scene:LocalSceneId,time:number,title:string,
) {
  const w=c.canvas.width,h=c.canvas.height,t=Math.max(0,time);
  const [dark,mid,,ink]=PALETTE[theme];
  c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
  const sky=c.createLinearGradient(0,0,w,h);sky.addColorStop(0,dark);sky.addColorStop(.6,mid);sky.addColorStop(1,dark);
  c.fillStyle=sky;c.fillRect(0,0,w,h);
  radiance(c,w*.5,h*.34,w*.65,theme==="energy"?"118,247,203":theme==="relationships"?"255,177,196":"255,221,155",.37);
  for(let i=0;i<100;i++){
    const x=w*rnd(i+11)+Math.sin(t*.25+i)*2.3;
    const y=mod(h*rnd(i+99)-t*(4+i%4),h);
    c.beginPath();c.arc(x,y,1+(i%7===0?2.8:0),0,TAU);
    c.fillStyle=i%8?"rgba(255,247,215,.22)":"rgba(255,238,178,.58)";c.fill();
  }
  const cx=w*.5,cy=h*.5,orbit=Math.min(w,h);
  if(scene==="sun-flight"||scene==="guiding-stars"){
    radiance(c,cx,h*.13,orbit*.46,"255,239,155",.9);
    for(let i=0;i<20;i++){
      const a=i/20*TAU+t*.015;
      line(c,[cx+Math.cos(a)*orbit*.26,h*.14+Math.sin(a)*orbit*.18,
        cx+Math.cos(a)*orbit*.57,h*.14+Math.sin(a)*orbit*.4],"rgba(255,245,208,.25)",1.5);
    }
  }
  if(scene==="green-vortex"||scene==="two-circles"||scene==="gentle-shield") {
    for(let i=0;i<6;i++){
      ring(c,cx,cy,orbit*(.25+i*.059),orbit*(.33+i*.038),t*.045+i*.22,.2+i*.04);
    }
  }
  if(scene==="light-waterfall"||scene==="blossom-garden"){
    for(let i=0;i<21;i++){
      const x=w*(i+.5)/21;
      const shift=Math.sin(t*.5+i)*w*.014;
      line(c,[x+shift,-10,x-shift,h*.6,x+shift,h],"rgba(255,246,221,.12)",2+i%3);
    }
  }
  if(scene==="heart-light"||scene==="warm-connection"||scene==="two-circles") {
    for(let i=0;i<7;i++){
      const a=i/7*TAU+t*.07,r=orbit*(.39+i%2*.07);
      heart(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r*.7,orbit*.072,.47+i*.035);
    }
  }
  if(scene==="light-path"||scene==="open-door"){
    for(let i=0;i<11;i++){
      const y=h*(.35+i*.059),d=w*(.05+i*.03);
      line(c,[cx-d,y,cx+d,y],"rgba(255,232,176,"+(.1+i*.034)+")",1+i*.2);
    }
    if(scene==="open-door"){
      c.strokeStyle="rgba(255,244,183,.65)";c.lineWidth=4;
      c.beginPath();c.moveTo(w*.23,h*.86);c.lineTo(w*.23,h*.17);
      c.quadraticCurveTo(cx,-h*.12,w*.77,h*.17);
      c.lineTo(w*.77,h*.86);c.stroke();
    }
  }
  if(scene==="meaning-tree"){
    line(c,[cx,h*.97,cx,h*.36],"rgba(217,180,115,.8)",orbit*.035);
    for(let i=0;i<9;i++){
      const y=h*(.39+i*.05),side=i%2?1:-1;
      line(c,[cx,y,cx+side*w*(.22+Math.sin(t*.13+i)*.03),y-h*.13],"rgba(233,208,150,.65)",2.5);
    }
  }
  composePortrait(c,image,w,h,t);
  // Foreground only outside the approximate central face zone.
  c.save();c.beginPath();c.rect(0,0,w,h);
  c.ellipse(cx,h*.38,w*.19,h*.13,0,0,TAU,true);c.clip("evenodd");
  for(let i=0;i<33;i++){
    const a=rnd(i+307)*TAU+t*(.06+.015*(i%5));
    const r=orbit*(.24+.31*rnd(i+163));
    const x=cx+Math.cos(a)*r,y=cy+Math.sin(a)*r;
    const glow=2+(i%6)*.9;
    radiance(c,x,y,glow*4,theme==="energy"?"145,246,192":"255,211,175",.18);
    c.beginPath();c.arc(x,y,glow,0,TAU);c.fillStyle=ink;c.globalAlpha=.55;c.fill();
  }
  c.restore();c.globalAlpha=1;
  const footer=c.createLinearGradient(0,h*.73,0,h);footer.addColorStop(0,"rgba(8,16,22,0)");footer.addColorStop(1,"rgba(7,15,25,.79)");
  c.fillStyle=footer;c.fillRect(0,h*.73,w,h*.27);
  c.textAlign="center";c.fillStyle="#fff8e8";c.textBaseline="middle";
  c.font="600 "+Math.max(12,Math.min(29,w*.045))+"px Georgia,serif";
  if(title.trim())c.fillText(title.slice(0,72),cx,h*.87,w*.85);
  c.font="600 "+Math.max(9,w*.02)+"px Arial,sans-serif";
  c.fillStyle="rgba(245,239,215,.83)";c.fillText("H O L I S T I C   H O U S E",cx,h*.075,w*.86);
  c.restore();
}


/**
 * Composites an actual decoded, first-party Full HD film under the user's
 * original, *still* photograph. No client upload, AI likeness generation,
 * diagnoses, physiological claims or hidden health-data inference.
 */
export function paintRealThemedVideoFrame(
  c: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  theme: OtherTheme,
  time: number,
  title: string,
  video: HTMLVideoElement,
): void {
  const w = c.canvas.width, h = c.canvas.height;
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    paintThemedVideoFrame(c, image, theme, "sun-flight", time, title);
    return;
  }
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  const scale = Math.max(w / video.videoWidth, h / video.videoHeight);
  const vw = video.videoWidth * scale, vh = video.videoHeight * scale;
  c.drawImage(video, (w - vw) / 2, (h - vh) / 2, vw, vh);
  const vignette = c.createRadialGradient(w * .50, h * .46, w * .17, w * .5, h * .5, h * .84);
  vignette.addColorStop(0, "rgba(8,24,28,0)");
  vignette.addColorStop(1, "rgba(5,19,23,.46)");
  c.fillStyle = vignette;
  c.fillRect(0, 0, w, h);
  if (image) composePortrait(c, image, w, h, time);
  const bottom = c.createLinearGradient(0, h * .75, 0, h);
  bottom.addColorStop(0, "rgba(4,22,26,0)");
  bottom.addColorStop(1, "rgba(4,19,26,.74)");
  c.fillStyle = bottom;
  c.fillRect(0, h * .75, w, h * .25);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#fff9e8";
  c.font = "600 " + Math.max(12, Math.min(29, w * .042)) + "px Georgia,serif";
  if (title.trim()) c.fillText(title.slice(0, 72), w / 2, h * .88, w * .86);
  c.fillStyle = "rgba(255,248,226,.87)";
  c.font = "600 " + Math.max(10, w * .023) + "px Arial,sans-serif";
  c.fillText("H O L I S T I C   H O U S E", w / 2, h * .078, w * .9);
  c.restore();
}
