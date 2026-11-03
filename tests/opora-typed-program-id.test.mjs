import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('public Anti-Stress landing and ordinary course views use compatible string program IDs',()=>{
  const component=read('components/app/course-14-day-overview.jsx')
  const specialized=read('components/public-antistress-landing.tsx')
  const generic=read('components/public-growth-courses.tsx')
  assert.match(component,/programId = ''/)
  assert.match(component,/programId==='stress'/)
  assert.match(specialized,/Course14DayOverview locale=\{locale\} programId="stress"/)
  assert.match(generic,/Course14DayOverview locale=\{locale\} programId="stress"/)
})
