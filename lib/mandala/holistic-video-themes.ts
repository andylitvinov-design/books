/**
 * First-party, client-side symbolic video templates for the four support axes.
 * Each preview and exported video uses this identical renderer.
 * No stock portrait, AI upload, health inference, client storage, or cost.
 */
import extraFreeFilms from "../../data/video-catalog/free-stock-scenes.json";
export type VideoTheme = "money" | "energy" | "life" | "health" | "relationships" | "goals";
export type OtherTheme = Exclude<VideoTheme, "money">;
export type LocalSceneId =
  | "sun-flight" | "green-vortex" | "light-waterfall" | "gentle-shield"
  | "heart-light" | "warm-connection" | "blossom-garden" | "two-circles"
  | "light-path" | "open-door" | "guiding-stars" | "meaning-tree"
  | "solar-surge" | "ocean-pulse" | "sunbeam-flow" | "river-power" | "desert-light" | "mountain-air"
  | "wildflower-dance" | "fern-awakening" | "coastal-freedom" | "lone-tree" | "meadow-morning"
  | "calm-sea" | "morning-dew" | "mossy-stream" | "gentle-falls" | "sea-breeze"
  | "food-fruit-bowl" | "food-vegetable-prep" | "food-soup-bowl" | "food-bread-table"
  | (string & {});
export type VideoLocale = "en" | "ru" | "es";

