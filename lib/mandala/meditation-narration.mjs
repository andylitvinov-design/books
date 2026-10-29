/**
 * SpeechSynthesis playback uses the device's installed LOCAL voice, not an AI
 * provider or a downloadable audio render. It never sends data to this app's API.
 * Filtered script and pauses are converted into real spoken and timed actions.
 */
export const MEDITATION_LANGUAGES=Object.freeze({en:"en-US",ru:"ru-RU",es:"es-ES"});
const marker=/^\[(?:Optional quiet pause|Пауза по желанию|Pausa opcional):\s*(\d+)\s*(?:seconds|сек\.|segundos)\]$/iu;
const titles=/^(?:PERSONAL MEDITATION|ПЕРСОНАЛЬНАЯ МЕДИТАЦИЯ|MEDITACIÓN PERSONAL)\s*·/u;
const metadata=/^(?:Context|Контекст|Contexto)\s*·/u;
const disclaimer=/^(?:Personal reflective script,|Текст для личной рефлексии,|Guion de reflexión personal,)/u;

/**
 * @returns {{kind:"speech",text:string}|{kind:"pause",seconds:number}}[]
 */
export function parseMeditationNarration(script){
  if(typeof script!=="string")return [];
  return script.slice(0,16000).split(/\n\s*\n/g).map(x=>x.trim())
    .filter(Boolean).flatMap(part=>{
      if(titles.test(part)||metadata.test(part)||disclaimer.test(part))return [];
      const pause=part.match(marker);
      if(pause)return [{kind:"pause",seconds:Math.max(0,Math.min(60,Number(pause[1])))}];
      // Text chosen by the owner can contain an inline pause line.
      return part.split(/\n(?=\[)/g).flatMap(text=>{
        const matched=text.trim().match(marker);
        return matched?[{kind:"pause",seconds:Math.max(0,Math.min(60,Number(matched[1])))}]:
          text.trim()?[{kind:"speech",text:text.trim().slice(0,850)}]:[];
      });
    }).slice(0,100);
}
export function meditationNarrationEstimate(script,rate=0.9){
  const queue=parseMeditationNarration(script);
  const speechWords=queue.filter(x=>x.kind==="speech")
    .reduce((acc,item)=>acc+item.text.split(/\s+/u).filter(Boolean).length,0);
  const pauseSeconds=queue.filter(x=>x.kind==="pause").reduce((sum,item)=>sum+item.seconds,0);
  // An estimate, NOT a guaranteed exact native voice duration.
  return Math.ceil(speechWords/(125*Math.max(0.7,Math.min(1.2,rate)))*60+pauseSeconds);
}
export function findLocalMeditationVoices(voices,locale){
  const root=(MEDITATION_LANGUAGES[locale]||"en-US").slice(0,2).toLowerCase();
  return (Array.isArray(voices)?voices:[])
    .filter(voice=>voice&&voice.localService===true&&typeof voice.lang==="string"&&
      voice.lang.slice(0,2).toLowerCase()===root);
}
/**
 * Run only after a deliberate user gesture. On pause cues, actually wait.
 * Injection makes the scheduler/voice mechanism testable without an OS mic.
 */
export function playMeditationNarration({
  script,locale="en",rate=0.9,voice,synthesis,Utterance,
  schedule=(fn,ms)=>setTimeout(fn,ms),unschedule=id=>clearTimeout(id),
  onProgress=()=>{},onStop=()=>{}
}={}){
  if(!synthesis||typeof synthesis.speak!=="function"||typeof synthesis.cancel!=="function"||
    typeof Utterance!=="function"||!voice||voice.localService!==true){
    throw new Error("local voice unavailable");
  }
  const queue=parseMeditationNarration(script);
  if(!queue.some(part=>part.kind==="speech"))throw new Error("empty script");
  let cancelled=false,index=0,timer=null;
  const stop=(reason="stopped")=>{
    if(cancelled)return;
    cancelled=true;
    if(timer!==null){unschedule(timer);timer=null;}
    try{synthesis.cancel();}catch{/* browser may already be closing */}
    onStop(reason);
  };
  const next=()=>{
    if(cancelled)return;
    if(index>=queue.length){stop("finished");return;}
    const segment=queue[index++];
    onProgress(index,queue.length,segment.kind);
    if(segment.kind==="pause"){
      timer=schedule(()=>{timer=null;next();},segment.seconds*1000);
      return;
    }
    let utterance;
    try{
      utterance=new Utterance(segment.text);
      utterance.lang=MEDITATION_LANGUAGES[locale]||"en-US";
      utterance.voice=voice;
      utterance.rate=Math.min(1.2,Math.max(0.7,rate));
      utterance.onend=()=>{if(!cancelled)next();};
      utterance.onerror=()=>stop("error");
      synthesis.speak(utterance);
    }catch{stop("error");}
  };
  try{synthesis.cancel();}catch{/* synthesis state is best-effort */}
  next();
  return {stop,queueLength:queue.length};
}
