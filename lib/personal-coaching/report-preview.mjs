import {validateCoachingReportV2} from './report-v2.js'

const labels={
  en:{clientFocus:'Your focus',mainDifficulty:'Current difficulty',desiredResult:'Desired result',draft:'For review',accepted:'Previously confirmed',deferred:'Deferred',declined:'Declined'},
  ru:{clientFocus:'Ваш фокус',mainDifficulty:'Текущая трудность',desiredResult:'Желаемый результат',draft:'Для рассмотрения',accepted:'Ранее подтверждено',deferred:'Отложено',declined:'Отклонено'},
  es:{clientFocus:'Tu enfoque',mainDifficulty:'Dificultad actual',desiredResult:'Resultado deseado',draft:'Para revisar',accepted:'Confirmado anteriormente',deferred:'Pospuesto',declined:'Rechazado'},
}
export function reportPreviewRows(report,locale){
  if(report?.schemaVersion!=='coaching-session-report.v2')throw new Error('COACHING_REPORT_VERSION_INVALID')
  if(!validateCoachingReportV2(report).valid)throw new Error('COACHING_REPORT_INVALID')
  const copy=labels[locale]||labels.en
  const sections=['clientFocus','mainDifficulty','desiredResult'].flatMap(key=>{
    const text=report.outcome?.[key]?.text
    return typeof text==='string'&&text.trim()?[{key,label:copy[key],text}]:[]
  })
  const actions=report.actionCandidates.map(item=>({id:item.candidateId,text:item.text,status:item.status,statusLabel:copy[item.status]}))
  return {sections,actions}
}
