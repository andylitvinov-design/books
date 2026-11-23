/** Eight first-party creative self-ratings; NOT a clinical scale or diagnosis. */
export const PERSONAL_EIGHT_AXES=Object.freeze([
 {id:"anchor",legacy:"anchor",image:"morning-dew.jpg",ru:["Опора","Чувствовать безопасность"],en:["Support","Feel safe and grounded"],es:["Apoyo","Sentir seguridad"]},
 {id:"connection",legacy:"connection",image:"calm-sea.jpg",ru:["Связь","Получать заботу и поддержку"],en:["Connection","Receive care and support"],es:["Vínculo","Recibir cuidado y apoyo"]},
 {id:"freedom",legacy:"freedom",image:"coastal-freedom.jpg",ru:["Свобода","Быть собой и выбирать"],en:["Freedom","Be yourself and choose"],es:["Libertad","Ser tú y poder elegir"]},
 {id:"agency",legacy:"agency",image:"mountain-air.jpg",ru:["Сила","Действовать и достигать"],en:["Strength","Act and achieve"],es:["Fuerza","Actuar y avanzar"]},
 {id:"love",legacy:"connection",image:"wildflower-dance.jpg",ru:["Любовь","Любить и быть любимым"],en:["Love","Love and be loved"],es:["Amor","Amar y ser amado"]},
 {id:"dignity",legacy:"dignity",image:"mossy-stream.jpg",ru:["Достоинство","Уважать и ценить себя"],en:["Dignity","Respect and value yourself"],es:["Dignidad","Respetarte y valorarte"]},
 {id:"self-realization",legacy:"growth",image:"sunbeam-flow.jpg",ru:["Самореализация","Раскрывать свой потенциал"],en:["Self-realization","Explore your potential"],es:["Realización personal","Desarrollar tu potencial"]},
 {id:"recognition",legacy:"dignity",image:"golden-harvest.jpg",ru:["Признание","Быть замеченным, ценимым и влиятельным"],en:["Recognition","Be seen, valued and influential"],es:["Reconocimiento","Ser visto, valorado e influyente"]}
].map(x=>Object.freeze(x)));
export const isAxisRating=n=>Number.isInteger(n)&&n>=1&&n<=10;
export const axisGap=score=>score&&isAxisRating(score.now)&&isAxisRating(score.desired)?score.desired-score.now:null;
export const axisCompletedCount=scores=>PERSONAL_EIGHT_AXES.filter(x=>axisGap(scores?.[x.id])!==null).length;
export const axesFormComplete=(scores,selected)=>axisCompletedCount(scores)===8&&PERSONAL_EIGHT_AXES.some(x=>x.id===selected);
