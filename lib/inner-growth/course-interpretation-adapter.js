// Internal boundary for already-authorized, server-attached DB reports.
// Hash verification belongs to the released server loader, not this DTO adapter.
import { validateProvenance, provenance } from '../assessments/definitions.js'
export const COURSE_REPORT_VERSIONS=Object.freeze(['2026-10-12.v1','2026-10-12.v2'])
export function courseInterpretationFromResult(result,locale,{allowedVersions=COURSE_REPORT_VERSIONS}={}) {
  try {
    if(!['en','ru'].includes(locale))return null
    const identity=provenance(validateProvenance(result)),report=result.interpretations?.[locale]
    if(!report||report.status!=='available'||report.origin!=='database'||report.uiLocale!==locale||
      !allowedVersions.includes(report.interpretationVersion)||!/^sha256:[a-f0-9]{64}$/.test(report.payloadHash||'')||
      Object.entries(identity).some(([k,v])=>report.identity?.[k]!==v)||
      !Array.isArray(report.sections)||report.sections.length!==result.dimensions.length||
      new Set(report.sections.map(s=>s.key)).size!==result.dimensions.length)return null
    const sections=result.dimensions.map(d=>{
      const section=report.sections.find(s=>s.key===d.key)
      if(!section||section.value!==d.value||section.min!==d.min||section.max!==d.max)return null
      const meaning=report.interpretationVersion==='2026-10-12.v1'?section.meaning:section.compact?.meaning
      if(typeof meaning!=='string'||!meaning.trim())return null
      return {key:d.key,value:d.value,min:d.min,max:d.max,compact:{meaning},source:section.source??null}
    })
    if(sections.some(s=>!s))return null
    return {status:'available',origin:'database',identity,uiLocale:locale,
      revision:report.interpretationVersion,contentHash:report.payloadHash.slice(7),sections}
  }catch{return null}
}
