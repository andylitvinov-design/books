/**
 * User-approved eight self-rated meaning axes for personal video scripts.
 * These scores are subjective preferences, NOT psychometric or clinical tests.
 * Creative mapping to the existing meaning-idea engine is editorial.
 */
export const PERSONAL_EIGHT_AXES=Object.freeze([
 {id:"anchor",meaningAxisId:"anchor",photo:"morning-dew.jpg",labels:{ru:"Опора",en:"Support",es:"Apoyo"},
  descriptions:{ru:"Чувствовать безопасность",en:"Feel safe",es:"Sentir seguridad"}},
 {id:"connection",meaningAxisId:"connection",photo:"calm-sea.jpg",labels:{ru:"Связь",en:"Connection",es:"Vínculo"},
  descriptions:{ru:"Получать заботу и поддержку",en:"Receive care and support",es:"Recibir cuidado y apoyo"}},
 {id:"freedom",meaningAxisId:"freedom",photo:"coastal-freedom.jpg",labels:{ru:"Свобода",en:"Freedom",es:"Libertad"},
  descriptions:{ru:"Быть собой и выбирать",en:"Be yourself and choose",es:"Ser tú y elegir"}},
 {id:"agency",meaningAxisId:"agency",photo:"mountain-air.jpg",labels:{ru:"Сила",en:"Strength",es:"Fuerza"},
  descriptions:{ru:"Действовать и достигать",en:"Act and achieve",es:"Actuar y lograr"}},
 {id:"love",meaningAxisId:"connection",photo:"wildflower-dance.jpg",labels:{ru:"Любовь",en:"Love",es:"Amor"},
  descriptions:{ru:"Любить и быть любимым",en:"Love and be loved",es:"Amar y ser amado"}},
 {id:"dignity",meaningAxisId:"dignity",photo:"mossy-stream.jpg",labels:{ru:"Достоинство",en:"Dignity",es:"Dignidad"},
  descriptions:{ru:"Уважать и ценить себя",en:"Respect and value yourself",es:"Respetarte y valorarte"}},
 {id:"self-realization",meaningAxisId:"growth",photo:"sunbeam-flow.jpg",
  labels:{ru:"Самореализация",en:"Self-realization",es:"Autorrealización"},
  descriptions:{ru:"Раскрывать свой потенциал",en:"Realize your potential",es:"Desarrollar tu potencial"}},
 {id:"recognition",meaningAxisId:"dignity",photo:"golden-harvest.jpg",
  labels:{ru:"Признание",en:"Recognition",es:"Reconocimiento"},
  descriptions:{ru:"Быть замеченным, ценимым и влиятельным",en:"Be seen, valued and influential",es:"Ser visto, valorado e influyente"}}
].map(axis=>Object.freeze(axis)));
export const validAxisRating=x=>Number.isInteger(x)&&x>=1&&x<=10;
export function axisDifference(ratings){
 if(!ratings||!validAxisRating(ratings.now)||!validAxisRating(ratings.desired))return null;
 return ratings.desired-ratings.now;
}
export function completedAxisCount(scores){
 return PERSONAL_EIGHT_AXES.filter(axis=>axisDifference(scores?.[axis.id])!==null).length;
}
export function completedPersonalAxes(scores,focusId){
 return completedAxisCount(scores)===8&&PERSONAL_EIGHT_AXES.some(axis=>axis.id===focusId);
}