/**
 * Original vector cut-out fox, animated from independent articulated body parts.
 * First-party geometry: no stock characters, external media, raster downloads,
 * scripts, untrusted HTML or foreign SVG contents. Deterministic at any time.
 */
import {cartoonSceneAt,validateCartoonStoryboard} from './storyboard.mjs';
const TAU=Math.PI*2;
const round=n=>Number(n.toFixed(3));
const sin=Math.sin;
function seeded(seed,index){let n=(seed^Math.imul(index+1,0x9e3779b1))>>>0;n=Math.imul(n^(n>>>16),0x85ebca6b);return ((n^(n>>>13))>>>0)/4294967296;}
function tree(x,y,s,opacity='#214d54'){
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${round(s)})" fill="${opacity}"><path d="M-6 1H6L4-60H-4Z" fill="#5e4642"/><path d="M0-167 -47-87 -30-87 -64-38 -39-39 -82-6 77-6 37-39 61-39 26-87 45-87Z"/><path d="M0-166L-44-86M0-166L37-86" stroke="#65918a" stroke-opacity=".28" stroke-width="4" fill="none"/></g>`;
}
function star(x,y,r,t){const a=.75+.2*sin(t*1.7);return `<g transform="translate(${round(x)} ${round(y)})" opacity="${round(a)}"><circle r="${round(r*2.45)}" fill="url(#halo)"/><path d="M0 ${-r} Q${round(r*.24)} ${-round(r*.25)} ${r} 0 Q${round(r*.23)} ${round(r*.2)} 0 ${r} Q${-round(r*.2)} ${round(r*.2)} ${-r} 0 Q${-round(r*.2)} ${-round(r*.23)} 0 ${-r}Z" fill="#fff9cf" stroke="#f5c86c" stroke-width="1"/></g>`;}
function worldMarkup(scene,w,h,t,seed){
  const isNight=scene.worldId!=='sunny-garden';
  const meadow=scene.worldId==='starlit-meadow';
  const dark=isNight?['#092a45','#155575','#6593b1']:['#96dce4','#f9d7a1','#fff0bb'];
  const backColor=isNight?'#123b58':'#85b6a1';
  const hill=isNight?'#265f70':'#80b687';
  const foreground=isNight?'#164653':'#4f966d';
  const camera=scene.camera.movement==='gentle-pan-right'?1:-1;
  const drift=round(camera*t*5);
  const ground=round(h*.82);
  let sky='';
  for(let k=0;k<29;k++){
    const q=seeded(seed,k+70),z=seeded(seed,k+180);
    const x=round(q*w),y=round(z*h*.52),r=round(1.1+seeded(seed,k+310)*2.2);
    if(isNight)sky+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff8d9" opacity="${round(.25+.55*seeded(seed,k+91)*(.8+.2*sin(t*.45+k)))}"/>`;
    else if(k%4===0)sky+=`<circle cx="${x}" cy="${y}" r="${round(r*1.4)}" fill="#fff4dc" opacity=".38"/>`;
  }
  const trees=Array.from({length:7},(_,i)=>tree(w*(i/6-.09)+drift*.36,ground-35-(i%2)*21,.65+(i%3)*.18,backColor)).join('');
  const middle=Array.from({length:5},(_,i)=>tree(w*(i/4-.09)-drift*.75,ground+15,1.05+(i%2)*.18,foreground)).join('');
  const flowers=Array.from({length:16},(_,i)=>{const x=round((seeded(seed,i+230)*w+drift*1.3+w)%w),y=round(ground+13+seeded(seed,i+430)*(h-ground-20));const c=i%3?'#ffd69c':'#ffd1dc';return `<g transform="translate(${x} ${y})" opacity=".85"><path d="M0 0v-12" stroke="#6f9b77" stroke-width="2"/><circle cy="-14" r="4" fill="${c}"/><circle cy="-14" r="2" fill="#fffcde"/></g>`;}).join('');
  return `<defs>
      <linearGradient id="sky" x2="0" y2="1"><stop stop-color="${dark[0]}"/><stop offset=".58" stop-color="${dark[1]}"/><stop offset="1" stop-color="${dark[2]}"/></linearGradient>
      <radialGradient id="halo"><stop stop-color="#fffbd0" stop-opacity=".9"/><stop offset=".32" stop-color="#ffe7a2" stop-opacity=".48"/><stop offset="1" stop-color="#fff7d8" stop-opacity="0"/></radialGradient>
      <radialGradient id="sun"><stop stop-color="#fff9d2" stop-opacity="1"/><stop offset=".42" stop-color="#fff1ae" stop-opacity=".85"/><stop offset="1" stop-color="#fff2bc" stop-opacity="0"/></radialGradient>
      <linearGradient id="orange" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#ffb45d"/><stop offset=".55" stop-color="#ef783f"/><stop offset="1" stop-color="#c95d39"/></linearGradient>
      <linearGradient id="fur" x1="0" y1="0" x2=".4" y2="1"><stop stop-color="#fff4da"/><stop offset="1" stop-color="#eed5af"/></linearGradient>
      <linearGradient id="tail" x1="0" y1="0" x2="1" y2=".4"><stop stop-color="#d3643f"/><stop offset=".75" stop-color="#f3a65a"/><stop offset="1" stop-color="#fff3d5"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    ${!isNight?`<circle cx="${round(w*.72+drift*.14)}" cy="${round(h*.24)}" r="${round(w*.28)}" fill="url(#sun)"/>`:''}
    ${sky}
    <g transform="translate(${round(drift*.12)} 0)"><path d="M0 ${round(ground)} Q${round(w*.2)} ${round(ground-h*.22)} ${round(w*.46)} ${round(ground-h*.10)} T${w} ${round(ground-h*.14)}L${w} ${h}H0Z" fill="${backColor}" opacity=".42"/></g>
    <g>${trees}</g>
    <path d="M0 ${round(ground+13)} Q${round(w*.30)} ${round(ground-85)} ${round(w*.52)} ${round(ground+4)} T${w} ${round(ground-20)}V${h}H0Z" fill="${hill}"/>
    ${meadow?`<ellipse cx="${round(w*.60)}" cy="${round(ground+22)}" rx="${round(w*.45)}" ry="${round(h*.055)}" fill="#e2c889" opacity=".3"/>`:''}
    <g>${middle}</g>
    <path d="M0 ${round(ground+55)} Q${round(w*.25)} ${round(ground+7)} ${round(w*.53)} ${round(ground+45)} T${w} ${round(ground+30)}V${h}H0Z" fill="${foreground}"/>
    <path d="M${round(w*.47)} ${round(ground+56)} Q${round(w*.37)} ${round(h*.9)} ${round(w*.17)} ${h}H${round(w*.73)}Q${round(w*.61)} ${round(h*.9)} ${round(w*.55)} ${round(ground+53)}" fill="#d6c49c" opacity=".35"/>
    ${flowers}`;
}
function foxMarkup(scene,x,y,scale,t){
  const walking=scene.actionId==='walk';
  const speaking=scene.actionId==='talk';
  const surprise=scene.actionId==='surprise';
  const sit=scene.actionId==='sit';
  const phase=t*TAU*1.38;
  const stride=walking?sin(phase)*22:0;
  const bodyBob=walking?Math.abs(sin(phase))*4:sin(t*1.5)*1.8;
  const tailAngle=round(-8+sin(t*2.4)*13+(surprise?12:0));
  const headAngle=round((surprise?-12:0)+sin(t*1.3)*3+(scene.actionId==='turn'?sin(t*.8)*10:0));
  const earAngle=round(surprise?-13:sin(t*2)*3);
  const isBlink=(t%4.6)>4.32&&(t%4.6)<4.47 || (scene.actionId==='blink'&&(t%2.4)<.16);
  const eyeRy=isBlink?1.2:surprise?10:7;
  const mouthR=speaking?round(2+5*(.5+.5*sin(t*12))):surprise?6:2;
  const friendly=scene.emotionId==='happy'||scene.emotionId==='calm';
  const legA=round(sit?24:stride),legB=round(sit?-24:-stride);
  const boxY=round(y-bodyBob+(sit?24:0));
  return `<g id="fox-actor" transform="translate(${round(x)} ${boxY}) scale(${round(scale)})">
      <ellipse cx="0" cy="18" rx="103" ry="20" fill="#0c2630" opacity=".21" filter="url(#soft)"/>
      <g id="tail" transform="translate(-70 -54) rotate(${tailAngle})">
        <path d="M8 18 Q-85 1 -152-43 Q-182-70 -167-106 Q-121-94 -68-70 Q-3-48 24-27Z" fill="url(#tail)" stroke="#a94e39" stroke-width="3"/>
        <path d="M-152-45 Q-169-63 -167-106 Q-130-99 -111-91 Q-144-75 -152-45Z" fill="#fff0d0"/>
      </g>
      <g id="rear-paws">
        <g transform="translate(-52 -14) rotate(${legB})"><path d="M-19 0L9-2Q20 19 13 55L-8 56Q-22 23-19 0Z" fill="#ab5942"/><ellipse cx="4" cy="56" rx="20" ry="12" fill="#704642"/></g>
        <g transform="translate(35 -15) rotate(${legA})"><path d="M-19 0L9-2Q20 21 13 55L-8 56Q-22 23-19 0Z" fill="#bd6745"/><ellipse cx="4" cy="56" rx="20" ry="12" fill="#704642"/></g>
      </g>
      <ellipse cx="-12" cy="${sit?-45:-61}" rx="${sit?96:87}" ry="${sit?50:62}" fill="url(#orange)" stroke="#ae563a" stroke-width="3"/>
      <path d="M31-106 Q92-94 84-40 Q57-8 17-2 Q-10-27 8-65Z" fill="url(#fur)" opacity=".96"/>
      <g id="front-paws" transform="translate(9 0)">
        <g transform="translate(-32 -35) rotate(${legA})"><path d="M-16 0Q-22 25-17 74L7 75Q20 22 14 0Z" fill="#db7547" stroke="#ae563a" stroke-width="2"/><ellipse cx="-2" cy="74" rx="22" ry="12" fill="#704642"/></g>
        <g transform="translate(32 -30) rotate(${legB})"><path d="M-16 0Q-20 25-17 74L7 75Q20 22 14 0Z" fill="#e7874d" stroke="#ae563a" stroke-width="2"/><ellipse cx="-2" cy="74" rx="22" ry="12" fill="#704642"/></g>
      </g>
      <g id="head" transform="translate(52 -119) rotate(${headAngle})">
        <g id="ears">
          <g transform="translate(-44 -59) rotate(${earAngle})"><path d="M-26 14L-27-80Q-8-85 25-6Z" fill="#e78049" stroke="#ae563a" stroke-width="3"/><path d="M-15-14L-17-63Q-2-56 12-7Z" fill="#f7b7a8"/></g>
          <g transform="translate(37 -56) rotate(${round(-earAngle*.6)})"><path d="M-25 7L15-82Q36-68 27 24Z" fill="#e78049" stroke="#ae563a" stroke-width="3"/><path d="M-6-8L18-58Q27-47 19 8Z" fill="#f7b7a8"/></g>
        </g>
        <path d="M-75-24Q-77-78-33-96Q21-117 73-79Q102-37 72 18Q33 55-24 45Q-83 29-75-24Z" fill="url(#orange)" stroke="#a8513a" stroke-width="3"/>
        <path d="M-70 7Q-57 32-17 31Q-3 62 34 40Q60 42 85 8Q91 49 49 64Q-10 84-55 48Z" fill="url(#fur)"/>
        <g id="eyes"><ellipse cx="-27" cy="-23" rx="8" ry="${eyeRy}" fill="#29343d"/><ellipse cx="43" cy="-24" rx="8" ry="${eyeRy}" fill="#29343d"/>
          ${!isBlink?'<circle cx="-30" cy="-27" r="2.3" fill="#fff"/><circle cx="40" cy="-28" r="2.3" fill="#fff"/>':''}
          <path d="M-48-42Q-29-50-14-40M29-42Q43-51 58-43" stroke="#8e4a3a" stroke-width="4" stroke-linecap="round" fill="none"/></g>
        <g id="muzzle"><ellipse cx="3" cy="24" rx="51" ry="29" fill="#fff1d6"/><ellipse cx="47" cy="17" rx="36" ry="24" fill="#f9e7c6"/>
          <path d="M61 12Q78 18 60 27Q49 29 42 20Q44 11 61 12Z" fill="#423740"/>
          <ellipse cx="33" cy="42" rx="9" ry="${mouthR}" fill="#693d40"/>
          ${friendly&&!speaking?'<path d="M17 38Q32 55 48 36" fill="none" stroke="#8f5747" stroke-width="3" stroke-linecap="round"/>':''}
          <circle cx="-61" cy="14" r="8" fill="#f2a09a" opacity=".55"/></g>
      </g>
    </g>`;
}
/** Returns a complete self-contained SVG. Browser Canvas and Node Sharp can decode it. */
export function renderCartoonSvg(plan,timeMs,{width,height}={}){
  validateCartoonStoryboard(plan);
  const w=width??(plan.aspect==='portrait'?720:1280);
  const h=height??(plan.aspect==='portrait'?1280:720);
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<240||h<240||w>1920||h>1920||
      Math.abs(w/h-(plan.aspect==='portrait'?9/16:16/9))>.02)
      throw Error('invalid_cartoon_dimensions');
  if(!Number.isFinite(timeMs))throw Error('invalid_cartoon_time');
  const s=cartoonSceneAt(plan,timeMs);
  const time=Math.max(0,Math.min(plan.durationMs-1,timeMs));
  const t=(time-s.startMs)/1000;
  const u=t/(s.durationMs/1000);
  const seed=plan.seed+s.index*467;
  const x=w*(.42+(s.actionId==='walk'?u*.14:0));
  const y=h*.73;
  const scale=Math.min(w/720,h/780)*1.04;
  const world=worldMarkup(s,w,h,t,seed);
  const actor=foxMarkup(s,x,y,scale,t);
  const floatX=w*(.64+.04*sin(t*.8)),floatY=h*(.42+.026*sin(t*1.2));
  const sparkle=s.starVisible?star(floatX,floatY,Math.max(13,Math.min(w,h)*.032),t):'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Original animated fox cartoon frame">${world}${sparkle}${actor}</svg>`;
}
