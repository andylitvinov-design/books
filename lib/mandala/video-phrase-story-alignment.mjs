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

/**
 * Slots are 0-based film scene indices. We preserve original phrase order and
 * no more than one phrase per shot. More than 6 phrases retain previous
 * one-per-shot placement; never truncate an approved transcript.
 */
export function proposeGoalPhraseSlots(phrases,{goalSelected=false,sceneCount=6,
  manualPlacements=false}={}){
 if(!goalSelected||manualPlacements||sceneCount!==6||
   !Array.isArray(phrases)||phrases.length>6)return null;
 const selected=phrases.map(clean).filter(Boolean);
 if(selected.length!==phrases.length||selected.some(x=>RISK.test(x)))return null;
 const n=selected.length,slots=Array(6).fill(null);
 if(!n)return Object.freeze(slots);
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