type LocalScene = {
  id: LocalSceneId;
  label: Record<VideoLocale, string>;
  symbol: string;
};
type StockExtra = {id:string;theme:OtherTheme;status:"approved";symbol:string;label:Record<VideoLocale,string>};
const stockExtras=extraFreeFilms as unknown as StockExtra[];
const scenesFor=(theme:OtherTheme):LocalScene[]=>stockExtras.filter(s=>s.status==="approved"&&s.theme===theme)
  .map(s=>({id:s.id,symbol:s.symbol,label:s.label}));
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
    ...scenesFor("energy"),
  ],
  life: [
    { id:"wildflower-dance", symbol:"✿", label:{en:"Dance of flowers",ru:"Танец цветов",es:"Danza de flores"} },
    { id:"fern-awakening", symbol:"❧", label:{en:"New beginnings",ru:"Пробуждение жизни",es:"Nuevo comienzo"} },
    { id:"coastal-freedom", symbol:"≋", label:{en:"Freedom and space",ru:"Свобода и простор",es:"Libertad y espacio"} },
    { id:"lone-tree", symbol:"♧", label:{en:"Roots of life",ru:"Корни жизни",es:"Raíces de vida"} },
    { id:"meadow-morning", symbol:"☼", label:{en:"Fresh morning",ru:"Новое утро",es:"Mañana nueva"} },
    ...scenesFor("life"),
  ],
  health: [
    { id:"calm-sea", symbol:"≋", label:{en:"Calm sea",ru:"Спокойное море",es:"Mar tranquilo"} },
    { id:"morning-dew", symbol:"✧", label:{en:"Morning freshness",ru:"Утренняя свежесть",es:"Frescura matinal"} },
    { id:"mossy-stream", symbol:"♧", label:{en:"Quiet stream",ru:"Тихий ручей",es:"Arroyo tranquilo"} },
    { id:"gentle-falls", symbol:"〰", label:{en:"Gentle waterfall",ru:"Мягкий водопад",es:"Cascada suave"} },
    { id:"sea-breeze", symbol:"❋", label:{en:"Sea breeze",ru:"Морской бриз",es:"Brisa marina"} },
    ...scenesFor("health"),
  ],
  relationships: [
    { id:"heart-light", symbol:"♡", label:{en:"Heart of light",ru:"Сияние сердца",es:"Corazón de luz"} },
    { id:"warm-connection", symbol:"∞", label:{en:"Warm connection",ru:"Тёплая связь",es:"Conexión cálida"} },
    { id:"blossom-garden", symbol:"✿", label:{en:"Garden of acceptance",ru:"Сад принятия",es:"Jardín de aceptación"} },
    { id:"two-circles", symbol:"◌", label:{en:"Meeting in harmony",ru:"Встреча в гармонии",es:"Encuentro en armonía"} },
    ...scenesFor("relationships"),
  ],
  goals: [
    { id:"light-path", symbol:"➤", label:{en:"Path to a goal",ru:"Путь к цели",es:"Camino a la meta"} },
    { id:"open-door", symbol:"⌂", label:{en:"Golden doorway",ru:"Золотой портал",es:"Portal dorado"} },
    { id:"guiding-stars", symbol:"✧", label:{en:"Stars of meaning",ru:"Звёзды смысла",es:"Estrellas del sentido"} },
    { id:"meaning-tree", symbol:"♧", label:{en:"Tree of purpose",ru:"Древо предназначения",es:"Árbol del propósito"} },
    ...scenesFor("goals"),
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
export const FOOD_CANVAS_SCENES = Object.freeze([
  "food-fruit-bowl","food-vegetable-prep","food-soup-bowl","food-bread-table",
]);
function paintFoodVideoFrame(
  c:CanvasRenderingContext2D,image:HTMLImageElement|null,
  scene:LocalSceneId,time:number,title:string,
):void {
  const w=c.canvas.width,h=c.canvas.height,t=Math.max(0,time);
  const themeColors:Record<string,readonly [string,string]> = {
    "food-fruit-bowl":["#693e36","#d9a26a"],
    "food-vegetable-prep":["#2c5545","#c7c680"],
    "food-soup-bowl":["#624238","#deb27f"],
    "food-bread-table":["#684538","#d7af75"],
  };
  const colors=themeColors[scene]||themeColors["food-fruit-bowl"];
  c.save();c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);
  const back=c.createLinearGradient(0,0,w,h);
  back.addColorStop(0,colors[0]);back.addColorStop(.7,colors[1]);back.addColorStop(1,"#fff1d4");
  c.fillStyle=back;c.fillRect(0,0,w,h);
  const sun=c.createRadialGradient(w*.72,h*.16,3,w*.72,h*.16,Math.max(w,h)*.85);
  sun.addColorStop(0,"rgba(255,250,227,.51)");sun.addColorStop(1,"rgba(255,250,227,0)");
  c.fillStyle=sun;c.fillRect(0,0,w,h);
  c.fillStyle="rgba(59,40,25,.17)";c.fillRect(0,h*.76,w,h*.24);
  c.save();c.translate(w/2,h*.51);
  const k=Math.min(w/1000,h/730);c.scale(k,k);
  const oval=(x:number,y:number,rx:number,ry:number,color:string,r=0)=>{
    c.beginPath();c.ellipse(x,y,rx,ry,r,0,TAU);c.fillStyle=color;c.fill();
  };
  const stem=(x:number,y:number,angle=0)=>{
    c.save();c.translate(x,y);c.rotate(angle);
    c.strokeStyle="#46633a";c.lineWidth=8;c.lineCap="round";
    c.beginPath();c.moveTo(0,7);c.quadraticCurveTo(8,-26,3,-38);c.stroke();
    c.beginPath();c.ellipse(24,-25,32,12,-.45,0,TAU);
    c.fillStyle="#86a957";c.fill();c.restore();
  };
  const plate=()=>{
    oval(7,143,395,158,"rgba(52,25,16,.27)");
    oval(0,110,387,156,"#ece7d7");
    oval(0,96,336,124,"#fff8e7");
    c.strokeStyle="rgba(195,161,115,.62)";c.lineWidth=9;
    c.beginPath();c.ellipse(0,96,334,125,0,0,TAU);c.stroke();
  };
  // All displacements are continuous: no flashes or abrupt camera cuts.
  const float=Math.sin(t*.72)*4;
  if(scene==="food-fruit-bowl"){
    plate();
    oval(-122,-23+float,103,104,"#cb3e37",-.15);
    oval(-150,-55+float,40,29,"rgba(255,179,121,.33)");
    stem(-120,-113+float,.12);
    oval(37,-49-float,107,108,"#f3a631",.12);
    oval(5,-82-float,37,25,"rgba(255,231,170,.39)");
    stem(35,-143-float,-.25);
    oval(170,-6+float*.6,94,99,"#8cb24e",.19);
    oval(141,-37+float*.6,36,27,"rgba(226,250,147,.34)");
    stem(179,-97+float*.6,.37);
    for(let i=0;i<11;i++){
      const angle=i*2.4;
      const x=-16+Math.cos(angle)*(45+i%3*13);
      const y=68+Math.sin(angle)*(38+i%2*10);
      oval(x,y,18,18,i%2?"#5d3d8d":"#794e9a");
    }
    c.fillStyle="#fff7eb";c.globalAlpha=.34;
    oval(-116,28,66,13,"#fff3d8");c.globalAlpha=1;
  }else if(scene==="food-vegetable-prep"){
    c.fillStyle="rgba(63,38,22,.26)";c.beginPath();c.roundRect(-372,-131,760,428,35);c.fill();
    c.fillStyle="#c58c58";c.beginPath();c.roundRect(-380,-144,760,418,34);c.fill();
    c.strokeStyle="rgba(255,225,174,.49)";c.lineWidth=8;c.stroke();
    for(let i=0;i<10;i++){
      const a=i*TAU/10+t*.014;
      oval(-160+Math.cos(a)*68,-14+Math.sin(a)*85,47,83,"#498d4f",a);
      oval(-160+Math.cos(a)*43,-14+Math.sin(a)*58,31,64,"#7cb86b",a);
    }
    for(const [x,y] of [[80,-54],[225,72],[-2,103]]){
      oval(x,y,75,69,"#c94837");
      oval(x-22,y-18,25,18,"rgba(255,174,117,.35)");
      stem(x,y-60,-.21);
    }
    c.save();c.translate(190,-101);c.rotate(.42);
    c.fillStyle="#ed8429";c.beginPath();c.moveTo(-57,-48);
    c.quadraticCurveTo(70,-67,75,5);c.lineTo(-61,39);c.closePath();c.fill();
    for(let i=0;i<3;i++){c.strokeStyle="rgba(255,220,141,.53)";c.lineWidth=5;
      c.beginPath();c.moveTo(-28,-35+i*23);c.lineTo(46,-29+i*9);c.stroke();}
    c.restore();
  }else if(scene==="food-soup-bowl"){
    plate();
    oval(0,52,284,127,"#e8e2d6");
    oval(0,44,261,103,"#c77827");
    oval(0,36,237,91,"#efaf45");
    for(let i=0;i<10;i++){
      const a=i*2.38+t*.08,x=Math.cos(a)*(40+i%4*40),y=34+Math.sin(a)*(26+i%3*19);
      oval(x,y,10+i%3*4,8+i%2*3,i%2?"#517c43":"#f5cc75",a);
    }
    // Steam is a slow, visible animated element (not a static picture).
    c.lineWidth=7;c.lineCap="round";
    for(let i=0;i<4;i++){
      const x=-155+i*98;
      c.strokeStyle="rgba(255,250,227,"+(0.38+Math.sin(t*.5+i)*.1)+")";
      c.beginPath();c.moveTo(x,-115);
      c.bezierCurveTo(x+19+Math.sin(t*.45+i)*14,-155,x-24,-214,x+7+Math.sin(t*.52+i)*12,-257);
      c.stroke();
    }
    c.save();c.translate(276,128);c.rotate(-.36);
    oval(0,0,75,30,"#cbd1cd");c.fillStyle="#a8b4b2";c.fillRect(56,-7,205,13);
    c.restore();
  }else if(scene==="food-bread-table"){
    c.fillStyle="rgba(53,28,11,.26)";c.beginPath();c.roundRect(-360,-133,730,400,34);c.fill();
    c.fillStyle="#ad764c";c.beginPath();c.roundRect(-366,-145,730,396,34);c.fill();
    c.strokeStyle="rgba(250,206,151,.57)";c.lineWidth=8;c.stroke();
    oval(-118,-6+float,198,113,"#9d542a",-.16);
    oval(-129,-19+float,184,103,"#d49a52",-.16);
    oval(198,68-float,120,95,"#a96933",.22);
    oval(190,58-float,108,83,"#e4b36d",.22);
    for(let i=0;i<4;i++){
      c.strokeStyle="rgba(255,236,187,.86)";c.lineWidth=11;c.lineCap="round";
      c.beginPath();c.moveTo(-260+i*58,-50+i*3);c.lineTo(-229+i*58,24+i*3);c.stroke();
    }
    for(let i=0;i<3;i++){c.strokeStyle="rgba(251,228,178,.73)";c.lineWidth=7;
      c.beginPath();c.moveTo(132+i*46,35);c.lineTo(151+i*45,91);c.stroke();}
    oval(48,171,73,37,"#f5e6bf");
    oval(48,162,60,29,"#f3cb67");
    stem(46,143,1.2);
  }
  c.restore();
  // Explicitly chosen visitor photos remain local and are drawn only if supplied.
  if(image?.complete&&image.naturalWidth>0&&image.naturalHeight>0){
    const diameter=Math.max(72,Math.min(w,h)*.17);
    const x=w-diameter-16,y=18;
    c.save();c.beginPath();c.roundRect(x,y,diameter,diameter,diameter*.18);c.clip();
    const crop=Math.min(image.naturalWidth,image.naturalHeight);
    c.drawImage(image,(image.naturalWidth-crop)/2,(image.naturalHeight-crop)/2,
      crop,crop,x,y,diameter,diameter);c.restore();
  }
  const footer=c.createLinearGradient(0,h*.85,0,h);
  footer.addColorStop(0,"rgba(32,25,21,0)");
  footer.addColorStop(1,"rgba(28,23,20,.62)");
  c.fillStyle=footer;c.fillRect(0,h*.85,w,h*.15);
  c.textAlign="center";c.textBaseline="middle";
  if(title.trim()){
    c.font="600 "+Math.max(13,Math.min(29,w*.043))+"px Georgia,serif";
    c.fillStyle="#fffaf0";c.fillText(title.slice(0,72),w*.5,h*.89,w*.88);
  }
  c.font="600 "+Math.max(10,w*.017)+"px Arial,sans-serif";
  c.fillStyle="rgba(255,244,222,.9)";
  c.fillText("H O L I S T I C   H O U S E",w*.5,h*.965,w*.88);
  c.restore();
}

export function paintThemedVideoFrame(
  c:CanvasRenderingContext2D,image:HTMLImageElement|null,
  theme:OtherTheme,scene:LocalSceneId,time:number,title:string,
) {
  if(FOOD_CANVAS_SCENES.includes(scene)){paintFoodVideoFrame(c,image,scene,time,title);return;}
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
  // V2 masters already contain the title; V3 licensed clips carry source
  // attribution at the bottom and still need the existing top label.
  const bakedBrandVisible=video.currentSrc.includes("/film-collection-v2/") &&
    h/w >= (video.videoHeight/video.videoWidth)*.9;
  if (!bakedBrandVisible) {
    c.fillStyle = "rgba(255,248,226,.87)";
    c.font = "600 " + Math.max(10, w * .023) + "px Arial,sans-serif";
    c.fillText("H O L I S T I C   H O U S E", w / 2, h * .078, w * .9);
  }
  c.restore();
}
