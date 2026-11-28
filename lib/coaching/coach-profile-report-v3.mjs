import {OUTER_VECTOR_ITEMS,INNER_VECTOR_ITEMS} from '../profile/development-vectors.mjs'
import {coachProfileArchiveEnvelope} from './coach-profile-archive-v3.mjs'
const labels={
 ru:{outer:'Колесо жизненного баланса',inner:'Оси Смысла: Внутренний рост',current:'Сейчас',desired:'Желаемое',confirmed:'Подтверждено',needs_confirmation:'Требует уточнения',not_explored:'Не исследовано',skipped_by_client:'Пропущено',partial:'Частичные результаты',complete:'Оценки собраны'},
 en:{outer:'Wheel of Life',inner:'Meaning Axes: Inner Growth',current:'Now',desired:'Desired',confirmed:'Confirmed',needs_confirmation:'Needs confirmation',not_explored:'Not explored',skipped_by_client:'Skipped',partial:'Partial results',complete:'Ratings collected'},
 es:{outer:'Rueda de la vida',inner:'Ejes de sentido: Crecimiento interior',current:'Ahora',desired:'Deseado',confirmed:'Confirmado',needs_confirmation:'Requiere confirmación',not_explored:'Sin explorar',skipped_by_client:'Omitido',partial:'Resultados parciales',complete:'Valoraciones recogidas'}
}
export function coachSavedProfileV3(protocol,locale='en'){
 let envelope
 try{envelope=coachProfileArchiveEnvelope(protocol)}catch{return null}
 if(!envelope)return null
 const {block}=envelope.value,s=block.snapshot,lang=labels[locale]?locale:'en',t=labels[lang]
 const items=block.track==='outer'?OUTER_VECTOR_ITEMS:INNER_VECTOR_ITEMS
 const slot=value=>({value:value.status==='confirmed'?value.value:null,status:value.status,label:t[value.status]})
 return {track:block.track,title:t[block.track],status:s.status,statusLabel:t[s.status],currentLabel:t.current,desiredLabel:t.desired,
  priority:{status:s.priority.status,label:t[s.priority.status],axisIds:[...s.priority.axisIds]},
  rows:s.ratings.map((row,index)=>({id:row.axis,label:items[index].name[lang],current:slot(row.current),desired:slot(row.desired),priority:s.priority.axisIds.includes(row.axis)}))}
}
export function coachSavedProfileV3Text(protocol,locale='en'){
 const p=coachSavedProfileV3(protocol,locale)
 if(!p)return ''
 const value=field=>field.value===null?field.label:String(field.value)
 return [p.title+' · '+p.statusLabel,...p.rows.map(row=>row.label+': '+p.currentLabel+' '+value(row.current)+' / '+p.desiredLabel+' '+value(row.desired))].join('\n')
}
