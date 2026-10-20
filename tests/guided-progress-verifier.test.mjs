import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { advanceSavedGuidedQuestion } from '../scripts/helpers/guided-progress-verifier.mjs'
async function scenario({guest=false,failed=false,wrongProgress=false}={}){
 let observe,clicked=false,finished=false
 const prefix=guest?'/api/app/guest/runs/':'/api/app/runs/'
 const response=(path,body,method='POST')=>({url:()=>`http://localhost:3100${path}`,request:()=>({method:()=>method,postDataJSON:()=>body}),ok:()=>!failed,json:async()=>({progress:wrongProgress?1:2}),finished:async()=>{finished=true}})
 const page={waitForResponse:predicate=>new Promise(resolve=>{observe=()=>{
  assert.equal(predicate(response(prefix+'id/save',{progress:1,answers:{}})),false)
  assert.equal(predicate(response(prefix+'id/save',{progress:2,answers:{q2:3}})),false)
  assert.equal(predicate(response(prefix+'id/save',{progress:2,answers:{}},'GET')),false)
  assert.equal(predicate(response((guest?'/api/app/runs/':'/api/app/guest/runs/')+'id/save',{progress:2,answers:{}})),false)
  const good=response(prefix+'id/save',{progress:2,answers:{}});assert.equal(predicate(good),true);resolve(good)
 }}),getByRole:(role,options)=>{assert.equal(role,'button');assert.deepEqual(options,{name:'Далее',exact:true});return {click:async()=>{clicked=true;observe()}}}}
 await advanceSavedGuidedQuestion(page,()=>({toBeEnabled:async()=>{}}),{locale:'ru',progress:2,guest})
 assert.ok(clicked&&finished)
}
test('guided account Next awaits and validates its distinct progress save',()=>scenario())
test('guided guest Next uses the guest endpoint without accepting account saves',()=>scenario({guest:true}))
test('failed progress response remains a failure',()=>assert.rejects(scenario({failed:true})))
test('wrong persisted progress remains a failure',()=>assert.rejects(scenario({wrongProgress:true})))
test('both instrument browser journeys use the progress gate and retain exact question checks',()=>{
 for(const path of ['verify-compassion-assessments.mjs','verify-relationships-assessments.mjs']){
  const s=readFileSync(new URL('../scripts/'+path,import.meta.url),'utf8')
  assert.match(s,/advanceSavedGuidedQuestion\(page,expect,\{locale,progress:i\+1,guest\}\)/)
  assert.ok(s.includes("name:d.questions[i].text,exact:true"))
 }
})
