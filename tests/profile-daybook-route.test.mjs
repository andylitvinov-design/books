import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {profileDaybookHref} from '../lib/profile/profile-daybook-route.mjs'
import {daybookRouteOptions} from '../lib/app/daybook-route-intent.mjs'
import {GUIDE_WEEKS} from '../lib/app/daybook-guide.mjs'
const goal='12345678-1234-4234-8234-123456789abc'
test('every profile stage opens the correct canonical Daybook position in every locale',()=>{
 for(const locale of ['ru','en','es'])for(let stage=1;stage<=8;stage++){
  const url=new URL(profileDaybookHref('/'+locale+'/app',goal,stage,3),'https://example.test')
  assert.equal(url.pathname,'/'+locale+'/app/daybook')
  const options=daybookRouteOptions(Object.fromEntries(url.searchParams))
  assert.equal(options.initialGoalId,goal);assert.equal(options.initialStage,stage);assert.equal(options.initialLevel,1);assert.equal(options.initialStep,3);assert.equal(options.initialTab,'stages')
 }
 const invalid=new URL(profileDaybookHref('/ru/app','private text',9,0),'https://example.test')
 assert.equal(invalid.searchParams.has('goal'),false);assert.equal(invalid.searchParams.get('stage'),'1')
})
test('profile numbering agrees with canonical guide and keeps exercises out of profile',()=>{
 const s=readFileSync(new URL('../components/app/profile-goal-console.jsx',import.meta.url),'utf8')
 const block=s.split('const STEPS = [')[1].split(']')[0]
 const ids=[...block.matchAll(/id: '([^']+)'/g)].map(m=>m[1])
 assert.deepEqual(ids,['result','motivation','plan','resources','obstacles','possibilities','acceleration','integration'])
 assert.deepEqual(GUIDE_WEEKS.map(w=>w.id),['discover','vision','plan','resources','obstacles','options','progress'])
 assert.ok(s.includes('GOAL_STAGE_IDS.indexOf(id)'))
 assert.ok(s.includes('data-goal-stage-start'))
 assert.doesNotMatch(s,/goalStageOptions|goalOptionHref|my-coaching-plan/)
 const focus=readFileSync(new URL('../components/app/profile-space-focus.jsx',import.meta.url),'utf8')
 assert.ok(focus.includes('profileDaybookHref(root, String(goal.id))'))
})
