/**
 * Holistic House · first-party illustrated farewell characters.
 * Browser-only Canvas overlay over the LAST source-bound video scene.
 * No third-party media, network calls, uploads, API credits, fonts or paid models.
 * Motion is deterministically tied to the same timeline used by MediaRecorder/WebCodecs.
 * The original landscape is never replaced or baked into a separate outro card.
 */
import {FREE_GREETING_IDS,resolveGreetingCharacter} from './free-greeting-catalog.mjs';
export {FREE_GREETING_IDS} from './free-greeting-catalog.mjs';
export const FREE_GREETING_DURATION = 3.5;

const TWO_PI = Math.PI * 2;
const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
const smooth = x => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

/** Pure timing contract, identical for browser preview, WebCodecs and MediaRecorder. */
export function freeGreetingCue(seconds, duration, character, sceneKey='', theme='life') {
  const effective=resolveGreetingCharacter(character,sceneKey,theme);
  if (!FREE_GREETING_IDS.includes(character) || effective === 'none' ||
      !Number.isFinite(seconds) || !Number.isFinite(duration) || duration < 5 ||
      seconds < 0 || seconds > duration) return null;
  const start = Math.max(0, duration - FREE_GREETING_DURATION);
  if (seconds < start) return null;
  const time = seconds - start;
  const fadeIn = smooth(time / .58);
  const fadeOut = smooth((duration - seconds) / .4);
  const alpha = clamp(fadeIn * fadeOut, 0, 1);
  if (alpha <= 0) return null;
  return {
    character:effective,
    requested:character,
    start,
    seconds: time,
    alpha,
    // A recognizable friendly wave rather than static clip-art.
    wave: Math.sin(time * TWO_PI * 1.65) * .32,
    bob: Math.sin(time * TWO_PI * .72) * 1.35,
  };
}

function sampledTone(ctx, x, y) {
  try {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const p = ctx.getImageData(
      Math.floor(clamp(x, 0, w - 1)),
      Math.floor(clamp(y, 0, h - 1)), 1, 1).data;
    const luminance = (.2126 * p[0] + .7152 * p[1] + .0722 * p[2]) / 255;
    return {luminance, r:p[0], g:p[1], b:p[2]};
  } catch {
    // Some user-supplied/remote media are not origin-clean. Never block export.
    return {luminance:.5, r:108, g:130, b:118};
  }
}

function layoutForScene(ctx, aspect) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const left = sampledTone(ctx, w*.19, h*.70);
  const right = sampledTone(ctx, w*.81, h*.70);
  // The calmer (more uniform) side near ground is less likely to occlude the scene.
  const leftNeighbour = sampledTone(ctx, w*.19, h*.78);
  const rightNeighbour = sampledTone(ctx, w*.81, h*.78);
  const leftComplexity = Math.abs(left.luminance-leftNeighbour.luminance);
  const rightComplexity = Math.abs(right.luminance-rightNeighbour.luminance);
  const onLeft = leftComplexity <= rightComplexity;
  const near = onLeft ? left : right;
  return {
    x:w*(onLeft?.18:.82),
    groundY:h*(aspect === 'portrait' ? .84 : .865),
    // Small enough to leave scenery and original captions visible.
    size:Math.min(w*.265, h*.355),
    near,
  };
}

