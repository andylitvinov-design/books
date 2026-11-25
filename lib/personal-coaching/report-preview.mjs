import {validateCoachingReportV2} from './report-v2.js'

const labels={
  en:{
    sessionOverview:'Session overview',initialSituation:'Initial situation',desiredOutcome:'Desired outcome',
    keyDiscoveries:'Key discoveries',mainObstacles:'Main obstacles',strengthsResources:'Strengths & resources',
    newPerspective:'New perspective',decisions:'Decisions',actionPlan:'Action plan',followUp:'Follow-up',
    notCaptured:'Not captured in this session',noAction:'No action was recorded.',seeActions:'Review the action options below.',
    draft:'For review',accepted:'Previously confirmed',deferred:'Deferred',declined:'Declined',
  },
  ru:{
    sessionOverview:'Обзор сессии',initialSituation:'Исходная ситуация',desiredOutcome:'Желаемый результат',
    keyDiscoveries:'Ключевые открытия',mainObstacles:'Основные препятствия',strengthsResources:'Сильные стороны и ресурсы',
    newPerspective:'Новый взгляд',decisions:'Решения',actionPlan:'План действий',followUp:'Продолжение',
    notCaptured:'В этой сессии не зафиксировано',noAction:'Действие не было зафиксировано.',seeActions:'Варианты действий представлены ниже.',
    draft:'Для рассмотрения',accepted:'Ранее подтверждено',deferred:'Отложено',declined:'Отклонено',
  },
  es:{
    sessionOverview:'Resumen de la sesión',initialSituation:'Situación inicial',desiredOutcome:'Resultado deseado',
    keyDiscoveries:'Descubrimientos clave',mainObstacles:'Obstáculos principales',strengthsResources:'Fortalezas y recursos',
    newPerspective:'Nueva perspectiva',decisions:'Decisiones',actionPlan:'Plan de acción',followUp:'Seguimiento',
    notCaptured:'No se registró en esta sesión',noAction:'No se registró ninguna acción.',seeActions:'Revisa las opciones de acción a continuación.',
    draft:'Para revisar',accepted:'Confirmado anteriormente',deferred:'Pospuesto',declined:'Rechazado',
  },
}
const order=[
  'sessionOverview','initialSituation','desiredOutcome','keyDiscoveries','mainObstacles',
  'strengthsResources','newPerspective','decisions','actionPlan','followUp',
]
function overviewText(section,locale,copy){
  const meta=section?.metadata||{}
  const parts=[]
  if(typeof meta.modelKey==='string'&&meta.modelKey.trim())parts.push(meta.modelKey.replace(/_v\d+$/,'').toUpperCase())
  if(Number.isSafeInteger(meta.durationSeconds)&&meta.durationSeconds>0){
    const minutes=Math.round(meta.durationSeconds/60)
    parts.push(locale==='ru'?minutes+' мин':locale==='es'?minutes+' min':minutes+' min')
  }
  const date=meta.completedAt
  if(typeof date==='string'&&Number.isFinite(Date.parse(date))){
    try{parts.push(new Intl.DateTimeFormat(locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-CA',{day:'numeric',month:'long',year:'numeric'}).format(new Date(date)))}catch{}
  }
  return parts.join(' · ')||copy.notCaptured
}
export function reportPreviewRows(report,locale){
  if(report?.schemaVersion!=='coaching-session-report.v2')throw new Error('COACHING_REPORT_VERSION_INVALID')
  if(!validateCoachingReportV2(report).valid)throw new Error('COACHING_REPORT_INVALID')
  const lang=labels[locale]?locale:'en',copy=labels[lang]
  const sections=order.map(key=>{
    const section=report.sections[key]
    let value=key==='sessionOverview'?overviewText(section,lang,copy):section.text
    if(key==='actionPlan')value=report.actionCandidates.length?copy.seeActions:copy.noAction
    if(section.status==='not_captured'&&key!=='actionPlan')value=copy.notCaptured
    return {key,label:copy[key],text:typeof value==='string'&&value.trim()?value:copy.notCaptured,status:section.status}
  })
  const actions=report.actionCandidates.map(item=>({id:item.candidateId,text:item.text,status:item.status,statusLabel:copy[item.status]}))
  return {sections,actions}
}
