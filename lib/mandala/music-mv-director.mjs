/**
 * Music MV: local audio envelope and user-goal-led visual directions.
 * These are measured energy levels and EDITORIAL concepts, not song lyrics.
 * No network calls, face inference, storage or cloud model.
 */
export const MUSIC_MV_SHAPE_VERSION="hh-music-mv-shape-v1";
const lengths=new Set([10,15,20,30,60]);
const rounded=n=>Math.round(n*100)/100;
const clamp=n=>Math.max(0,Math.min(1,n));
export function analyzeMusicShape(channels,rate,duration){
 if(!Array.isArray(channels)||channels.length<1||channels.length>2||
  channels.some(c=>!(c instanceof Float32Array))||
  !Number.isFinite(rate)||rate<8000||rate>192000||
  !lengths.has(duration)||channels.some(c=>c.length<rate*(duration-.1)))
  throw Error("invalid_music_mv_shape_input");
 const size=Math.round(rate*.25),bins=Math.ceil(duration*rate/size),stride=Math.max(1,Math.floor(rate/1600));
 const envelope=[];
 for(let bin=0;bin<bins;bin++){
  let sum=0,n=0;const last=Math.min((bin+1)*size,Math.floor(duration*rate));
  for(let k=bin*size;k<last;k+=stride)for(const channel of channels){
   const x=channel[k];if(Number.isFinite(x)){sum+=x*x;n++}
  }
  envelope.push(n?Math.sqrt(sum/n):0);
 }
 const peak=Math.max(0,...envelope),audible=peak>=.004;
 const e=envelope.map(v=>audible?rounded(clamp(v/peak)):0);
 const energies=Array.from({length:4},(_,i)=>{
  const a=Math.floor(i*e.length/4),b=Math.max(a+1,Math.floor((i+1)*e.length/4));
  return rounded(e.slice(a,b).reduce((s,v)=>s+v,0)/(b-a));
 });
 let maxIndex=0;for(let k=1;k<e.length;k++)if(e[k]>e[maxIndex])maxIndex=k;
 const contrast=Math.max(...energies)-Math.min(...energies);
 const label=!audible?"silence":
  energies[2]>energies[0]+.24&&energies[2]>energies[3]+.12?"rise_and_release":
  contrast<.16?"steady":contrast>.4?"contrasting":"flowing";
 const ids=["opening","development","high_point","closing"];
 return {version:MUSIC_MV_SHAPE_VERSION,label,audible,
  climaxSeconds:audible?rounded((maxIndex+.5)*size/rate):null,
  sections:ids.map((id,i)=>({id,startSeconds:rounded(i*duration/4),
   endSeconds:rounded((i+1)*duration/4),relativeEnergy:energies[i],source:"measured_audio_energy"})),
  relativeEnergy:energies,derivedFrom:"audio_signal_not_semantic_content"};
}
const subjectLabels={
 ru:{energy:"внутренняя энергия",money:"профессиональный рост",relationships:"отношения",health:"самочувствие",goals:"личная цель",life:"новый этап"},
 en:{energy:"inner energy",money:"professional growth",relationships:"relationships",health:"wellbeing",goals:"personal goal",life:"a new beginning"},
 es:{energy:"energía interior",money:"crecimiento profesional",relationships:"relaciones",health:"bienestar",goals:"meta personal",life:"una nueva etapa"}
};
const variants={
 ru:[
  ["quiet","Тихая история","Смысл раскрывается через одно спокойное действие.","Герой замечает паузу, возвращается к простому действию, видит небольшое изменение и завершает путь без спешки. Мягкий визуальный ритм."],
  ["cinema","Кинематографичный путь","Один осмысленный выбор меняет направление истории.","Конкретное препятствие, решение и заметное действие ведут к новому пространству. Движение усиливается на музыкальном подъёме, затем находит завершение."],
  ["symbols","История в символах","Перемена передаётся через последовательность образов.","Сначала тесное пространство, затем ориентир, раскрывающийся путь и светлая развязка. Символы допустимы только при наличии подходящих проверенных кадров."]
 ],
 en:[
  ["quiet","Quiet story","Meaning unfolds through one deliberate, quiet action.","Someone pauses, returns to a small action, notices a change and arrives without rushing. Use a gentle visual rhythm."],
  ["cinema","Cinematic journey","One meaningful decision changes the course of a journey.","A concrete obstacle, a decision and a visible action open a new place. Movement grows with the music, then resolves in a grounded ending."],
  ["symbols","Symbolic journey","An inner shift is expressed through a sequence of visual symbols.","Start with a confined space, discover a landmark, open the path and end in a brighter place. Verify that licensed shots depict each image."]
 ],
 es:[
  ["quiet","Historia tranquila","El sentido se descubre con una acción tranquila.","Una persona hace una pausa, retoma una acción pequeña, nota un cambio y termina sin prisa. Ritmo visual suave."],
  ["cinema","Viaje cinematográfico","Una decisión consciente cambia el rumbo del viaje.","Un obstáculo concreto, una decisión y una acción visible abren un nuevo espacio. El movimiento crece con la música y termina con claridad."],
  ["symbols","Relato simbólico","Un cambio interior se expresa mediante símbolos visuales.","Del espacio cerrado surge una señal, se abre un camino y llega un final luminoso. Cada símbolo se valida con escenas autorizadas."]
 ]};
const clean=s=>typeof s==="string"?s.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,140):"";
/** @param {{shape?:{version:string,label:string},goal?:string,theme?:string,locale?:"ru"|"en"|"es"}} [options] */
export function suggestMusicVideoDirections({shape,goal="",theme="life",locale="ru"}={}){
 if(!shape||shape.version!==MUSIC_MV_SHAPE_VERSION||!["ru","en","es"].includes(locale))
   throw Error("invalid_music_mv_creative_request");
 const subject="«"+(clean(goal)||subjectLabels[locale][theme]||subjectLabels[locale].life)+"»";
 return variants[locale].map(([id,title,mainIdea,storyPitch])=>({
  id,title,mainIdea,storyPitch:
   (locale==="ru"?"Тема ":locale==="es"?"Tema: ":"Subject: ")+subject+". "+storyPitch,
  source:"user_goal_editorial_suggestion",musicShape:shape.label,needsSourceReview:true
 }));
}
