// Visual-only coach characters. Do not derive a person's emotion from their answers.
export const COACH_AVATAR_OPTIONS=Object.freeze([
 {id:'warm',labels:{en:'Warm guide',ru:'Тёплый наставник',es:'Guía cálido'},
  bg:'#e5f4e8',shirt:'#16856d',hair:'#543e36',skin:'#efc8a7',
  hairPath:'M30 74 Q16 22 69 21 Q128 13 121 82 Q108 51 94 43 Q59 58 39 49 Z'},
 {id:'clear',labels:{en:'Clear strategist',ru:'Ясный стратег',es:'Estratega claro'},
  bg:'#e5f3f5',shirt:'#316e89',hair:'#4b423b',skin:'#efc7ad',
  hairPath:'M30 66 Q27 24 69 26 Q103 19 114 56 L110 66 Q97 45 77 46 Q47 42 35 72 Z'},
 {id:'calm',labels:{en:'Calm companion',ru:'Спокойный проводник',es:'Guía sereno'},
  bg:'#f5eafa',shirt:'#76649b',hair:'#614b44',skin:'#eac09c',
  hairPath:'M28 70 Q13 16 71 20 Q128 20 124 70 L127 122 L115 124 Q110 85 110 59 Q87 51 67 41 Q42 59 40 72 L36 123 L25 123 Z'},
]);
export function coachingVisualAvatarId(modelKey){
 const key=String(modelKey||'').toLowerCase();
 if(/grow|woop|goal|business|decision|strategy|career/.test(key))return 'clear';
 if(/stress|somatic|body|relax|breath|support|oskar/.test(key))return 'calm';
 return 'warm';
}
export function normalizeAvatarSpeechEvent(event){
 const phase=['idle','speaking','paused'].includes(event?.phase)?event.phase:'idle';
 const raw=Number(event?.beat);
 const beat=Number.isFinite(raw)?Math.max(0,Math.trunc(raw))%4:0;
 return {phase,beat};
}
