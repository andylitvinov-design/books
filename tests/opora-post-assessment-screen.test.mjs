import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {recommendAntistressModule} from '../lib/inner-growth/antistress-module-router.js'

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')

test('the first post-test viewport is a recommendation with a real Day 1 action',()=>{
  const ui=read('components/app/antistress-module-finder.jsx')
  const root=read('components/app/my-course.jsx')
  const sections=['data-module-recommendation','data-opora-route-picker',
    'data-opora-results','data-opora-skills','data-opora-bottom-start']
  for(let i=1;i<sections.length;i++){
    assert.ok(ui.indexOf(sections[i-1]) < ui.indexOf(sections[i]),
      sections[i-1]+' should come before '+sections[i])
  }
  assert.match(ui,/Start course · Day 1/)
  assert.match(ui,/Начать курс · День 1/)
  assert.match(ui,/Comenzar curso · Día 1/)
  assert.equal((ui.match(/onClick=\{startDayOne\}/g)||[]).length,2)
  assert.match(ui,/data-course-consent-module/)
  assert.match(ui,/disabled=\{!canStart\}/)
  assert.match(ui,/Boolean\(weekly\)/)
  assert.match(ui,/onStart\(\{/)
  assert.match(ui,/moduleId:chosen/)
  assert.match(root,/stage >= 1 && stage <= 2 && !fastAntistressEntry/)
  assert.match(root,/stage >= 1 && stage <= 3 && <CourseR3Steps/)
})

test('all five selectable routes fit small screens without vertical words',()=>{
  const ui=read('components/app/antistress-module-finder.jsx')
  const css=read('components/app/antistress-module-finder.module.css')
  assert.match(ui,/ANTISTRESS_MODULE_GOALS\.map/)
  assert.match(ui,/aria-pressed=\{chosen===item\.id\}/)
  assert.match(ui,/onClick=\{\(\)=>setChosenRoute\(item\.id\)\}/)
  assert.match(ui,/setChosenRoute\(null\)/)
  assert.match(css,/@media\(max-width:520px\)/)
  assert.match(css,/@media\(max-width:390px\)/)
  assert.match(css,/grid-template-columns:30px minmax\(0,1fr\)/)
  assert.match(css,/grid-column:2;grid-row:2/)
  assert.match(css,/overflow-wrap:break-word/)
  assert.doesNotMatch(css,/word-break:break-all/)
})

test('assessment data and the optional skill refinement are collapsed by default',()=>{
  const ui=read('components/app/antistress-module-finder.jsx')
  assert.match(ui,/<details className=\{styles\.results\} data-opora-results>/)
  assert.match(ui,/<details className=\{styles\.skills\} data-opora-skills>/)
  assert.match(ui,/ANTISTRESS_MODULE_FINDER_ITEMS\.map/)
  assert.match(ui,/answers\[item\.id\]\?\?null/)
  assert.match(ui,/item\.recent&&Number\.isFinite\(item\.score\)/)
  assert.doesNotMatch(ui,/localStorage|sessionStorage/)
  const sample=recommendAntistressModule({
    weekly:{'weekly.load':6,'weekly.tension':7,'weekly.functioning':5},answers:{},
  })
  assert.equal(sample.moduleId,'AS2')
  assert.equal(sample.reason,'reported_overload')
})
