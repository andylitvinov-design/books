/**
 * Subjective, optional video check-in. Not a clinical instrument and not a
 * causal efficacy claim. Keep raw responses on the current device only.
 */
export const VIDEO_EFFECT_AREAS=Object.freeze([
  {id:'calm',label:{ru:'Внутреннее спокойствие',en:'Inner calm',es:'Calma interior'}},
  {id:'mood',label:{ru:'Настроение',en:'Mood',es:'Estado de ánimo'}},
  {id:'clarity',label:{ru:'Ясность мыслей',en:'Mental clarity',es:'Claridad mental'}},
  {id:'energy',label:{ru:'Энергия',en:'Energy',es:'Energía'}},
  {id:'confidence',label:{ru:'Уверенность в себе',en:'Self-confidence',es:'Confianza en mí'}},
  {id:'support',label:{ru:'Ощущение поддержки',en:'Feeling supported',es:'Sentir apoyo'}},
  {id:'readiness',label:{ru:'Готовность действовать',en:'Readiness to act',es:'Disposición a actuar'}},
]);

export function isVideoEffectScore(value){
  return Number.isInteger(value)&&value>=0&&value<=10;
}

export function completeVideoEffectScores(scores){
  return Array.isArray(scores)&&scores.length===VIDEO_EFFECT_AREAS.length&&
    scores.every(isVideoEffectScore);
}

export function compareVideoEffectScores(before,after){
  if(!completeVideoEffectScores(before)||!completeVideoEffectScores(after))
    throw new TypeError('video_effect_scores_require_seven_answers_0_to_10');
  const rows=VIDEO_EFFECT_AREAS.map((area,index)=>({
    id:area.id,before:before[index],after:after[index],delta:after[index]-before[index],
  }));
  const sum=values=>values.reduce((a,b)=>a+b,0);
  return {
    rows,
    improved:rows.filter(row=>row.delta>0).length,
    unchanged:rows.filter(row=>row.delta===0).length,
    decreased:rows.filter(row=>row.delta<0).length,
    meanBefore:Math.round(sum(before)/before.length*10)/10,
    meanAfter:Math.round(sum(after)/after.length*10)/10,
    meanDelta:Math.round((sum(after)-sum(before))/before.length*10)/10,
  };
}
