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
const SHOT_FUNCTIONS={
 ru:["Контакт","Деталь","Нарастание","Поворот","Отклик","Завершение"],
 en:["Arrival","Detail","Development","Turning point","Response","Closing"],
 es:["Llegada","Detalle","Desarrollo","Giro","Respuesta","Cierre"]
};
/**
 * Real 4-part audio envelope -> six editorial 5-second camera instructions.
 * No words, images, actors, locations or rights are inferred from sound.
 */
export function planMusicVisualBeats(shape,{locale="ru",durationSeconds=null,mode="cinema"}={}){
 if(shape?.version!==MUSIC_MV_SHAPE_VERSION||!Array.isArray(shape.sections)||
  shape.sections.length!==4||!["ru","en","es"].includes(locale))
  throw Error("invalid_music_visual_beat_request");
 const length=durationSeconds??shape.sections[3]?.endSeconds;
 if(!Number.isFinite(length)||length<=0||length>60)return [];
 const count=length>=30?Math.round(length/5):4;
 const output=[];
 for(let index=0;index<count;index++){
  const start=rounded(index*length/count),end=rounded((index+1)*length/count);
  const section=Math.min(3,Math.floor(((start+end)/2)*4/length));
  const energy=shape.sections[section].relativeEnergy;
  const before=shape.sections[Math.max(0,section-1)].relativeEnergy;
  const change=rounded(energy-before);
  const movement=!shape.audible?"unknown":
   mode==="quiet"&&energy<.72?"gentle":
   energy>.68?"dynamic":energy<.28?"gentle":"steady";
  const functions=SHOT_FUNCTIONS[locale];
  const role=count===6?functions[index]:functions[Math.min(5,Math.floor(index*6/count))];
  output.push({index:index+1,startSeconds:start,endSeconds:end,
   section:shape.sections[section].id,measuredEnergy:energy,
   measuredChange:change,movement,
   storyRole:role,source:"measured_audio_structure",
   visualSubjectVerified:false,mediaVerified:false});
 }
 return output;
}
const clean=s=>typeof s==="string"?s.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,140):"";
/** @param {{shape?:{version:string,label:string},goal?:string,theme?:string,locale?:"ru"|"en"|"es"}} [options] */
export function suggestMusicVideoDirections({shape,goal="",theme="life",locale="ru"}={}){
 if(!shape||shape.version!==MUSIC_MV_SHAPE_VERSION||!["ru","en","es"].includes(locale))
   throw Error("invalid_music_mv_creative_request");
 const subject="«"+(clean(goal)||subjectLabels[locale][theme]||subjectLabels[locale].life)+"»";
 return variants[locale].map(([id,title,mainIdea,storyPitch])=>({
  id,title,mainIdea,storyPitch:
   (locale==="ru"?"Тема ":locale==="es"?"Tema: ":"Subject: ")+subject+". "+storyPitch,
  source:"user_goal_editorial_suggestion",musicShape:shape.label,needsSourceReview:true,
  subjectSource:clean(goal)?"explicit_client_goal":"selected_theme_only",
  inferredLyrics:false,
  storyboard:planMusicVisualBeats(shape,{locale,mode:id}),
  narrativeMode:id==="quiet"?"shelter":id==="cinema"?"journey":"reframe",
  mediaBindingStatus:"editorial_only_unverified"
 }));
}
