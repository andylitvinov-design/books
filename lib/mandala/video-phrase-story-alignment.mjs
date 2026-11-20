/**
 * Place the user's already chosen supporting phrases along a 30s story.
 * Never rewrite, infer consent, translate or publish them. Local and pure.
 * The six film shots stay unchanged; suggestions are user-editable.
 */
const clean=s=>String(s??"").normalize("NFKC").trim().slice(0,240);
const RISK=/\b(?:cured|guaranteed healing|you will win|must forgive)\b|гарантированн[а-я]* исцел|обязан простить|debes perdonar|curaci[oó]n garantizada/iu;
const RECOGNITION=/\b(?:i feel|i am afraid|it is hard|i struggle|fear|ashamed|lonely)\b|мне трудно|я боюсь|я чувствую|стыдно|одинок|me cuesta|tengo miedo|me siento/iu;
const RESOURCE=/\b(?:i may|i can pause|i can rest|support|accept|notice|care)\b|я могу отдох|могу останов|опор|поддерж|приним|замеча|puedo descansar|apoyo|acepto/iu;
export const GOAL_PHRASE_SLOTS_VERSION="hh-goal-phrase-slots-v1";

// Use strong phrase/action matches only; anything uncertain retains the
// existing chronological placements. This is an editorial aid, not therapy proof.
const STORY_CUES=Object.freeze([
 {phrase:/\bwelcome (?:new )?love\b|впускаю любовь|принимаю любовь|открываюсь любви|acojo el amor|recibo el amor/iu,
  scene:/\bdoor (?:open|opens|opening)\b|\bopen(?:s|ing)? (?:the |a |front )?door\b|дверь открыва|открыва[ею][а-я]* дверь|puerta (?:se )?abre/iu,preferred:5},
 {phrase:/\bmutual (?:care|respect)\b|взаимн|уважени|cuidado mutuo|respeto mutuo/iu,
  scene:/\bsecond chair\b|\btwo chairs\b|\bshared table\b|второй стул|два стула|dos sillas|mesa compartida/iu,preferred:1},
 {phrase:/\btrust\b|довер|confianza/iu,
  scene:/\b(?:old )?(?:photo|photograph|photos|photographs|memories|memory|past)\b|воспомин|стар[а-я]* фотограф|фото|прошл|recuerdo|foto|pasado/iu,preferred:2},
 {phrase:/\bconnect\b|\bopen heart\b|с открытым сердцем|открыт[а-я]* сердц|связ[ьи]|conectar|coraz[oó]n abierto/iu,
  scene:/\bcurtain|\bwindow\b|\bshelf\b|\bspace\b|\broom\b|\bfree chair\b|штор|окно|полк|комнат|пространств|cortina|ventana|estante|espacio/iu,preferred:3},
 {phrase:/\b(?:kind|healthy|warm) relationships\b|добры[а-я]* отношен|бережн[а-я]* отношен|relaciones (?:amables|sanas|c[aá]lidas)/iu,
  scene:/\binvitation\b|\bphone\b|\bmessage\b|\breply\b|приглаш|телефон|сообщени|ответ|invitaci[oó]n|tel[eé]fono|mensaje/iu,preferred:4}
]);
function meaningMatchedSlots(selected,sceneActions){
 if(!Array.isArray(sceneActions)||sceneActions.length!==6)return null;
 const cues=selected.map(phrase=>STORY_CUES.find(cue=>cue.phrase.test(phrase)));
 if(cues.some(cue=>!cue))return null;
 const shots=sceneActions.map(shot=>clean(shot));
 const options=cues.map((cue,index)=>({index,
  matches:shots.map((shot,sceneIndex)=>cue.scene.test(shot)?{
    sceneIndex,score:10-Math.abs(sceneIndex-cue.preferred)
  }:null).filter(Boolean)}));
 if(options.some(entry=>!entry.matches.length))return null;
 options.sort((a,b)=>a.matches.length-b.matches.length||a.index-b.index);
 let best=null,bestScore=-Infinity;
 const used=new Set(),picked=Array(selected.length).fill(-1);
 function choose(at,score){
  if(at===options.length){if(score>bestScore){bestScore=score;best=picked.slice();}return;}
  const entry=options[at];
  for(const candidate of entry.matches){
   if(used.has(candidate.sceneIndex))continue;
   used.add(candidate.sceneIndex);picked[entry.index]=candidate.sceneIndex;
   choose(at+1,score+candidate.score);
   used.delete(candidate.sceneIndex);picked[entry.index]=-1;
  }
 }
 choose(0,0);
 if(!best)return null;
 const slots=Array(6).fill(null);
 selected.forEach((phrase,index)=>{slots[best[index]]=phrase;});
 return slots;
}

/**
 * Slots are 0-based film scene indices. We preserve exact selected phrase text and
 * no more than one phrase per shot. More than 6 phrases retain previous
 * one-per-shot placement; never truncate an approved transcript.
 */
export function proposeGoalPhraseSlots(phrases,{goalSelected=false,sceneCount=6,
  manualPlacements=false,sceneActions=null}={}){
 if(!goalSelected||manualPlacements||sceneCount!==6||
   !Array.isArray(phrases)||phrases.length>6)return null;
 const selected=phrases.map(clean).filter(Boolean);
 if(selected.length!==phrases.length||selected.some(x=>RISK.test(x)))return null;
 const n=selected.length,slots=Array(6).fill(null);
 if(!n)return Object.freeze(slots);
 const semantic=meaningMatchedSlots(selected,sceneActions);
 if(semantic)return Object.freeze(semantic);
 let positions=n===1?[4]:n===2?[2,4]:n===3?[0,2,4]:
  n===4?[0,2,3,4]:n===5?[0,1,2,3,4]:[0,1,2,3,4,5];
 // For a single recognition phrase, use the actual opening moment;
 // for one stabilising phrase, use the resource shot. No sentiment is inferred
 // from the viewer: only the explicit phrase's own wording is inspected.
 if(n===1&&RECOGNITION.test(selected[0]))positions=[0];
 else if(n===1&&RESOURCE.test(selected[0]))positions=[2];
 if(n===2&&RECOGNITION.test(selected[0]))positions=[0,4];
 if(n===2&&RESOURCE.test(selected[1]))positions=[0,2];
 selected.forEach((phrase,i)=>{slots[positions[i]]=phrase;});
 return Object.freeze(slots);
}
