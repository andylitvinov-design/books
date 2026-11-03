import { traumaScaleGuidance } from './trauma-scale-guidance.js'
import { TRAUMA_SCREENING_DEFINITIONS } from '../../data/assessments/trauma-screening-2026.js'
const provenanceFields = { definitionId: 'id', definitionKey: 'key', definitionVersion: 'version', instrumentLocale: 'instrumentLocale', translationVersion: 'translationVersion', contentHash: 'contentHash', scoringKey: 'scoringKey', scoringVersion: 'scoringVersion', resultVersion: 'resultVersion', timeframe: 'timeframe' }
export function isTraumaResult(result, dimension) {
  return ['pcl-5','itq-adult'].includes(result?.definitionKey) || ['pcl5-trauma','itq-adult-trauma'].includes(result?.scoringKey) ||
    /^symptoms\.(pcl5|itq)\./.test(dimension?.key || '') || (Array.isArray(result?.dimensions) && result.dimensions.some(item => /^symptoms\.(pcl5|itq)\./.test(item?.key || '')))
}
export function exactTraumaResultDefinition(result) {
  const definition = TRAUMA_SCREENING_DEFINITIONS.find(d => Object.entries(provenanceFields).every(([field,key])=>result?.[field]===d[key]))
  if (!definition || !Array.isArray(result.dimensions) || result.dimensions.length !== definition.scoring.dimensions.length) return null
  if (definition.scoring.dimensions.some((spec,index)=>{
    const dimension=result.dimensions[index]
    return !dimension || dimension.key!==spec.key || dimension.min!==spec.min || dimension.max!==spec.max ||
      dimension.timeframe!==spec.timeframe || dimension.direction!=='non-normative' || dimension.dimensionClass!=='symptoms' ||
      dimension.sourceConstruct!==spec.sourceConstruct || dimension.unit!=='points' ||
      !Number.isInteger(dimension.value) || dimension.value<spec.min || dimension.value>spec.max
  })) return null
  return definition
}
export function traumaClassification(result, dimension, locale='en') {
  const definition=exactTraumaResultDefinition(result),ru=locale==='ru'
  if (!definition || !result.dimensions.includes(dimension)) return {
    basis:'unavailable',code:'invalid',label:ru?'Результат не подтверждён':'Unverified result',
    meaning:ru?'Версия или показатели не соответствуют проверенному инструменту.':'The version or dimensions do not match the verified instrument.',source:null,recommendedReview:false,
  }
  const guidance = traumaScaleGuidance(dimension, locale)
  return {basis:'descriptive',code:'continuous',label:ru?`Сумма ответов (0–${dimension.max})`:`Response sum (0–${dimension.max})`,
    construct: guidance?.construct || dimension.sourceConstruct,
    summary: guidance?.summary,
    meaning: guidance?.meaning || (ru ? 'Пояснение этой шкалы недоступно.' : 'An explanation for this scale is unavailable.'),
    source:definition.source.url,recommendedReview:false}
}
export function buildTraumaResultReport(result, locale='en') {
  const d=exactTraumaResultDefinition(result),ru=locale==='ru'
  const support=ru?'Обсудите беспокоящие вас симптомы с квалифицированным специалистом независимо от балла. Ответы не отслеживаются в реальном времени.':'Discuss concerning symptoms with a qualified professional regardless of the score. Responses are not monitored in real time.'
  const note=ru?'Оригинальная английская версия для взрослых. Русский текст отчёта не является валидированной русской адаптацией. Баллы не устанавливают диагноз, тяжесть состояния, вероятность заболевания или лечение.':'Original adult English form. Translated report text is not a validated questionnaire adaptation. Scores do not establish a diagnosis, severity category, probability of illness or treatment.'
  return {rulesVersion:'trauma-descriptive-v2',definitionVersion:result?.definitionVersion || null,
    title:ru?'Результаты опросника':'Questionnaire response scores',intro:note,purpose:d?.title || (ru?'Результат не подтверждён':'Unverified result'),
    methodology:note,personalityType:null,contextNote:d?.key==='itq-adult'?(ru?'Вопросы P1–P6 относятся к последнему месяцу; C1–C6 — к привычным проявлениям. Показатели нарушения функционирования не входят в суммы симптомов.':'P1–P6 refer to the past month; C1–C6 refer to typical patterns. Functional-impairment items are excluded from symptom sums.'):(ru?'Форма включает вопросы Criterion A. Они сами по себе не подтверждают критерий или диагноз.':'The form includes Criterion A questions. Those responses do not themselves confirm the criterion or a diagnosis.'),
    sections:(Array.isArray(result?.dimensions)?result.dimensions:[]).map(dimension=>{
      const classification=traumaClassification(result,dimension,locale)
      return {key:dimension.key,domain:'general',title:classification.construct || dimension.sourceConstruct,construct:classification.construct || dimension.sourceConstruct,value:dimension.value,min:dimension.min,max:dimension.max,
        meaning:classification.meaning,summary:classification.summary,band:classification.label,bandBasis:classification.basis,source:classification.source,steps:[],followUp:d?[traumaScaleGuidance(dimension,locale)?.observation,support].filter(Boolean).join(' '):classification.meaning,recommendedReview:false}
    }),note,seekSupport:d?support:null}
}
