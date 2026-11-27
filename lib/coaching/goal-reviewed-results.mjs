// A client-facing read-only projection of an already saved, normalized private protocol.
// Never a course-run binding, timer proof, measurement, or goal achievement claim.
import {coachCourseProtocolRows} from './coach-course-protocol-schema.mjs'
const titles={
 goal_result:['My goal and starting point','Моя цель и точка старта','Mi meta y punto de partida'],
 goal_motivation:['My future vision','Мой образ будущего','Mi visión del futuro'],
 goal_plan:['My path to the goal','Мой маршрут к цели','Mi ruta hacia la meta'],
 goal_resources:['My strengths and support','Моя карта силы и поддержки','Mi mapa de fortalezas y apoyo'],
 goal_obstacles:['My obstacle response plan','Мой план преодоления препятствий','Mi plan ante obstáculos'],
 goal_possibilities:['My map of possibilities','Моя карта возможностей','Mi mapa de posibilidades'],
 goal_acceleration:['My progress and sustainable pace','Мой прогресс и устойчивый темп','Mi progreso y ritmo sostenible'],
 goal_integration:['My results and next possibilities','Мои результаты и новые перспективы','Mis resultados y nuevas perspectivas']
}
const copy={
 en:{confirmed:'Client-reviewed answers',missing:'Not confirmed',skip:'Skipped by client',note:'Saved session answers reviewed by the client. This is not evidence of course completion or achievement of the goal.'},
 ru:{confirmed:'Подтверждённые клиентом ответы',missing:'Не подтверждено',skip:'Пропущено клиентом',note:'Ответы из сохранённого протокола, проверенные клиентом. Это не подтверждение завершения курса или достижения цели.'},
 es:{confirmed:'Respuestas revisadas por el cliente',missing:'Sin confirmar',skip:'Omitido por el cliente',note:'Respuestas del protocolo guardado revisadas por el cliente. No acreditan la finalización del curso ni el logro de la meta.'}
}
export function isGoalReviewedResult(id){return typeof id==='string'&&Object.hasOwn(titles,id)}
export function goalReviewedResult(protocol,locale='en'){
 if(!isGoalReviewedResult(protocol?.courseSessionId))return null;
 const lang=Object.hasOwn(copy,locale)?locale:'en',c=copy[lang],i=lang==='ru'?1:lang==='es'?2:0;
 const rows=coachCourseProtocolRows(protocol.courseSessionId,protocol.turns,protocol.courseFieldReview,lang).map(row=>{
  const confirmed=row.status==='confirmed'&&row.source==='client_reviewed_quote'&&typeof row.quote==='string'&&row.quote.trim().length>0&&Number.isInteger(row.turnIndex)&&row.turnIndex>=0;
  return {id:row.id,label:row.label,status:confirmed?'confirmed':row.status==='skipped_by_client'?'skipped':'missing',answer:confirmed?row.quote:null}
 });
 const confirmed=rows.filter(r=>r.status==='confirmed').length;
 return {title:titles[protocol.courseSessionId][i],rows,confirmed,total:rows.length,completeness:rows.length>0&&confirmed===rows.length?'complete':'partial',caption:c.confirmed+' '+confirmed+'/'+rows.length,note:c.note,overview:[c.confirmed+' '+confirmed+'/'+rows.length,...rows.map(r=>r.label+': '+(r.status==='confirmed'?r.answer:r.status==='skipped'?c.skip:c.missing))].join('\n')}
}
