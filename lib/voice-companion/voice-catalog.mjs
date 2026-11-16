// Branded Studio-only voices: never claim these are system voices in private chat.
export const STUDIO_VOICE_PRESETS=Object.freeze([
 {id:'mark',providerVoice:'Enceladus',label:{ru:'Марк',en:'Mark',es:'Mark'}},
 {id:'alexander',providerVoice:'Charon',label:{ru:'Александр',en:'Alexander',es:'Alexander'}},
 {id:'leon',providerVoice:'Puck',label:{ru:'Леон',en:'Leon',es:'Leon'}},
 {id:'sofia',providerVoice:'Gacrux',label:{ru:'София',en:'Sofia',es:'Sofía'}},
 {id:'maya',providerVoice:'Sulafat',label:{ru:'Майя',en:'Maya',es:'Maya'}},
 {id:'alisa',providerVoice:'Zephyr',label:{ru:'Алиса',en:'Alice',es:'Alicia'}},
]);
const EXAMPLES=Object.freeze({
 ru:'Привет! Я виртуальный помощник Holistic House. Вы можете выбрать голос.',
 en:'Hello! I am the Holistic House AI assistant. You can choose a voice.',
 es:'¡Hola! Soy el asistente virtual de Holistic House. Puedes elegir una voz.',
});
export function publicPreviewText(locale){return EXAMPLES[locale]||EXAMPLES.en;}
export function normalizeSpeechRate(value){
 const v=Number(value);
 return Number.isFinite(v)?Math.max(0.75,Math.min(1.25,v)):1;
}
export function normalizeDeviceVoiceId(id,voices,locale){
 if(typeof id!=='string'||id.length>200||!id||!Array.isArray(voices))return '';
 const language=['ru','en','es'].includes(locale)?locale:'en';
 const found=voices.find(voice=>voice&&voice.voiceURI===id&&
  typeof voice.lang==='string'&&voice.lang.toLowerCase().replace('_','-').split('-')[0]===language);
 return found?found.voiceURI:'';
}
