import test from 'node:test'
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
const checkPriority=new AsyncFunction('picker','expect',source.slice(priorityStart,priorityEnd))
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
async function priorityCase(change={}){
 const button={count:change.buttons??1,attrs:{'aria-pressed':'false'},async click(){if(!change.noop)this.attrs['aria-pressed']='true'}}
 const picker={getByRole(role,options){assert.equal(role,'group');assert.deepEqual(options,{name:'Which tests would you like to see first?',exact:true});return {count:change.groups??1,getByRole(role,options){assert.equal(role,'button');assert.deepEqual(options,{name:'Shorter tests. Prioritize shorter questionnaires',exact:true});return button}}}}
 await checkPriority(picker,expect)
}
test('visible card has concise verified kind and detailed source-backed accessible label',()=>badgeCase())
test('wrong kind, validation claim, unknown card, exposed decorative icon, hidden text and duplicate/missing badges fail',async()=>{
 for(const change of [{count:0},{count:2},{kind:'professional'},{aria:'Type: Clinically validated'},{text:'Type: Professional'},{unknown:true},{showIcon:true},{exposeIcon:true},{hideText:true},{hideBadge:true}])await assert.rejects(badgeCase(change))
})
test('exact scoped recommendation priority changes pressed state',()=>priorityCase())
test('missing/duplicate group or button and no-op priority click fail',async()=>{
 for(const change of [{groups:0},{groups:2},{buttons:0},{buttons:2},{noop:true}])await assert.rejects(priorityCase(change))
})
test('selection handoff and downstream preference assertions remain after priority action',()=>{
 assert.ok(source.includes("await expect(rankedCards).toHaveCount(5)"))
 assert.ok(source.includes('full catalog must preserve every actual selected test'))
 assert.ok(source.indexOf('const handoffKeys=',priorityEnd)>priorityEnd)
})