function oval(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TWO_PI);
  if(fill){ctx.fillStyle=fill;ctx.fill();}
}
function line(ctx, x1,y1,x2,y2,width,color) {
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function smilesAndEyes(ctx, eyeColor='#25352f') {
  oval(ctx,-9,-65,3,3.6,eyeColor);
  oval(ctx, 9,-65,3,3.6,eyeColor);
  ctx.lineWidth=2.5;ctx.strokeStyle='#73513e';ctx.lineCap='round';
  ctx.beginPath();ctx.arc(0,-60,6,.13,Math.PI-.13);ctx.stroke();
  oval(ctx,-10,-67,1,1,'#fff');oval(ctx,8,-67,1,1,'#fff');
}
function legs(ctx, boot) {
  line(ctx,-10,-23,-11,-4,10,boot);
  line(ctx,10,-23,11,-4,10,boot);
  oval(ctx,-13,-2,10,5,boot);oval(ctx,13,-2,10,5,boot);
}
function waveArm(ctx, t, armColor, handColor, side=1) {
  ctx.save();ctx.translate(side*20,-46);
  // Elbow anchored to shoulder, palm visibly above head and rocking left-right.
  ctx.rotate(side*(.10+t.wave));
  line(ctx,0,0,side*7,-16,9,armColor);
  line(ctx,side*7,-16,side*1,-36,7.5,armColor);
  oval(ctx,side*1,-40,7.5,9,handColor);
  for(let i=-1;i<=1;i++)line(ctx,side*(i*4+1),-44,side*(i*4+1),-51,2.2,handColor);
  ctx.restore();
}
function gnome(ctx,t) {
  legs(ctx,'#483a34');
  // Tunic and scarf (independently rendered first-party shapes).
  oval(ctx,0,-35,25,25,'#456c60');
  oval(ctx,0,-35,20,19,'#567f69');
  line(ctx,-19,-47,-28,-30,9,'#466e61');
  oval(ctx,-29,-28,7,8,'#e9b996');
  waveArm(ctx,t,'#426c60','#f0c39e');
  oval(ctx,0,-66,24,23,'#f2c7a4');
  oval(ctx,-22,-65,9,12,'#e8b996');oval(ctx,22,-65,9,12,'#e8b996');
  // Pointed cap with soft edging.
  ctx.fillStyle='#ad5051';ctx.beginPath();ctx.moveTo(-25,-75);
  ctx.quadraticCurveTo(-12,-95,5,-111);
  ctx.quadraticCurveTo(24,-113,22,-75);ctx.closePath();ctx.fill();
  oval(ctx,-1,-75,26,5,'#d78a79');
  oval(ctx,5,-111,4,4,'#f4c9a4');
  smilesAndEyes(ctx);
  oval(ctx,-18,-57,6,3,'#e8a193');oval(ctx,18,-57,6,3,'#e8a193');
}
function fox(ctx,t) {
  // Tail sits behind the body for natural foreground layering.
  ctx.fillStyle='#d67a45';ctx.beginPath();ctx.moveTo(17,-25);
  ctx.bezierCurveTo(50,-26,58,-50,41,-58);
  ctx.bezierCurveTo(54,-40,27,-38,16,-37);ctx.closePath();ctx.fill();
  legs(ctx,'#573f35');
  oval(ctx,0,-37,25,27,'#da8757');
  oval(ctx,0,-30,13,17,'#fff0df');
  line(ctx,-20,-48,-28,-31,10,'#cf7546');
  oval(ctx,-29,-29,7,7,'#e8a37e');
  waveArm(ctx,t,'#d57e48','#eeb28c');
  // Ears + fox cheeks, friendly animated anthropomorphic character.
  ctx.fillStyle='#be633a';
  ctx.beginPath();ctx.moveTo(-22,-78);ctx.lineTo(-23,-109);ctx.lineTo(-3,-90);
  ctx.lineTo(3,-90);ctx.lineTo(23,-109);ctx.lineTo(22,-78);ctx.closePath();ctx.fill();
  ctx.fillStyle='#efb292';
  ctx.beginPath();ctx.moveTo(-17,-88);ctx.lineTo(-17,-99);ctx.lineTo(-9,-89);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(17,-88);ctx.lineTo(17,-99);ctx.lineTo(9,-89);ctx.closePath();ctx.fill();
  oval(ctx,0,-71,26,24,'#e6955f');
  oval(ctx,-12,-60,13,11,'#fff0dd');oval(ctx,12,-60,13,11,'#fff0dd');
  smilesAndEyes(ctx);oval(ctx,0,-61,4,2.9,'#604039');
}
function fairy(ctx,t) {
  // Semi-transparent wings and sparkles softly adapt to the image underneath.
  ctx.fillStyle='rgba(176,234,215,.63)';
  ctx.beginPath();ctx.ellipse(-18,-54,14,25,-.45,0,TWO_PI);ctx.fill();
  ctx.beginPath();ctx.ellipse(18,-54,14,25,.45,0,TWO_PI);ctx.fill();
  legs(ctx,'#7d6181');
  ctx.fillStyle='#a67ac5';ctx.beginPath();ctx.moveTo(-12,-55);
  ctx.lineTo(-26,-14);ctx.quadraticCurveTo(0,-9,26,-14);ctx.lineTo(12,-55);ctx.closePath();ctx.fill();
  oval(ctx,0,-42,17,14,'#a980cc');
  line(ctx,-18,-49,-28,-36,7,'#d6a6cd');oval(ctx,-29,-36,5,6,'#eed3b8');
  waveArm(ctx,t,'#bf95d0','#f4d6b8');
  oval(ctx,0,-72,23,24,'#f0ccad');
  ctx.fillStyle='#735d64';ctx.beginPath();ctx.arc(0,-83,23,Math.PI,0);ctx.lineTo(23,-75);
  ctx.quadraticCurveTo(8,-88,-9,-79);ctx.lineTo(-24,-73);ctx.closePath();ctx.fill();
  oval(ctx,-22,-75,6,7,'#eecaaa');oval(ctx,22,-75,6,7,'#eecaaa');
  smilesAndEyes(ctx);
  ctx.fillStyle='rgba(245,237,183,.75)';
  for(let i=0;i<4;i++){
    const a=t.seconds*.35+i*2.1;
    oval(ctx,Math.sin(a)*31, -90+Math.cos(a*1.2)*13,2.4,2.4);
    ctx.fill();
  }
}

/** Shared deliberately illustrated anatomy. Palette and silhouette are varied
 * per entry, while gestures remain deterministic from the source video time. */
function dot(ctx,x,y,r,color){oval(ctx,x,y,r,r,color);}
function triangle(ctx,points,fill){
  ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
  for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
  ctx.closePath();ctx.fill();
}
function hairArc(ctx,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(0,-80,25,Math.PI,0);
  ctx.lineTo(25,-66);ctx.quadraticCurveTo(3,-85,-22,-66);ctx.closePath();ctx.fill();
}
function bloom(ctx,x,y,color){
  for(let i=0;i<5;i++){
    const a=i*TWO_PI/5;
    oval(ctx,x+Math.cos(a)*7,y+Math.sin(a)*7,5,5,color);
  }
  dot(ctx,x,y,4,'#ffe9a8');
}
function drawPerson(ctx,t,who){
  if(who==='dancer'){ctx.save();ctx.rotate(Math.sin(t.seconds*5)*.08);}
  const meta={
    elf:{robe:'#458b68',skin:'#e8c0a3',hair:'#d8be78'},
    wizard:{robe:'#6664ab',skin:'#debda0',hair:'#e9e4dd'},
    angel:{robe:'#f3ede4',skin:'#f0c8ac',hair:'#bba179'},
    child:{robe:'#f3aa64',skin:'#e9b996',hair:'#5c423a'},
    woman:{robe:'#e393ac',skin:'#e8b99c',hair:'#543e36'},
    man:{robe:'#4d91a4',skin:'#c99675',hair:'#433633'},
    traveler:{robe:'#648e75',skin:'#cc9877',hair:'#533d31'},
    host:{robe:'#34546b',skin:'#eac39e',hair:'#59473b'},
    dancer:{robe:'#b65a9d',skin:'#e3ad8f',hair:'#593e3c'},
    'light-guide':{robe:'#efe5ac',skin:'#e3c9ab',hair:'#f4e8b4'},
    guardian:{robe:'#64869e',skin:'#b79072',hair:'#4c4544'},
    sage:{robe:'#b5a3c8',skin:'#b69278',hair:'#ebe3da'},
    yogi:{robe:'#a28abf',skin:'#d6a083',hair:'#453837'},
  }[who]||{robe:'#7b9e8d',skin:'#dfb69a',hair:'#513d36'};
  const {robe,skin,hair}=meta;
  if(who==='angel'){
    oval(ctx,-26,-57,22,30,'rgba(249,251,237,.72)');
    oval(ctx,26,-57,22,30,'rgba(249,251,237,.72)');
  }
  if(who==='light-guide'){
    const a=ctx.createRadialGradient(0,-53,3,0,-53,76);
    a.addColorStop(0,'rgba(255,241,156,.54)');a.addColorStop(1,'rgba(255,232,153,0)');
    oval(ctx,0,-53,73,73,a);
  }
  legs(ctx,who==='yogi'?'#69577f':'#50453e');
  if(who==='dancer'){
    triangle(ctx,[[-20,-56],[-31,-13],[28,-13],[18,-56]],robe);
    line(ctx,-13,-15,-27,-4,10,robe);line(ctx,13,-15,26,-8,9,robe);
  }else{
    oval(ctx,0,-40,25,29,robe);
    oval(ctx,-4,-43,10,19,'rgba(255,255,255,.13)');
  }
  // Every non-neutral action is still a gentle greeting, not a claim of speech.
  if(who==='yogi'){
    line(ctx,-21,-48,-7,-36,8,robe);line(ctx,21,-48,7,-36,8,robe);
    oval(ctx,0,-35,6,8,skin);
  }else{
    line(ctx,-20,-49,-29,-32,9,robe);oval(ctx,-29,-31,7,8,skin);
    waveArm(ctx,t,robe,skin,who==='dancer'?-1:1);
  }
  oval(ctx,0,-72,23,24,skin);
  hairArc(ctx,hair);
  smilesAndEyes(ctx);
  if(who==='elf'){
    triangle(ctx,[[-22,-72],[-36,-82],[-24,-61]],skin);
    triangle(ctx,[[22,-72],[36,-82],[24,-61]],skin);
    triangle(ctx,[[-27,-86],[-4,-103],[25,-86]],'#4c885c');
  }
  if(who==='wizard'){
    triangle(ctx,[[-28,-91],[3,-134],[29,-91]],'#6264ac');
    oval(ctx,0,-90,29,6,'#a3a1dd');
    dot(ctx,0,-113,5,'#f4df89');
    line(ctx,-30,-34,-38,-8,4,'#6c573e');bloom(ctx,-39,-12,'#d8c1ed');
  }
  if(who==='angel'){
    ctx.strokeStyle='#fbe9a9';ctx.lineWidth=4;ctx.beginPath();
    ctx.ellipse(0,-105,24,7,0,0,TWO_PI);ctx.stroke();
  }
  if(who==='child'){
    dot(ctx,-16,-81,8,hair);dot(ctx,16,-81,8,hair);
  }
  if(who==='woman'||who==='dancer'){
    oval(ctx,-24,-59,6,22,hair);oval(ctx,24,-59,6,22,hair);
  }
  if(who==='traveler'){
    oval(ctx,-19,-49,7,20,'#b27f56');
    oval(ctx,0,-92,31,6,'#9b805b');
    oval(ctx,0,-99,24,13,'#ac8c5e');
  }
  if(who==='host'){
    line(ctx,-29,-29,-33,-9,3,'#b3b9c9');
    oval(ctx,-33,-14,5,9,'#4b4c64');
    triangle(ctx,[[-4,-55],[5,-55],[0,-38]],'#ece2dd');
  }
  if(who==='dancer'){
    bloom(ctx,16,-92,'#f1b1d7');
  }
  if(who==='guardian'){
    oval(ctx,-30,-30,9,13,'#e7dabb');
    line(ctx,-30,-39,-30,-17,3,'#658cab');
    triangle(ctx,[[-30,-14],[-39,-26],[-30,-36],[-21,-26]],'#6e96bc');
  }
  if(who==='sage'){
    triangle(ctx,[[-11,-57],[11,-57],[0,-25]],'#efe9e2');
    line(ctx,-31,-44,-36,-9,4,'#7c694e');
  }
  if(who==='yogi'){
    oval(ctx,0,4,37,7,'rgba(212,190,235,.9)');
    dot(ctx,0,-103,6,'#e2a3cd');
  }
  if(who==='light-guide'){
    bloom(ctx,4,-107,'rgba(255,234,143,.84)');
  }
  if(who==='dancer')ctx.restore();
}
function drawAnimal(ctx,t,who){
  if(who==='fox'){fox(ctx,t);return;}
  const p={
    cat:{body:'#bd8c78',head:'#d1a18d',nose:'#ad676c',ear:'#b27686'},
    dog:{body:'#b78564',head:'#d6a47b',nose:'#735345',ear:'#835a4a'},
    rabbit:{body:'#eee2d5',head:'#f7e9da',nose:'#d39b9d',ear:'#e3b2b4'},
    owl:{body:'#987961',head:'#bda080',nose:'#eab264',ear:'#87674f'},
    deer:{body:'#9b6c4e',head:'#bf8f65',nose:'#55453b',ear:'#c89c84'},
    panda:{body:'#eee9dd',head:'#f5f1e8',nose:'#3e423c',ear:'#353a3d'},
    'birthday-bear':{body:'#ab826c',head:'#c49c79',nose:'#604d40',ear:'#a8826b'},
  }[who];
  if(!p)return;
  if(who==='owl'){
    oval(ctx,-5,-32,29,30,p.body);
    oval(ctx,-24,-46,12,20,'#87694e');
    oval(ctx,23,-45,12,21,'#92734f');
  }else{
    legs(ctx,who==='panda'?'#3e4343':p.body);
    oval(ctx,0,-37,25,27,p.body);
    oval(ctx,0,-34,12,19,'rgba(255,248,225,.5)');
    waveArm(ctx,t,p.body,p.head);
  }
  if(who==='owl'){
    ctx.save();ctx.translate(25,-38);ctx.rotate(t.wave);
    oval(ctx,10,0,9,23,'#a58666');ctx.restore();
  }
  if(who==='rabbit'){
    oval(ctx,-13,-104,10,37,p.head);oval(ctx,13,-104,10,37,p.head);
    oval(ctx,-13,-108,5,28,p.ear);oval(ctx,13,-108,5,28,p.ear);
  }
  if(who==='cat'){
    triangle(ctx,[[-24,-83],[-24,-112],[-3,-92]],p.head);
    triangle(ctx,[[24,-83],[24,-112],[3,-92]],p.head);
    triangle(ctx,[[-19,-89],[-19,-103],[-9,-91]],p.ear);
    triangle(ctx,[[19,-89],[19,-103],[9,-91]],p.ear);
  }
  if(who==='dog'){
    oval(ctx,-25,-77,11,23,p.ear);oval(ctx,25,-77,11,23,p.ear);
  }
  if(who==='deer'){
    for(const side of [-1,1]){
      line(ctx,side*15,-90,side*21,-120,4,'#6d5139');
      line(ctx,side*18,-109,side*32,-116,3,'#6d5139');
      line(ctx,side*17,-106,side*8,-119,3,'#6d5139');
    }
  }
  if(who==='panda'){
    dot(ctx,-20,-93,12,p.ear);dot(ctx,20,-93,12,p.ear);
  }
  if(who==='birthday-bear'){
    dot(ctx,-22,-91,12,p.ear);dot(ctx,22,-91,12,p.ear);
  }
  oval(ctx,0,-70,25,25,p.head);
  if(who==='owl'){
    oval(ctx,-11,-71,13,14,'#eadcc4');oval(ctx,11,-71,13,14,'#eadcc4');
    dot(ctx,-11,-70,5,'#453c38');dot(ctx,11,-70,5,'#453c38');
    triangle(ctx,[[-5,-60],[5,-60],[0,-51]],p.nose);
  }else{
    if(who==='panda'){
      oval(ctx,-10,-73,9,13,p.ear);oval(ctx,10,-73,9,13,p.ear);
    }
    dot(ctx,-10,-71,3.5,'#332d30');dot(ctx,10,-71,3.5,'#332d30');
    oval(ctx,0,-60,6,4,p.nose);
    ctx.strokeStyle='#7d5f54';ctx.lineWidth=2.3;ctx.beginPath();
    ctx.arc(0,-57,7,.14,Math.PI-.14);ctx.stroke();
  }
  if(who==='cat'){
    for(const side of [-1,1])for(let j=-1;j<=1;j++)
      line(ctx,side*9,-60+j*3,side*27,-61+j*5,1.7,'#72564d');
  }
  if(who==='birthday-bear'){
    oval(ctx,42,-123,19,24,'#e79aa7');
    triangle(ctx,[[37,-102],[47,-102],[42,-96]],'#df8192');
    line(ctx,42,-96,35,-35,1.5,'#8a7174');
    triangle(ctx,[[-11,-91],[0,-117],[11,-91]],'#6fa1cc');
  }
}
function drawSpirit(ctx,t,who){
  if(who==='forest-spirit'){
    oval(ctx,0,-54,27,44,'rgba(120,191,137,.8)');
    oval(ctx,-23,-40,14,24,'rgba(156,215,171,.78)');
    oval(ctx,23,-40,14,24,'rgba(156,215,171,.78)');
    waveArm(ctx,t,'#6fba80','#c1e4b2');
    oval(ctx,0,-72,24,23,'#a4d1a3');
    for(let i=-2;i<=2;i++){
      oval(ctx,i*11,-97-Math.cos(i*1.6)*6,8,16,'#4e9361');
    }
    smilesAndEyes(ctx);
  }
  if(who==='dragon'){
    // Distinct winged creature with a waving foreclaw.
    triangle(ctx,[[-20,-58],[-55,-91],[-48,-44],[-23,-38]],'#91a2ac');
    triangle(ctx,[[20,-58],[55,-91],[48,-44],[23,-38]],'#91a2ac');
    oval(ctx,0,-37,25,28,'#7eae9e');
    oval(ctx,0,-31,13,18,'#b9d2ae');
    line(ctx,-19,-22,-16,-3,10,'#538976');line(ctx,19,-22,16,-3,10,'#538976');
    waveArm(ctx,t,'#679c86','#9fcab5');
    oval(ctx,0,-73,27,24,'#87b9a4');
    triangle(ctx,[[-22,-87],[-18,-113],[-3,-96]],'#dfbd7a');
    triangle(ctx,[[22,-87],[18,-113],[3,-96]],'#dfbd7a');
    oval(ctx,-10,-73,4,5,'#334c44');oval(ctx,10,-73,4,5,'#334c44');
    oval(ctx,0,-60,8,4,'#b6d5be');
  }
  if(who==='mermaid'){
    ctx.fillStyle='#48aaa4';ctx.beginPath();ctx.moveTo(-14,-37);
    ctx.quadraticCurveTo(25,-32,14,-6);ctx.quadraticCurveTo(10,2,15,12);
    ctx.lineTo(-4,3);ctx.lineTo(-19,12);ctx.quadraticCurveTo(-20,-13,-14,-37);ctx.fill();
    triangle(ctx,[[-19,10],[-3,-1],[13,11]],'#4cc0ba');
    oval(ctx,0,-53,21,26,'#a88bd2');
    waveArm(ctx,t,'#987ac4','#e5b69e');
    oval(ctx,0,-77,22,24,'#ecc0a0');hairArc(ctx,'#675166');
    smilesAndEyes(ctx);
    oval(ctx,0,-47,8,6,'#efdad0');
  }
}
function drawFestive(ctx,t,who){
  if(who==='birthday-bear'){drawAnimal(ctx,t,who);return;}
  if(who==='snowman'){
    oval(ctx,0,-27,30,32,'#f7f7f4');oval(ctx,0,-73,24,26,'#f8faf9');
    line(ctx,-18,-44,-32,-23,5,'#6a513f');
    waveArm(ctx,t,'#7a6249','#baa089');
    triangle(ctx,[[0,-68],[23,-64],[1,-61]],'#de8844');
    dot(ctx,-9,-77,4,'#303a44');dot(ctx,9,-77,4,'#303a44');
    for(const y of [-37,-25])dot(ctx,0,y,3,'#48515b');
    oval(ctx,0,-93,28,5,'#45434b');
    triangle(ctx,[[-19,-94],[-15,-121],[15,-121],[19,-94]],'#45434b');
    line(ctx,-18,-55,18,-50,6,'#b95565');
  }
  if(who==='heart-messenger'){
    ctx.fillStyle='#e77f96';ctx.beginPath();ctx.moveTo(0,-20);
    ctx.bezierCurveTo(-57,-63,-29,-101,0,-76);
    ctx.bezierCurveTo(29,-101,57,-63,0,-20);ctx.closePath();ctx.fill();
    line(ctx,-15,-30,-18,-3,9,'#ba5773');line(ctx,15,-30,18,-3,9,'#ba5773');
    waveArm(ctx,t,'#d96c85','#ffe1ca');
    dot(ctx,-10,-63,3.3,'#58343e');dot(ctx,10,-63,3.3,'#58343e');
    ctx.strokeStyle='#73434f';ctx.lineWidth=2.6;ctx.beginPath();ctx.arc(0,-56,7,.1,Math.PI-.1);ctx.stroke();
    // Tiny moving heart with a recognizable two-lobed silhouette.
    const hx=38+Math.sin(t.seconds*2.3)*3, hy=-93-t.seconds*2;
    ctx.fillStyle='#f3b5c5';ctx.beginPath();ctx.moveTo(hx,hy+6);
    ctx.bezierCurveTo(hx-16,hy-2,hx-6,hy-12,hx,hy-4);
    ctx.bezierCurveTo(hx+6,hy-12,hx+16,hy-2,hx,hy+6);ctx.closePath();ctx.fill();
  }
  if(who==='wedding-dove'){
    const flap=Math.sin(t.seconds*TWO_PI*1.9)*.16;
    ctx.save();ctx.rotate(flap);
    oval(ctx,-16,-50,22,15,'rgba(247,246,239,.94)');
    ctx.restore();
    ctx.save();ctx.rotate(-flap);
    oval(ctx,21,-55,24,14,'rgba(252,252,249,.95)');
    ctx.restore();
    oval(ctx,0,-48,30,22,'#fafaf6');oval(ctx,14,-70,18,18,'#fffefa');
    dot(ctx,18,-72,3,'#3e4444');
    triangle(ctx,[[31,-68],[45,-65],[31,-62]],'#deb987');
    triangle(ctx,[[-27,-48],[-48,-56],[-45,-35]],'#e9eadd');
    line(ctx,-6,-27,-5,-9,3,'#d3b895');line(ctx,8,-27,10,-9,3,'#d3b895');
    bloom(ctx,34,-43,'#e9c5d0');
  }
}
function drawDolphin(ctx,t){
  // A water-friendly foreground instead of an anthropomorphic arm on land.
  ctx.save();ctx.translate(0,-38);ctx.rotate(t.wave*.12);
  ctx.fillStyle='#70b6cc';ctx.beginPath();ctx.moveTo(-45,2);
  ctx.bezierCurveTo(-13,-27,27,-35,41,-8);
  ctx.quadraticCurveTo(50,-8,56,-2);
  ctx.quadraticCurveTo(36,6,20,8);
  ctx.quadraticCurveTo(-18,28,-45,2);ctx.fill();
  triangle(ctx,[[-30,3],[-55,-13],[-45,15]],'#66acc6');
  triangle(ctx,[[1,-20],[-8,-43],[25,-29]],'#579ab5');
  triangle(ctx,[[5,8],[15,32],[26,12]],'#83c2d0');
  dot(ctx,29,-11,3.5,'#264c62');
  ctx.restore();
  for(let j=0;j<3;j++){
    ctx.strokeStyle='rgba(209,247,255,.55)';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,-8-j*4,36-j*8,7+j*3,0,0,Math.PI);ctx.stroke();
  }
}
function drawGreetingCharacter(ctx,t,character){
  // Every catalogue entry has a concrete first-party renderer.
  switch(character){
    case 'gnome':gnome(ctx,t);break;
    case 'fairy':fairy(ctx,t);break;
    case 'fox':fox(ctx,t);break;
    case 'elf':case 'wizard':case 'angel':case 'child':case 'woman':case 'man':
    case 'traveler':case 'host':case 'dancer':case 'light-guide':case 'guardian':
    case 'sage':case 'yogi':drawPerson(ctx,t,character);break;
    case 'forest-spirit':case 'dragon':case 'mermaid':drawSpirit(ctx,t,character);break;
    case 'cat':case 'dog':case 'rabbit':case 'owl':case 'deer':case 'panda':
    case 'birthday-bear':drawAnimal(ctx,t,character);break;
    case 'dolphin':drawDolphin(ctx,t);break;
    case 'snowman':case 'heart-messenger':case 'wedding-dove':drawFestive(ctx,t,character);break;
    default:return false;
  }
  return true;
}

