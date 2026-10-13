import {validSupportGoal} from './course-targets.js'
import { resolveStoredPersonalityType, storedPersonalityKind, validStoredPersonalityRules } from './stored-personality-type.js'
import { verifiedResult, interpretationUnavailable } from './result-integrity.js'
import { rankBachDimensions } from './bach-profile.js'
export const STORED_INTERPRETATION_VERSION = '2026-10-12.v2'
export const INTERPRETATION_IDENTITY_KEYS = Object.freeze(['definitionId','definitionKey','definitionVersion','instrumentLocale','translationVersion','contentHash','scoringKey','scoringVersion','resultVersion','timeframe'])
export function matchingIdentity(result, identity) {
  return Boolean(identity && INTERPRETATION_IDENTITY_KEYS.every(key => result[key] === identity[key]))
}
function merge(base, delta) {
  const value = structuredClone(base)
  for (const [key, part] of Object.entries(delta || {})) {
    value[key] = part && typeof part === 'object' && !Array.isArray(part) && value[key] && typeof value[key] === 'object' && !Array.isArray(value[key])
      ? merge(value[key], part) : structuredClone(part)
  }
  return value
}
function formatStored(value, number) {
  if (typeof value === 'string') return value.replaceAll('{score}', number)
  if (Array.isArray(value)) return value.map(child=>formatStored(child,number))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,formatStored(child,number)]))
  return value
}
function numericMeaning(section, payload) {
  if (!section.explanation) return section.meaning
  const e = section.explanation
  return [e.explanationOrigin, e.construct, e.calculation, e.reading, e.classificationNote,
    ['screening','published-reference'].includes(section.bandBasis) ? e.classificationMeaning : '',
    e.languageNote, section.classificationSource ? payload.categoryReferenceLabel + section.classificationSource : ''].filter(Boolean).join(' ')
}
function substitute(template, values) {
  return template.replace(/\{([a-zA-Z]+)\}/g, (_, key) => Object.hasOwn(values,key) ? String(values[key]) : '')
}
// This function selects ONLY text/rules from a verified persisted payload.
// Hash verification and database-row identity checks happen on the server first.
function validText(value) { return typeof value === 'string' && value.length > 0 }
function validCompact(value) { return value && (!Object.hasOwn(value,'referralIncluded') || typeof value.referralIncluded==='boolean') && ['status','meaning','nextStep','recommendation'].every(k=>validText(value[k])) && (Object.hasOwn(value,'course') && (value.course===null || (validSupportGoal(value.course?.goalId)&&value.course.matchScope==='related-general-practice'&&validText(value.course.title)&&validText(value.course.description)))) && Array.isArray(value.recommendations) && value.recommendations.length>=2 && value.recommendations.every(validText) }
function validReport(report) {
  return report && ['title','intro','purpose','note'].every(key=>validText(report[key])) && report.presentation?.schemaVersion===1 && validText(report.presentation.monitoringNote) && report.presentation.labels?.length===5 && report.presentation.labels.every(validText) && validText(report.presentation.scaleChoiceLabel) && ['title','body','start','more','noMatch','matchedLead'].every(k=>validText(report.presentation.course?.[k])) && report.presentation.course.path==='/app/course' && report.presentation.course.infoPath==='/app/course#about-course' && validCompact(report.presentation.empty) && (!report.presentation.about?.source || /^https:\/\/|^\/(?!\/)/.test(report.presentation.about.source)) && ['name','purpose','evidence','sourceNote'].every(k=>validText(report.presentation.about?.[k])) &&
    (['context','languageNote'].every(k=>report.presentation.about[k]==null||validText(report.presentation.about[k]))) &&
    (!report.scaleGuide || (Array.isArray(report.scaleGuide.scales) && report.scaleGuide.scales.every(scale=>
      typeof scale.key==='string' && (!scale.watch || validText(scale.watch)) && (!scale.skill || validText(scale.skill)))))
}
function validSection(section, dimension, bach = false) {
  return section && section.key === dimension.key && section.max === dimension.max && (bach || section.min === dimension.min) &&
    ['title','construct','followUp'].every(key=>validText(section[key])) && Array.isArray(section.steps) && section.steps.length >= 2 && section.steps.every(validText) &&
    (!section.source || /^https:\/\/|^\/(?!\/)/.test(section.source)) &&
    (!section.classificationSource || /^https:\/\//.test(section.classificationSource)) &&
    (bach || (['screening','published-reference','descriptive'].includes(section.bandBasis) && validText(section.band))) &&
    (bach || (section.explanation ? ['construct','calculation','reading','explanationOrigin'].every(key=>validText(section.explanation[key])) : validText(section.meaning)))
}
function safeKeys(value) {
  if (!value || typeof value !== 'object') return true
  return Object.entries(value).every(([key,part])=>!['__proto__','constructor','prototype'].includes(key) && safeKeys(part))
}
export function resolveStoredInterpretation(result, payload, locale, payloadHash) {
  try { return resolveContent(result,payload,locale,payloadHash) }
  catch { return interpretationUnavailable(locale) }
}
function resolveContent(result, payload, locale, payloadHash) {
  const fail = () => interpretationUnavailable(locale)
  if (!verifiedResult(result) || !payload || payload.schemaVersion !== 1 ||
      payload.interpretationVersion !== STORED_INTERPRETATION_VERSION || payload.uiLocale !== locale ||
      !matchingIdentity(result,payload.identity) || !safeKeys(payload) || !validReport(payload.report) || !Array.isArray(payload.scales) ||
      payload.scales.length !== result.dimensions.length) return fail()
  const byKey = new Map(payload.scales.map(scale => [scale.key,scale]))
  if (byKey.size !== result.dimensions.length) return fail()
  let report
  if (payload.kind === 'numeric') {
    if (!validText(payload.categoryReferenceLabel) || typeof payload.support?.always !== 'boolean' || (payload.support.text !== null && !validText(payload.support.text))) return fail()
    const sections = []
    for (const dimension of result.dimensions) {
      const scale = byKey.get(dimension.key)
      if (!scale || !Array.isArray(scale.cases)) return fail()
      const matches = scale.cases.filter(rule => Array.isArray(rule.scores) && rule.scores.includes(dimension.value))
      if (matches.length !== 1) return fail()
      const section = formatStored(merge(scale.base,matches[0].delta),new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(dimension.value))
      section.value = dimension.value
      if (!validSection(section,dimension) || !validCompact(section.compact) || !validText(section.compact.recommendation) || !Object.hasOwn(section.compact,'course')) return fail()
      section.meaning = numericMeaning(section,payload)
      sections.push(section)
    }
    const typeKind = storedPersonalityKind(result.definitionKey)
    if (payload.requiresType !== Boolean(typeKind) || (typeKind ? !validStoredPersonalityRules(result,payload.typeRules) : payload.typeRules !== null)) return fail()
    report = {...structuredClone(payload.report), sections,personalityType:payload.requiresType ? resolveStoredPersonalityType(result,payload.typeRules) : null}
    report.seekSupport = payload.support.always || sections.some(section=>section.recommendedReview) ? payload.support.text : null
  } else if (payload.kind === 'bach') {
    if (!validReport(payload.markedReport) || !validText(payload.zeroMeaning) || !validText(payload.endorsedMeaning) || !Array.isArray(payload.supportKeys) || !validText(payload.supportText) || !['situation','character','control'].every(key=>validText(payload.sectionLabels?.[key]))) return fail()
    const ranked = rankBachDimensions(result.dimensions), marked = ranked.filter(d=>d.value>0)
    const sections = []
    for (const [index,dimension] of ranked.entries()) {
      const scale = byKey.get(dimension.key)
      if (!scale || !validCompact(scale.compactZero) || !validCompact(scale.compactMarked) || !validSection(scale.base,dimension,true) || !scale.scores?.includes(dimension.value) || !Number.isInteger(dimension.evidenceCount) || dimension.evidenceCount < 0 || dimension.evidenceCount > scale.maxEvidence ||
          !Array.isArray(dimension.sections) || new Set(dimension.sections).size !== dimension.sections.length ||
          dimension.sections.some(key=>!Object.hasOwn(payload.sectionLabels,key))) return fail()
      const endorsed = dimension.value > 0
      if (endorsed !== (dimension.evidenceCount > 0) || endorsed !== (dimension.sections.length > 0)) return fail()
      const sources = dimension.sections.map(key=>payload.sectionLabels[key]).join(', ')
      sections.push({...structuredClone(scale.base), min:dimension.min, compact:formatStored(endorsed?scale.compactMarked:scale.compactZero,new Intl.NumberFormat(locale,{maximumFractionDigits:2}).format(dimension.value)),value:dimension.value,
        group: endorsed ? index<3?'main':index<7?'support':'review':'not-marked',
        meaning: endorsed ? substitute(payload.endorsedMeaning,{evidenceCount:dimension.evidenceCount,sections:sources,value:dimension.value}) : payload.zeroMeaning})
    }
    report = {...structuredClone(marked.length ? payload.markedReport : payload.report), sections,
      highlightedCount: Math.min(7,marked.length),
      seekSupport: marked.some(d=>payload.supportKeys.includes(d.key)) ? payload.supportText : null}
  } else return fail()
  return {...report,status:'available',origin:'database',identity:payload.identity,uiLocale:locale,
    interpretationVersion:payload.interpretationVersion,payloadHash}
}
