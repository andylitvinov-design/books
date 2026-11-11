// Holistic House GROW 20-minute pilot · deterministic local helpers.
// No timers, providers, diagnostics, transcript processing or network calls.
export const GROW_20_SCHEME='grow_overload_20_v1'
export const GROW_CLARITY_QUESTIONS=Object.freeze({
  before:'grow_overload_clarity_start_q1_v1',
  after:'grow_overload_clarity_end_q1_v1',
})

// Guide only. Never stop a user's session at the twenty-minute mark.
const phaseWindows=Object.freeze({
  pilot_start:['G','0–4'],goal:['G','0–4'],
  reality:['R','4–9'],priorities:['R','4–9'],
  options:['O','9–14'],will:['W','14–19'],
  pilot_end:['Review','19–20'],review:['Review','19–20'],
})
export function growPhaseForStep(stepKey){
  const value=phaseWindows[stepKey]
  return value?{phase:value[0],window:value[1]}:null
}
export function isGrowClarityQuestion(id){
  return id===GROW_CLARITY_QUESTIONS.before||id===GROW_CLARITY_QUESTIONS.after
}
function score(answer){
  if(typeof answer!=='string')return null
  const raw=answer.startsWith('choice:')?answer.slice(7):answer.trim()
  return /^(?:10|[0-9])$/.test(raw)?Number(raw):null
}
export function growClarityOutcome(answers={}){
  const source=answers&&typeof answers==='object'&&!Array.isArray(answers)?answers:{}
  const before=score(source[GROW_CLARITY_QUESTIONS.before])
  const after=score(source[GROW_CLARITY_QUESTIONS.after])
  return {before,after,delta:before!==null&&after!==null?after-before:null}
}
function safeText(value,max){
  if(typeof value!=='string'||value.length>max*2||/[\u0000-\u001f]/.test(value))return null
  const clean=value.trim()
  return clean.length<=max&&!clean.startsWith('choice:')?clean:null
}
// Up to two additional client-authored actions, plus an optional fallback.
// Existing one-action plans and non-pilot schemes retain their old shape.
export function normalizeGrowPlanExtras(input={}){
  const fallback=safeText(input.fallback===undefined?'':input.fallback,240)
  const rows=input.nextActions===undefined?[]:input.nextActions
  if(fallback===null||!Array.isArray(rows)||rows.length>2)return null
  const nextActions=[]
  for(const row of rows){
    if(!row||typeof row!=='object'||Array.isArray(row)||
       Object.keys(row).some(k=>!['text','when'].includes(k)))return null
    const text=safeText(row.text,300)
    const when=safeText(row.when,120)
    if(text===null||when===null||(!text&&when))return null
    if(text)nextActions.push({text,when})
  }
  return {fallback,nextActions}
}
