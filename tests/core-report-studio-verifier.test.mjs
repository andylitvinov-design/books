import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const start=source.indexOf('   const reportPickerPage=await admin.newPage();')
const end=source.indexOf("   passed('owner-only Create report",start)
assert.ok(start>=0&&end>start)
const run=new (Object.getPrototypeOf(async function(){}).constructor)('admin','expect','origin','ownerClientId',source.slice(start,end))
async function scenario(fault){
 const origin='http://127.0.0.1:3100',id='11111111-1111-4111-8111-111111111111',name='Synthetic Handoff Client'
 let selected=false,query='',closed=false,url='',clicks=0
 const loc=selector=>({selector,filter(options){assert.deepEqual(options,{hasText:name});return this},locator(child){assert.equal(child,'strong');return loc(selector+' strong')},async fill(value){assert.equal(selector,'.consultation-client-search input');assert.equal(value,name);query=value},async click(){assert.equal(selector,'.consultation-client-results button','no submit or unrelated action');assert.equal(query,name);selected=fault!=='no-selection';clicks++}})
 const page={locator:loc,async goto(value){assert.equal(value,origin+'/admin/reports/new');url=origin+(fault==='old-route'?'/admin/reports/new':'/admin/consultations/new')},async close(){closed=true}}
 function expect(target){return {
  async toHaveURL(value){assert.equal(url,value)},
  async toHaveCount(value){const s=target.selector;const actual=s==='.consultation-client-selected-row'?(selected?1:0):s==='select[name="kind"]'?(fault==='retired-kind'?1:0):fault==='duplicate-choice'?2:fault==='missing-choice'?0:1;assert.equal(actual,value)},
  async toHaveValue(value){const s=target.selector;let actual=s.includes('clientMode')?'existing':s.includes('patientName')?(fault==='wrong-name'?'Other':name):selected?(fault==='wrong-id'?'other-id':id):'';if(fault==='preselected'&&s==='input[name="clientId"]')actual=id;assert.equal(actual,value)},
  async toHaveText(value){assert.equal(fault==='wrong-choice'?'Other':name,value)},
  async toHaveAttribute(key,value){assert.equal(key,'type');assert.equal(fault==='submit-choice'?'submit':'button',value)},
  async toContainText(value){assert.equal(selected,true);assert.equal(value,name)},
  async toBeChecked(){assert.notEqual(fault,'missing-recommendation')},
  not:{async toBeChecked(){assert.notEqual(fault,'invoice-enabled')}},
  async toBeVisible(){assert.notEqual(fault,target.selector.includes('additionalNotes')?'missing-notes':'missing-analysis')},
 }}
 await run({newPage:async()=>page},expect,origin,id)
 assert.equal(closed,true);assert.equal(clicks,1)
}
test('core journey selects the exact synthetic client through current studio without submitting',()=>scenario())
for(const fault of ['old-route','preselected','duplicate-choice','missing-choice','wrong-choice','submit-choice','no-selection','wrong-id','wrong-name','missing-recommendation','invoice-enabled','retired-kind','missing-analysis','missing-notes'])test('core studio rejects '+fault,()=>assert.rejects(scenario(fault)))
