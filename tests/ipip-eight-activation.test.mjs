import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {IPIP_THREE_DEFINITIONS,IPIP_THREE_CATALOG} from '../data/assessments/ipip-three-2026.js'
import {IPIP_FIVE_DEFINITIONS,IPIP_FIVE_CATALOG} from '../data/assessments/ipip-five-2026.js'
import {validateTestPlanInput} from '../lib/app/test-plans.js'
import {interpretationPlan} from '../lib/assessments/interpretation-registry.js'
const definitions=[...IPIP_THREE_DEFINITIONS,...IPIP_FIVE_DEFINITIONS]
const catalog=[...IPIP_THREE_CATALOG,...IPIP_FIVE_CATALOG]
const sourceVersions=['three','five'].flatMap(batch=>JSON.parse(readFileSync(new URL('../docs/assessments/ipip-'+batch+'-registration.json',import.meta.url))))
test('availability preserves the exact eight reviewed immutable source versions',()=>{
 assert.equal(sourceVersions.length,8)
 for(const d of definitions) {
  const source=sourceVersions.find(r=>r.id===d.id)
  assert.deepEqual(source,d)
  assert.equal(catalog.find(c=>c.key===d.key).startable,true)
  assert.ok(interpretationPlan(d.key,d.version))
 }
})
test('registered English forms can be selected in guest/account plans without translating questions',()=>{
 const items=definitions.map(d=>({definitionKey:d.key,definitionVersion:d.version,instrumentLocale:'en'}))
 for(const audience of ['guest','account']) {
  const plan=validateTestPlanInput({items,operationId:'10000000-0000-4000-8000-000000000001'},{audience})
  assert.equal(plan.definitionIds.length,8)
  for(const item of items)assert.throws(()=>validateTestPlanInput({items:[{...item,instrumentLocale:'ru'}],operationId:'10000000-0000-4000-8000-000000000001'},{audience}))
 }
})
