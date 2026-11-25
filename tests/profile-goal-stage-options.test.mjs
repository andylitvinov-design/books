import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {GOAL_STAGE_OPTIONS,goalStageOptions,goalOptionHref} from '../lib/profile/goal-stage-options.mjs'
const stages=['result','motivation','resources','plan','obstacles','possibilities','acceleration','integration']
test('all eight stages have four distinct localized options and existing destination paths',()=>{
 assert.deepEqual(Object.keys(GOAL_STAGE_OPTIONS),stages)
 for(const locale of ['en','ru','es'])for(const stage of stages){
  const options=goalStageOptions(stage,locale)
  assert.equal(options.length,4)
  assert.equal(new Set(options.map(x=>x.route)).size,4)
  for(const option of options){
   assert.ok(option.title.trim()&&option.detail.trim())
   const href=goalOptionHref(option.route,{lang:locale,root:'/'+locale+'/app',planLink:'/'+locale+'/app/my-coaching-plan?goal=example'})
   assert.ok(href.startsWith('/'+locale+'/'))
   assert.ok(!href.includes('undefined'))
  }
 }
 assert.equal(goalOptionHref('unknown'),null)
})
test('stage click toggles an in-page region, only a single Start link navigates to Daybook',()=>{
 const source=readFileSync(new URL('../components/app/profile-goal-console.jsx',import.meta.url),'utf8')
 const css=readFileSync(new URL('../components/app/profile-goal-console.module.css',import.meta.url),'utf8')
 assert.match(source,/aria-expanded=\{expanded\}/)
 assert.match(source,/setExpandedStage\(current => current === id \? null : id\)/)
 assert.match(source,/aria-controls=\{'goal-stage-options-' \+ id\}/)
 assert.match(source,/hidden=\{!expanded\}/)
 assert.match(source,/data-goal-stage-start=\{index \+ 1\}/)
 assert.ok(source.includes('href={profileDaybookHref(root, goalId, index + 1)}'))
 assert.doesNotMatch(source,/options\.map|goalOptionHref|data-goal-stage-option=/)
 assert.match(css,/\.stageOptions\[hidden\]\{display:none!important\}/)
 assert.doesNotMatch(source,/href=\{hrefFor\(href\)\}/)
})
