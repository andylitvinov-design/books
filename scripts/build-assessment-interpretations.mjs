import { gzipSync } from 'node:zlib'
import { preparePersonalityRules } from './prepare-personality-interpretation-rules.mjs'
// Offline compiler: prepared content only. Does not connect to a database.
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { ASSESSMENT_DEFINITIONS, provenance } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { evaluateBachAnswers } from '../lib/assessments/bach-profile.js'
import { canonicalJSON } from '../lib/assessments/contracts.js'
import { buildAuthoredAssessmentResultReport as author } from '../lib/assessments/result-report-authoring.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { STORED_INTERPRETATION_VERSION as version } from '../lib/assessments/stored-interpretation.js'
const output = new URL('../data/assessment-interpretations/', import.meta.url)
const clone = value => JSON.parse(JSON.stringify(value))
const without = (value, keys) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)))
function delta(base, current) {
  const diff = {}
  for (const [key, value] of Object.entries(current)) {
    if (canonicalJSON(base[key] ?? null) === canonicalJSON(value ?? null)) continue
    diff[key] = value && typeof value === 'object' && !Array.isArray(value) && base[key] && typeof base[key] === 'object' && !Array.isArray(base[key]) ? delta(base[key], value) : value
  }
  return diff
}
function scores(definition, dimension) {
  const spec = definition.scoring?.dimensions.find(d => d.key === dimension.key)
  if (!spec) return Array.from({length:dimension.max-dimension.min+1}, (_,i)=>dimension.min+i)
  const questions = spec.items.map(id=>definition.questions.find(q=>q.id===id))
  const low = questions.reduce((sum,q)=>sum+(q.min??definition.answerScale.min),0)
  const high = questions.reduce((sum,q)=>sum+(q.max??definition.answerScale.max),0)
  const values = new Set()
  for (let sum=low;sum<=high;sum++) {
    const raw = spec.method==='mean'?sum/questions.length:spec.method==='capped_sum'?Math.min(spec.cap,sum):spec.method==='healthy_days'?spec.cap-Math.min(spec.cap,sum):sum
    values.add(Math.round(raw*(spec.multiplier||1)*100)/100)
  }
  return [...values].sort((a,b)=>a-b)
}
function sectionContent(section, locale) {
  const content = clone(without(section, section.explanation ? ['value','meaning'] : ['value']))
  if (content.explanation) {
    const number = new Intl.NumberFormat(locale, {maximumFractionDigits:2}).format(section.value)
    for (const prefix of [': ', '= ', 'result ', 'результат ']) {
      const exact = prefix + number + '.'
      if (content.explanation.calculation.includes(exact)) {
        content.explanation.calculation = content.explanation.calculation.replace(exact, prefix + '{score}.')
        break
      }
    }
    for (const prefix of ['The mean of ', 'Средний балл ', 'so ', 'поэтому '])
      content.explanation.reading = content.explanation.reading.replace(prefix + number + ' ', prefix + '{score} ')
  }
  return content
}
function bachScores(definition, name) {
  const questions=definition.questions.filter(q=>q.remedy===name), values=new Set(),answers={}
  function visit(index) {
    if(index===questions.length){values.add(evaluateBachAnswers(questions,answers).find(row=>row.remedy===name).total);return}
    const q=questions[index]
    for(let value=q.min??definition.answerScale.min;value<=(q.max??definition.answerScale.max);value++){answers[q.id]=value;visit(index+1)}
  }
  visit(0);return [...values].sort((a,b)=>a-b)
}
function compile(definition, locale) {
  const sample = scoreAssessment(definition, Object.fromEntries(definition.questions.map(q=>[q.id,q.min??definition.answerScale.min])))
  const baseReport = author(sample,locale)
  if (baseReport.status==='unavailable' || baseReport.sections.length!==sample.dimensions.length) throw new Error('Authoring coverage missing '+definition.id)
  const common = {schemaVersion:1,interpretationVersion:version,identity:provenance(definition),uiLocale:locale,
    report:{...without(baseReport,['sections','seekSupport','highlightedCount','personalityType']),scaleGuide:getTestScaleGuide(definition.key,locale)}}
  if (definition.key==='hh-bach-flower-profile') {
    const maxResult=scoreAssessment(definition,Object.fromEntries(definition.questions.map(q=>[q.id,q.max??definition.answerScale.max])))
    const marked=author(maxResult,locale)
    return {...common,kind:'bach',markedReport:{...without(marked,['sections','seekSupport','highlightedCount']),scaleGuide:common.report.scaleGuide},
      zeroMeaning:baseReport.sections[0].meaning,
      endorsedMeaning:locale==='ru'
        ? 'Вы отметили {evidenceCount} утверждений из разделов: {sections}. Суммарный вес совпадений — {value}. Это относительная выраженность традиционной темы Баха, а не клиническая шкала или показание к лечению.'
        : 'You endorsed {evidenceCount} statements in: {sections}. Weighted match: {value}. This describes the relative presence of a traditional Bach theme, not clinical severity or an indication for treatment.',
      sectionLabels:locale==='ru'?{situation:'текущая ситуация',character:'повторяющиеся паттерны',control:'контрольный срез'}:{situation:'present situation',character:'recurring patterns',control:'cross-check'},
      supportKeys:maxResult.dimensions.filter(d=>['Sweet Chestnut','Rock Rose','Gorse'].includes(d.sourceConstruct)).map(d=>d.key),supportText:marked.seekSupport,
      scales:baseReport.sections.map(section=>({key:section.key,base:without(section,['value','meaning','group']),scores:bachScores(definition,sample.dimensions.find(d=>d.key===section.key).sourceConstruct),maxEvidence:definition.questions.filter(q=>q.remedy===sample.dimensions.find(d=>d.key===section.key).sourceConstruct).length}))}
  }
  let supportText=baseReport.seekSupport
  const scales=sample.dimensions.map(dimension=>{
    const base=sectionContent(baseReport.sections.find(section=>section.key===dimension.key),locale), groups=new Map()
    for(const value of scores(definition,dimension)) {
      const changed={...sample,dimensions:sample.dimensions.map(d=>d.key===dimension.key?{...d,value}:d)}
      const report=author(changed,locale)
      if(report.status==='unavailable')throw new Error('Invalid compiled score '+definition.key+'/'+dimension.key+'/'+value)
      if(report.seekSupport)supportText=report.seekSupport
      const patch=delta(base,sectionContent(report.sections.find(section=>section.key===dimension.key),locale))
      const key=canonicalJSON(patch)
      if(!groups.has(key))groups.set(key,{scores:[],delta:patch})
      groups.get(key).scores.push(value)
    }
    return {key:dimension.key,base,cases:[...groups.values()]}
  })
  return {...common,kind:'numeric',requiresType:Boolean(baseReport.personalityType),typeRules:preparePersonalityRules(sample,locale),categoryReferenceLabel:locale==='ru'?'Источник диапазонов: ':'Category reference: ',
    support:{always:Boolean(baseReport.seekSupport)&&!baseReport.sections.some(s=>s.recommendedReview),text:supportText},scales}
}
await mkdir(output,{recursive:true})
const records=[]
for(const definition of ASSESSMENT_DEFINITIONS)for(const locale of ['en','ru']) {
  const payload=compile(definition,locale)
  records.push({definitionId:definition.id,uiLocale:locale,interpretationVersion:version,payloadHash:'sha256:'+createHash('sha256').update(canonicalJSON(payload)).digest('hex'),payload})
}
const raw=JSON.stringify({version,records})+'\n', compressed=gzipSync(raw,{level:9})
await writeFile(new URL(version+'.json.gz',output),compressed)
await writeFile(new URL(version+'.manifest.json',output),JSON.stringify({version,format:'gzip-compressed JSON',records:records.length,definitions:ASSESSMENT_DEFINITIONS.length,
  artifactSha256:createHash('sha256').update(compressed).digest('hex'),uncompressedBytes:Buffer.byteLength(raw),compressedBytes:compressed.length,
  entries:records.map(row=>({definitionId:row.definitionId,key:row.payload.identity.definitionKey,definitionVersion:row.payload.identity.definitionVersion,instrumentLocale:row.payload.identity.instrumentLocale,uiLocale:row.uiLocale,payloadHash:row.payloadHash,scales:row.payload.scales.length}))},null,2)+'\n')
console.log(JSON.stringify({records:records.length,definitions:ASSESSMENT_DEFINITIONS.length,bytes:Buffer.byteLength(JSON.stringify({version,records})),cases:records.reduce((n,r)=>n+r.payload.scales.reduce((a,s)=>a+(s.cases?.length||0),0),0)}))
