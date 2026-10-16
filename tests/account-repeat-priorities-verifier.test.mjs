import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const start=source.indexOf(' let repeatAnxiety\n')
const end=source.indexOf(' const [reuseResponse]=',start)
const fragment=source.slice(start,end)
async function run({wrongGroup=false,initial=false,omitRestore=false,write=false}={}){
 let active=!initial,expanded=false,selected=false,clicks=0
 const anxiety={count:1,getAttribute:async()=>String(active),click:async()=>{active=!active;clicks++}}
 const group={count:wrongGroup?0:1,getByRole(role,{name,exact}){assert.equal(role,'button');assert.equal(name,'Anxiety & worry');assert.equal(exact,true);return anxiety}}
 const topics={count:1,click:async()=>{}}
 const guided={getByRole(role,{name,exact}){if(role==='group'){assert.equal(name,'Filter tests by your concerns');assert.equal(exact,true);return group}assert.equal(String(name),'/^Topics that matter/');return topics}}
 const toggle={count:1,getAttribute:async()=>String(expanded),click:async()=>{expanded=true}}
 const explorer={locator(selector){if(selector==='button[aria-controls="hh-test-customizer"]')return toggle;assert.equal(selector,'#hh-test-customizer');return guided},getByRole(role,opts){assert.equal(role,'checkbox');assert.deepEqual(opts,{name:'Personality Baseline',exact:true,checked:true});return {count:selected?1:0}}}
 const expect=x=>({toHaveCount:async n=>assert.equal(x.count,n),toHaveAttribute:async(_,v)=>assert.equal(await x.getAttribute(),v)})
 const choose=async(page,name,{beforeSelection})=>{assert.equal(page,'page');assert.equal(name,'Personality Baseline');await beforeSelection(explorer);assert.equal(active,false);selected=true;return explorer}
 const code=omitRestore?fragment.replace(' await repeatAnxiety.click()\n await expect(repeatAnxiety)', ' await expect(repeatAnxiety)'):fragment
 await new Function('chooseSingleAccountTest','repeatSelectionPage','expect','assert','reuseWrites',`return (async()=>{${code}})()`)(choose,'page',expect,assert,write?[201]:[])
 assert.equal(active,true);assert.equal(selected,true);assert.equal(clicks,2)
}
test('repeat selection explicitly toggles and restores exact saved Anxiety priority without writing',()=>run())
for(const option of ['wrongGroup','initial','omitRestore','write'])test('repeat priority sequence rejects '+option,()=>assert.rejects(run({[option]:true})))
test('post-submit repeat proves exact preferences, ordered IDs, progress and one idempotent account write',()=>{
 for(const text of ['assert.deepEqual(reusedPlan.selectionPreferences,selectedPlan.selectionPreferences','assert.deepEqual(reusedPlan.definitionIds,selectedPlan.definitionIds)','assert.deepEqual(reusedPlan.completedRunIds,selectedPlan.completedRunIds)','assert.deepEqual(reuseWrites,[201]'])assert.ok(source.includes(text),text)
 const a=source.indexOf(' assert.deepEqual(reusedPlan.selectionPreferences,selectedPlan.selectionPreferences')
 const b=source.indexOf(' assert.deepEqual(reuseWrites',a)
 const assertion=source.slice(a,b)
 new Function('assert','reusedPlan','selectedPlan',assertion)(assert,{selectionPreferences:{focus:['anxiety']}},{selectionPreferences:{focus:['anxiety']}})
 assert.throws(()=>new Function('assert','reusedPlan','selectedPlan',assertion)(assert,{selectionPreferences:{focus:[]}},{selectionPreferences:{focus:['anxiety']}}))
})