/** Returns true only when a visible greeting was actually painted. */
export function paintFreeGreeting(ctx, seconds, duration, character, aspect='landscape',sceneKey='',theme='life') {
  const cue=freeGreetingCue(seconds,duration,character,sceneKey,theme);
  if(!cue||!ctx||!ctx.canvas||!(ctx.canvas.width>0)||!(ctx.canvas.height>0))return false;
  const {x,groundY,size,near}=layoutForScene(ctx,aspect);
  if(!Number.isFinite(size)||size<1)return false;
  const scale=size/100;
  ctx.save();
  try {
    ctx.globalAlpha*=cue.alpha;
    // Shadow anchors the character to the ground; its opacity reflects local light.
    const shadow=ctx.createRadialGradient(x,groundY,0,x,groundY,size*.42);
    shadow.addColorStop(0,`rgba(17,27,26,${(.27-near.luminance*.10).toFixed(3)})`);
    shadow.addColorStop(1,'rgba(17,27,26,0)');
    ctx.fillStyle=shadow;
    ctx.save();ctx.translate(x,groundY);ctx.scale(1,.19);
    ctx.beginPath();ctx.arc(0,0,size*.42,0,TWO_PI);ctx.fill();ctx.restore();
    ctx.translate(x,groundY+cue.bob*scale);
    ctx.scale(scale,scale);
    ctx.shadowColor=`rgba(${near.r},${near.g},${near.b},.22)`;
    ctx.shadowBlur=Math.max(2,8*scale);
    return drawGreetingCharacter(ctx,cue,cue.character);
  } finally {ctx.restore();}
}
