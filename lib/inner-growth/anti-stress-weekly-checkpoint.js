import { verifiedHistoryResult } from '../assessments/verified-history.js'

// OPORA Anti-Stress: optional week-one outcome checkpoint.
// Owner-scoped results are loaded server-side; this pure function never grants test access.
export function buildAntistressWeeklyCheckpoint({
  startedAt,completedLessons=0,testKeys=[],results=[],now=Date.now(),
  startable=true,rightsStatus='cleared',requireVerifiedResults=false,
}={}) {
  const start=Date.parse(startedAt||'')
  const today=typeof now==='number'?now:Date.parse(now||'')
  if(!Number.isFinite(start)||!Number.isFinite(today)||
    !testKeys.includes('hh-weekly-pulse')||completedLessons<7||completedLessons>=14)return null
  const rows=(Array.isArray(results)?results:[])
    .filter(r=>r?.definitionKey==='hh-weekly-pulse'&&r?.definitionVersion==='v1'&&
      ['ru','en'].includes(r?.instrumentLocale)&&Number.isFinite(Date.parse(r?.measurementAt||''))&&
      (!requireVerifiedResults || Date.parse(r.measurementAt)<=today))
    .sort((a,b)=>Date.parse(b.measurementAt)-Date.parse(a.measurementAt))
  const rawBaseline=rows.find(r=>Date.parse(r.measurementAt)<=start)||null
  // On real saved scores, do not promote a historical record when the most
  // recent baseline attempt is unverified or has impossible dimension values.
  const baseline=rawBaseline&&(!requireVerifiedResults||verifiedHistoryResult(rawBaseline))
    ?rawBaseline:null
  if(!baseline)return {available:true,canStart:false,completed:false,
    reason:'no_baseline',dueAt:null,verificationRequired:Boolean(rawBaseline&&requireVerifiedResults)}
  const week=7*86400000
  const dueAfterCourse=start+week
  const dueAfterBaseline=Date.parse(baseline.measurementAt)+week
  const firstDue=Math.max(dueAfterCourse,dueAfterBaseline)
  const comparable=r=>r.definitionVersion===baseline.definitionVersion&&
    r.instrumentLocale===baseline.instrumentLocale&&
    r.translationVersion===baseline.translationVersion&&
    r.contentHash===baseline.contentHash&&r.scoringVersion===baseline.scoringVersion&&
    r.timeframe===baseline.timeframe
  const retestRows=rows.filter(r=>Date.parse(r.measurementAt)>=firstDue)
  const mostRecentRetest=retestRows[0]||null
  // Strict mode does not count any retest if its newest stored attempt is
  // altered or in another version/language. Older valid records remain
  // visible in raw history, not a silently substituted current result.
  const completed=requireVerifiedResults
    ?(mostRecentRetest&&verifiedHistoryResult(mostRecentRetest)&&comparable(mostRecentRetest)
      ?mostRecentRetest:null)
    :retestRows.find(comparable)||null
  const verificationRequired=Boolean(requireVerifiedResults&&mostRecentRetest&&
    !verifiedHistoryResult(mostRecentRetest))
  const lastUsable= requireVerifiedResults ? rows.find(verifiedHistoryResult)||baseline : rows[0]
  const nextDue=completed?null:verificationRequired?firstDue:
    Math.max(firstDue,Date.parse(lastUsable.measurementAt)+week)
  const canStart=Boolean(!completed&&startable&&rightsStatus==='cleared'&&
    Number.isFinite(nextDue)&&today>=nextDue)
  return {
    available:true,canStart,completed:Boolean(completed),
    key:'hh-weekly-pulse',instrumentLocale:baseline.instrumentLocale,
    definitionVersion:baseline.definitionVersion,
    baselineResultId:baseline.id,baselineDate:baseline.measurementAt,
    afterResultId:completed?.id||null,afterDate:completed?.measurementAt||null,
    dueAt:nextDue!==null?new Date(nextDue).toISOString():null,
    reason:completed?'complete':canStart?'due':'not_due',
    verificationRequired,
  }
}
