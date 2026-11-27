import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {getGoalLanding} from '../lib/goal-landing.mjs'
import {STAGES} from '../lib/app/daybook-stages.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('eight localized goal screens correspond exactly to existing Daybook weeks and review',()=>{
 for(const lang of ['en','ru','es']){
  const t=getGoalLanding(lang)
  assert.equal(t.benefitsList.length,4)
  assert.deepEqual(t.lessons.map(x=>x.id),[...STAGES.map(x=>x.id),'review'])
  assert.deepEqual(t.lessons.map(x=>x.number),[1,2,3,4,5,6,7,8])
  for(const lesson of t.lessons){
   assert.ok(lesson.title&&lesson.subtitle&&lesson.outcome)
   assert.equal(lesson.points.length,3)
   assert.ok(lesson.points.every(x=>x.trim()))
  }
 }
})
test('public and guest goal brochures share eight independent screens; active cabinet stays compact',()=>{
 const ui=read('components/goal-landing-sections.jsx')
 const css=read('components/goal-landing-sections.module.css')
 const publicPage=read('components/public-program-overview.jsx')
 const profile=read('components/app/profile-goal-console.jsx')
 assert.match(ui,/t\.lessons\.map\(\(lesson,index\)/)
 assert.match(ui,/data-goal-landing-screen=\{lesson.id\}/)
 assert.match(ui,/data-program-session=\{index\+1\}/)
 assert.match(css,/min-height:min\(700px,calc\(100svh - 112px\)\)/)
 assert.doesNotMatch(css,/height:100dvh|overflow-y:hidden/)
 assert.match(publicPage,/<GoalLandingBenefits locale=\{p.locale\}\/><GoalLandingSections locale=\{p.locale\}\/>/)
 assert.match(profile,/\{showLanding && <GoalLandingSections locale=\{lang\} showHeading=\{false\}\/>/)
 assert.match(profile,/data-goal-public-details/)
 assert.match(profile,/profileDaybookHref\(root, goalId, next.week, next.step\)/)
 for(const id of [...STAGES.map(s=>s.id),'review'])assert.ok(css.includes('data-goal-art="'+id+'"'))
 for(const m of css.matchAll(/url\('\/(images\/[^']+)'\)/g))assert.ok(existsSync(new URL('../public/'+m[1],import.meta.url)),m[1])
})
