/**
 * Optional Telegram self-report during and after a real video job.
 * Pure state machine, no provider, database, transport, or clinical inference.
 * Stored only inside the encrypted, authenticated AI-thread payload.
 */
export const VIDEO_EFFECT_AXES=Object.freeze([
 {id:'calm',ru:'Внутреннее спокойствие',en:'Inner calm',es:'Calma interior'},
 {id:'mood',ru:'Настроение',en:'Mood',es:'Estado de ánimo'},
 {id:'clarity',ru:'Ясность мыслей',en:'Mental clarity',es:'Claridad mental'},
 {id:'energy',ru:'Энергия',en:'Energy',es:'Energía'},
 {id:'confidence',ru:'Уверенность в себе',en:'Self-confidence',es:'Confianza en mí'},
 {id:'support',ru:'Ощущение поддержки',en:'Feeling supported',es:'Sentir apoyo'},
 {id:'readiness',ru:'Готовность действовать',en:'Readiness to act',es:'Disposición a actuar'}
]);
const STRINGS={
 ru:{title:'Давайте отследим эффект. Это 7 добровольных оценок от 0 до 10 (0 — совсем нет, 10 — максимально).',
   question:'До просмотра',post:'После просмотра',wait:'Первый замер сохранён. Видео готовится; после просмотра предложу повторить оценки.',
   reaction:'Вам понравилось видео?',watched:'Спасибо за отзыв. Когда закончите просмотр, отправьте /watched — повторим 7 оценок.',
   introPost:'Вы посмотрели видео. Оцените состояние по тем же 7 шкалам.',
   skip:'Замер пропущен. Без двух полных замеров нельзя рассчитать изменение.',
   incomplete:'Первый замер не завершён до получения видео: сравнение недоступно, но можно оценить состояние после.',
   invalid:'Выберите число от 0 до 10.',summary:'Ваше субъективное изменение сразу после видео',
   noBaseline:'Исходные 7 оценок отсутствуют. Причинный эффект определить нельзя.',
   disclaimer:'Самооценка не доказывает лечебного или причинного действия видео.',
   cancel:'Оценка остановлена. Вы можете продолжать чат.',yes:'Да',no:'Нет',soSo:'Так себе'},
 en:{title:'Let’s track how you feel: 7 optional 0–10 ratings (0 = not at all, 10 = as much as possible).',
   question:'Before watching',post:'After watching',wait:'Your first check-in is saved. Your video is rendering; I’ll offer a retest after watching.',
   reaction:'Did you like the video?',watched:'Thanks for your feedback. After you finish watching, send /watched to repeat the seven ratings.',
   introPost:'You watched your video. Rate the same seven areas again.',
   skip:'Check-in skipped. A change cannot be calculated without two complete check-ins.',
   incomplete:'You did not finish the first check-in before delivery. You can still rate your after state, without a comparison.',
   invalid:'Choose a number from 0 to 10.',summary:'Your subjective change immediately after the video',
   noBaseline:'The initial seven scores are missing. A causal effect cannot be determined.',
   disclaimer:'Self-ratings do not prove a therapeutic or causal benefit from the video.',
   cancel:'Check-in stopped. You can continue chatting.',yes:'Yes',no:'No',soSo:'So-so'},
 es:{title:'Vamos a medir cómo te sientes: 7 valoraciones opcionales de 0 a 10.',
   question:'Antes de verlo',post:'Después de verlo',wait:'Evaluación inicial guardada. El vídeo se está creando. Después podrás repetirla.',
   reaction:'¿Te gustó el vídeo?',watched:'Gracias. Cuando termines de verlo, envía /watched para repetir las 7 valoraciones.',
   introPost:'Ya has visto el vídeo. Evalúa los mismos siete aspectos.',
   skip:'Evaluación omitida. No podemos calcular cambios sin dos series completas.',
   incomplete:'La evaluación inicial quedó incompleta. Puedes evaluar el estado posterior, pero sin comparación.',
   invalid:'Elige un número del 0 al 10.',summary:'Tu cambio subjetivo inmediato después del vídeo',
   noBaseline:'Faltan las siete puntuaciones iniciales; no se puede demostrar un efecto causal.',
   disclaimer:'Estas autoevaluaciones no demuestran un beneficio terapéutico causado por el vídeo.',
   cancel:'Evaluación detenida. Puedes seguir conversando.',yes:'Sí',no:'No',soSo:'Regular'}
};
const LOCALES=new Set(['ru','en','es']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function effectLocale(raw){return LOCALES.has(raw)?raw:'en'}
export function isVideoEffectScore(v){return Number.isInteger(v)&&v>=0&&v<=10}
export function beginVideoEffect(jobId,locale='en'){
 if(!UUID.test(jobId))throw Error('VIDEO_EFFECT_JOB_ID_INVALID');
 return {v:1,jobId,locale:effectLocale(locale),phase:'before',before:[],after:[],
    reaction:null,videoAccepted:false,watched:false};
}
export function videoEffectQuestion(state){
 if(!state||!['before','after'].includes(state.phase))return null;
 const scores=state.phase==='before'?state.before:state.after;
 if(scores.length>=7)return null;
 const t=STRINGS[effectLocale(state.locale)],axis=VIDEO_EFFECT_AXES[scores.length];
 return (state.phase==='before'?t.question:t.post)+': '+(scores.length+1)+'/7 — '+axis[effectLocale(state.locale)]+' (0–10)';
}
export function videoEffectChoiceKeys(locale){const t=STRINGS[effectLocale(locale)];return [t.yes,t.no,t.soSo]}
const reactionOf=(raw,locale)=>{
 const text=String(raw||'').trim().toLowerCase();
 const t=STRINGS[effectLocale(locale)];
 if([t.yes.toLowerCase(),'да','yes','sí','si'].includes(text))return 'yes';
 if([t.no.toLowerCase(),'нет','no'].includes(text))return 'no';
 if([t.soSo.toLowerCase(),'так себе','so-so','regular'].includes(text))return 'so-so';
 return null;
};
export function videoEffectResults(state){
 if(!state||state.phase!=='done'||state.after.length!==7||
   !state.after.every(isVideoEffectScore))return null;
 const completeBefore=state.before.length===7&&state.before.every(isVideoEffectScore);
 const rows=VIDEO_EFFECT_AXES.map((axis,i)=>({
   id:axis.id,before:completeBefore?state.before[i]:null,after:state.after[i],
   delta:completeBefore?state.after[i]-state.before[i]:null
 }));
 return {rows,hasBaseline:completeBefore,
   improved:rows.filter(x=>x.delta>0).length,
   decreased:rows.filter(x=>x.delta<0).length,
   unchanged:rows.filter(x=>x.delta===0).length};
}
export function videoEffectSummary(state){
 const result=videoEffectResults(state);if(!result)return null;
 const locale=effectLocale(state.locale),t=STRINGS[locale];
 const sign=n=>n>0?'+'+n:String(n);
 const lines=result.rows.map((row,i)=>{
   const label=VIDEO_EFFECT_AXES[i][locale];
   return result.hasBaseline?label+': '+row.before+' → '+row.after+' ('+sign(row.delta)+')':
     label+': '+row.after+'/10';
 });
 return [t.summary,...lines, ...(!result.hasBaseline?[t.noBaseline]:[]),t.disclaimer].join('\n');
}
export function markVideoEffectDelivered(state){
 if(!state||state.v!==1||state.videoAccepted)return {state,changed:false};
 const next={...state,videoAccepted:true};
 if(['before','waiting'].includes(state.phase))next.phase='reaction';
 return {state:next,changed:true,text:(state.before.length===7?'':STRINGS[effectLocale(state.locale)].incomplete+'\n')+
  STRINGS[effectLocale(state.locale)].reaction,
  buttons:videoEffectChoiceKeys(state.locale)};
}
export function advanceVideoEffect(state,raw){
 if(!state||state.v!==1||typeof raw!=='string'||!['before','waiting','reaction','watch','after'].includes(state.phase))
  return {handled:false,state};
 const t=STRINGS[effectLocale(state.locale)],text=raw.trim();
 if(/^\/(?:stop_checkin|skip_checkin)$/i.test(text))
  return {handled:true,state:{...state,phase:'cancelled'},text:t.cancel};
 if(state.phase==='waiting')return {handled:false,state};
 if(state.phase==='reaction'){
  const response=reactionOf(text,state.locale);
  if(!response)return {handled:false,state};
  return {handled:true,state:{...state,reaction:response,phase:'watch'},text:t.watched};
 }
 if(state.phase==='watch'){
  if(!/^\/watched$/i.test(text))return {handled:false,state};
  const next={...state,watched:true,phase:'after'};
  return {handled:true,state:next,text:t.introPost+'\n'+videoEffectQuestion(next),scoreButtons:true};
 }
 if(!/^(?:10|[0-9])$/.test(text))return {handled:false,state};
 const value=Number(text);
 if(!isVideoEffectScore(value))return {handled:false,state};
 const kind=state.phase,values=state[kind].concat(value);
 if(values.length>7)return {handled:false,state};
 const phase=values.length===7?(kind==='before'?'waiting':'done'):kind;
 const next={...state,[kind]:values,phase};
 return {handled:true,state:next,
  text:phase==='done'?videoEffectSummary(next):
    phase==='waiting'?t.wait:videoEffectQuestion(next),
  scoreButtons:phase===kind};
}
export function videoEffectIntro(locale,state){
 const t=STRINGS[effectLocale(locale)];
 return t.title+'\n'+videoEffectQuestion(state);
}
