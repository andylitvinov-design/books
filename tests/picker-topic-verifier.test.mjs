import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../scripts/verify-app-r1.mjs',import.meta.url),'utf8')
const start=source.indexOf(' const concernTopics=')
const end=source.indexOf(' const workConcern=',start)
assert.ok(start>0&&end>start)
const fragment=source.slice(start,end)
const run=new (Object.getPrototypeOf(async function(){}).constructor)('picker','expect',fragment)

async function verify({groups=1,topicButtons=1,filterButtons=1}={}){
 const clicked=[]
 const topic={count:topicButtons,pressed:false,async click(){assert.equal(this.count,1);this.pressed=true;clicked.push('topic')}}
 const filter={count:filterButtons,async click(){clicked.push('filter')}}
 const picker={getByRole(role,{name,exact}){
  assert.equal(exact,true)
  if(role==='button')return filter
  assert.equal(role,'group');assert.equal(name,'What would you like to explore?')
  return {count:groups,getByRole(button,{name:label,exact:strict}){assert.equal(button,'button');assert.equal(label,'Stress');assert.equal(strict,true);return topic}}
 }}
 const expect=target=>({async toHaveCount(n){assert.equal(target.count,n)},async toHaveAttribute(key,value){assert.equal(key,'aria-pressed');assert.equal(String(target.pressed),value)}})
 await run(picker,expect)
 assert.deepEqual(clicked,['topic'])
}
test('actual verifier selects the unique concern topic while a separate filter shares its label',async()=>{
 await verify()
 assert.ok(source.indexOf("name:'Workload feels overwhelming'",end)>end)
 assert.ok(source.includes("'choosing a concern updates questionnaire relevance'"))
})
test('missing or duplicated concern group/button cannot pass using the unrelated filter',async()=>{
 for(const options of [{groups:0},{groups:2},{topicButtons:0},{topicButtons:2}])await assert.rejects(verify(options))
})
