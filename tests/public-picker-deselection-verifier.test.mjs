import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
for(const name of ['chooseSinglePublicTest','chooseSinglePublicTestAfterCatalog']){
 const start=source.indexOf('async function '+name+'(')
 const end=source.indexOf('\nasync function ',start+1)
 const fragment=source.slice(start,end)
 async function scenario(fault){
  let names=['Weekly Wellbeing Check-in','Monthly Life Profile','Resources & Inner Support'],picked=false
  const checked={evaluateAll:async()=>[...names]}
  const target={locator:selector=>{assert.equal(selector,'article input[type="checkbox"]:checked');return checked},getByRole(role,{name,exact,checked:onlyChecked}){
   assert.equal(exact,true)
   if(role==='checkbox'){
    assert.equal(onlyChecked,true)
    return {get count(){return names.includes(name)?fault==='duplicate'?2:1:0},click:async()=>{
     if(fault==='blocked')throw new Error('blocked')
     if(fault!=='unchanged')names=names.filter(x=>x!==(fault==='wrong-item'?names.at(-1):name))
    }}
   }
   return {click:async()=>{},first(){return this}}
  }}
  const expect=loc=>({toHaveCount:async n=>assert.equal(loc===checked?names.length:loc.count,n),toBeVisible:async()=>{},toBeEnabled:async()=>{},toHaveAttribute:async(key,value)=>{assert.equal(key,'aria-label');assert.deepEqual(names,[value])}})
  expect.poll=fn=>({toEqual:async expected=>assert.deepEqual(await fn(),expected)})
  const choose=async(page,title)=>{assert.equal(page,target);assert.deepEqual(names,[]);picked=true;names=[title]}
  await new Function('expect','chooseVisibleTest','assertPublicPickerEntrance',fragment+'\n;return '+name)(expect,choose,async()=>{})(target,'Current State Check')
  assert.equal(picked,true)
 }
 test(name+' permits card removal only after exact successful deselection',()=>scenario())
 for(const fault of ['blocked','unchanged','wrong-item','duplicate'])test(name+' rejects '+fault,()=>assert.rejects(scenario(fault)))
}
