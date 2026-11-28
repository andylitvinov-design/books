// A read-only projection from the exact owner-scoped protocol response.
import {antiStressScenario} from './anti-stress-course.mjs'
import {coachGroupTone} from './coach-session-stage-view.mjs'
const validValue=(f,v)=>f.kind==='rating'?Number.isInteger(v)&&v>=0&&v<=10:f.kind==='choice'?f.choices.includes(v):typeof v==='string'&&v.trim().length>0&&v.length<=2000
const bindingMatches=(b,selection,scenario)=>Boolean(b&&b.programType==='therapy'&&b.courseRunId===selection.runId&&b.protocolId===selection.protocolId&&b.sessionId===selection.sessionId&&b.scenarioVersion===scenario.version)
export function antiStressProgressProjection({selection,locale='en',data=null,elapsedMs=0}={}){
 const scenario=antiStressScenario(selection?.sessionId,locale)
 if(!scenario||typeof selection.runId!=='string'||!selection.runId||typeof selection.protocolId!=='string'||!selection.protocolId||selection.runId===selection.protocolId||!Number.isSafeInteger(elapsedMs)||elapsedMs<0||elapsedMs>scenario.durationSeconds*1000)return null
 let rows=null,revision=null
 if(data!==null){
  const supplied=data.protocol?.rows
  const day=data.run?.days?.[scenario.number-1]
  if(!bindingMatches(data.binding,selection,scenario)||!bindingMatches(data.protocol?.binding,selection,scenario)||data.run?.id!==selection.runId||data.run?.programType!=='therapy'||day?.protocolId!==selection.protocolId||day.sessionId!==selection.sessionId||!Number.isSafeInteger(data.reviewRevision)||data.reviewRevision<0||!Array.isArray(supplied)||supplied.length!==scenario.fields.length)return null
  rows=new Map()
  for(const f of scenario.fields){
   const matches=supplied.filter(r=>r?.fieldId===f.id)
   const r=matches.length===1?matches[0]:null
   if(!r||r.stage!==f.stage||r.question!==f.question||r.label!==f.label||!['confirmed','skipped','needs_confirmation','not_explored'].includes(r.status))return null
   if(r.status==='confirmed'&&(!validValue(f,r.value)||typeof r.evidenceId!=='string'||!r.evidenceId.trim()||data.reviewRevision===0))return null
   if(r.status!=='confirmed'&&r.value!==null)return null
   if(r.status==='skipped'&&(typeof r.evidenceId!=='string'||!r.evidenceId.trim()||data.reviewRevision===0))return null
   rows.set(f.id,r)
  }
  revision=data.reviewRevision
 }
 const groups=scenario.stages.map(stage=>{
  const children=scenario.fields.filter(f=>f.stage===stage.id).map(f=>rows?.get(f.id)||{fieldId:f.id,stage:f.stage,label:f.label,question:f.question,status:'unavailable',value:null})
  const confirmed=children.filter(r=>r.status==='confirmed').length
  const pending=children.filter(r=>r.status==='needs_confirmation').length
  const skipped=children.filter(r=>r.status==='skipped').length
  const total=children.length
  return {id:stage.id,label:stage.label,children,total,confirmed,pending,skipped,tone:coachGroupTone({total,confirmed,recorded:confirmed,touched:pending+skipped})}
 })
 return {scenarioVersion:scenario.version,sessionId:scenario.sessionId,revision,available:rows!==null,groups,minuteDots:scenario.minuteDots,elapsedMinutes:Math.floor(elapsedMs/60000)}
}
