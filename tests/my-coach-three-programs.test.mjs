import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getVisibleCoachPrograms,COACH_VISIBLE_PROGRAM_IDS} from '../lib/coach-program-comparison.mjs'
import {coachCourseLaunchHref,getCoachCourseLaunch} from '../lib/coach-course-launch.mjs'

test('owner catalog exposes three offers in order, without granting paid access',()=>{
 assert.deepEqual(COACH_VISIBLE_PROGRAM_IDS,['clarity','anti-stress','goal'])
 for(const lang of ['en','ru','es']){
  const {programs}=getVisibleCoachPrograms(lang)
  assert.deepEqual(programs.map(p=>p.id),COACH_VISIBLE_PROGRAM_IDS)
  assert.deepEqual(programs.map(p=>p.count),[3,3,8])
  assert.deepEqual(programs.map(p=>p.rows.length),[3,3,8])
  assert.deepEqual(programs.map(p=>p.available),[true,false,false])
  for(const p of programs){
   assert.equal(coachCourseLaunchHref(lang,p.id),'/'+lang+'/my-coach/programs/'+p.id)
   assert.equal(getCoachCourseLaunch(lang,p.id).course.title,p.title)
  }
  for(const id of ['business','love','health'])assert.ok(getCoachCourseLaunch(lang,id))
 }
 const {programs}=getVisibleCoachPrograms('en')
 assert.deepEqual(programs.map(p=>p.price),['Free','€4.99','€19.99'])
})
test('comparison shows start only on selection and no footer pricing disclaimer',()=>{
 const jsx=readFileSync(new URL('../components/my-coach-program-comparison.jsx',import.meta.url),'utf8')
 assert.match(jsx,/useState\(null\)/)
 assert.match(jsx,/selected===p\.id/)
 assert.match(jsx,/\{selected&&<Link/)
 assert.doesNotMatch(jsx,/copy\.priceNote/)
})
