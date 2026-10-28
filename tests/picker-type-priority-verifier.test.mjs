import test from 'node:test'
import { createCoreStageEvidence } from '../scripts/helpers/core-stage-evidence.mjs'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {testKindCardLabel,testKindShortLabel} from '../lib/assessments/test-kinds.js'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor
const badgeStart=source.indexOf(' const registeredPickerEntries=')
const badgeEnd=source.indexOf(' const selectedSummary=',badgeStart)
assert.ok(badgeStart>0&&badgeEnd>badgeStart)
const checkBadges=new AsyncFunction('rankedCards','buildExplorerEntries','testKindShortLabel','testKindCardLabel','expect','assert',source.slice(badgeStart,badgeEnd))
const priorityStart=source.indexOf(' const recommendationPriority=')
const priorityEnd=source.indexOf(" await optional.locator('summary').click()",priorityStart)
assert.ok(priorityStart>0&&priorityEnd>priorityStart)
const compilePriority=script=>{
 const start=script.indexOf(' const recommendationPriority=')
 const end=script.indexOf(" await optional.locator('summary').click()",start)
 assert.ok(start>0&&end>start)
 return new AsyncFunction('picker','expect','guestPickerPage','withPublicPickerActionDiagnostics','coreStageEvidence',script.slice(start,end))
}
const checkPriority=compilePriority(source)
const expect=node=>({
 async toHaveCount(value){assert.equal(node.count,value)},
 async toBeVisible(){assert.equal(node.visible,true)},
 async toBeHidden(){assert.equal(node.visible,false)},
 async toHaveText(value){assert.equal(node.text,value)},
 async toHaveAttribute(key,value){assert.equal(node.attrs[key],value)},
})
async function badgeCase(change={}){
 const entry={key:'hh-example',testKind:'monitoring'}
 const text={visible:true,text:'Type: Check-in'}
 const icon={visible:false,attrs:{'aria-hidden':'true'}}
 const category={count:1,visible:true,attrs:{'data-test-kind-badge':'monitoring','aria-label':'Type: Check-in. Holistic House check-in'},locator(selector){assert.ok(['svg','span'].includes(selector));return selector==='svg'?icon:text}}
 const card={async getAttribute(name){assert.equal(name,'data-test-match');return change.unknown?'unknown':entry.key},locator(selector){assert.equal(selector,'label [data-test-kind-badge]');return category}}
 if(change.count!==undefined)category.count=change.count
 if(change.kind)category.attrs['data-test-kind-badge']=change.kind
 if(change.aria)category.attrs['aria-label']=change.aria
 if(change.text)text.text=change.text
 if(change.showIcon)icon.visible=true
 if(change.exposeIcon)icon.attrs['aria-hidden']='false'
 if(change.hideText)text.visible=false
 if(change.hideBadge)category.visible=false
 await checkBadges({async all(){return [card]}},options=>{assert.deepEqual(options,{locale:'en',audience:'public'});return [entry]},testKindShortLabel,testKindCardLabel,expect,assert)
}
async function priorityCase(change={},check=checkPriority){
 const coreStageEvidence=createCoreStageEvidence({now:()=>0}),stages=[],mark=coreStageEvidence.mark
 coreStageEvidence.mark=stage=>{stages.push(stage);mark(stage)}
 const actions=[]
 const button={count:change.buttons??1,attrs:{'aria-pressed':'false'},async click(...args){
  assert.deepEqual(args,[],'The extracted action must remain a normal native click')
  actions.push('click')
  if(change.clickError)throw change.clickError
  if(!change.noop)this.attrs['aria-pressed']='true'
 }}
 const picker={getByRole(role,options){assert.equal(role,'group');assert.deepEqual(options,{name:'Which tests would you like to see first?',exact:true});return {count:change.groups??1,getByRole(role,options){assert.equal(role,'button');assert.deepEqual(options,{name:'Shorter tests. Prioritize shorter questionnaires',exact:true});return button}}}}
 const priorityExpect=node=>({...expect(node),async toHaveAttribute(key,value){
  assert.equal(node,button);assert.equal(key,'aria-pressed');assert.equal(value,'true')
  actions.push('pressed')
  await expect(node).toHaveAttribute(key,value)
 }})
 const guestPickerPage={}
 // The observer has its own lifecycle/privacy tests. Substitute only that
 // boundary here; execute the actual scoped native action/assertions verbatim.
 const withDiagnostics=async(page,target,options,operation,diagnostics)=>{
  assert.equal(page,guestPickerPage);assert.equal(target,button)
  assert.deepEqual(options,{action:'depth-shorter',locale:'en'})
  assert.equal(typeof operation,'function')
  assert.deepEqual(diagnostics,{diagnosticSink:coreStageEvidence.picker})
  actions.push('diagnostic:start')
  const value=await operation()
  actions.push('diagnostic:end')
  return value
 }
 await check(picker,priorityExpect,guestPickerPage,withDiagnostics,coreStageEvidence)
 assert.deepEqual(stages,['picker-depth'])
 assert.equal(coreStageEvidence.snapshot().stage,'picker-depth')
 assert.deepEqual(actions,['diagnostic:start','click','pressed','diagnostic:end'],
  'Exactly one normal native click and exact pressed assertion remain inside the passive boundary')
}
test('visible card has concise verified kind and detailed source-backed accessible label',()=>badgeCase())
test('wrong kind, validation claim, unknown card, exposed decorative icon, hidden text and duplicate/missing badges fail',async()=>{
 for(const change of [{count:0},{count:2},{kind:'professional'},{aria:'Type: Clinically validated'},{text:'Type: Professional'},{unknown:true},{showIcon:true},{exposeIcon:true},{hideText:true},{hideBadge:true}])await assert.rejects(badgeCase(change))
})
test('exact scoped recommendation priority changes pressed state',()=>priorityCase())
test('missing/duplicate group or button and no-op priority click fail',async()=>{
 for(const change of [{groups:0},{groups:2},{buttons:0},{buttons:2},{noop:true}])await assert.rejects(priorityCase(change),{code:'ERR_ASSERTION'})
})
test('no-op priority fails its actual pressed assertion, while native click errors retain identity',async()=>{
 await assert.rejects(priorityCase({noop:true}),error=>error.code==='ERR_ASSERTION'&&error.actual==='false'&&error.expected==='true')
 const original=new Error('synthetic native click failure')
 await assert.rejects(priorityCase({clickError:original}),error=>error===original)
})
test('extracted priority rejects deleted, duplicated, forced, reordered or weakened native checks and disconnected diagnostics',async()=>{
 const click='  await shorterPriority.click()'
 const pressed="  await expect(shorterPriority).toHaveAttribute('aria-pressed','true')"
 const wrapped=" await withPublicPickerActionDiagnostics(guestPickerPage,shorterPriority,{action:'depth-shorter',locale:'en'},async()=>{\n"+click+'\n'+pressed+'\n },{diagnosticSink:coreStageEvidence.picker})'
 const mutations=[
  [" coreStageEvidence.mark('picker-depth')",''],
  [" coreStageEvidence.mark('picker-depth')"," coreStageEvidence.mark('picker-en')"],
  ['{diagnosticSink:coreStageEvidence.picker}','{}'],
  ['{diagnosticSink:coreStageEvidence.picker}','{diagnosticSink:coreStageEvidence.opora}'],
  [click,''],
  [click,click+'\n'+click],
  [click,'  await shorterPriority.click({force:true})'],
  [pressed,''],
  [pressed,"  await expect(shorterPriority).toHaveAttribute('aria-pressed','false')"],
  [click+'\n'+pressed,pressed+'\n'+click],
  [wrapped,click+'\n'+pressed],
  ["{action:'depth-shorter',locale:'en'}","{action:'collection-sexuality',locale:'en'}"],
  ["{action:'depth-shorter',locale:'en'}","{action:'depth-shorter',locale:'ru'}"],
 ]
 for(const [before,after] of mutations){
  assert.equal(source.split(before).length,2,'Counterfactual must alter exactly one current source block')
  await assert.rejects(priorityCase({},compilePriority(source.replace(before,after))),{code:'ERR_ASSERTION'})
 }
})
test('selection handoff and downstream preference assertions remain after priority action',()=>{
 assert.ok(source.includes("await expect(rankedCards).toHaveCount(5)"))
 assert.ok(source.includes('full catalog must preserve every actual selected test'))
 assert.ok(source.indexOf('const handoffKeys=',priorityEnd)>priorityEnd)
})
