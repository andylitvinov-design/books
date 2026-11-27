import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {getCoachCourseLaunch,coachCourseLaunchHref,normalizeLaunchCoach} from '../lib/coach-course-launch.mjs'
import {courseCoachChoice,verifyCourseCoachChoice} from '../lib/app/coach-course-choice.mjs'
import {isUnifiedMobileDockAppPath,unifiedMobileDockActive} from '../lib/unified-mobile-dock.mjs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('one localized template for all four courses; only existing free course is launchable',()=>{
 for(const lang of ['en','ru','es'])for(const [program,count] of [['clarity',3],['business',8],['love',8],['health',8]]){
  const data=getCoachCourseLaunch(lang,program)
  assert.equal(data.course.count,count);assert.equal(data.course.rows.length,count)
  assert.equal(data.course.available,program==='clarity')
  assert.ok(data.copy.meet&&data.copy.details&&data.intro)
  assert.deepEqual(JSON.parse(JSON.stringify(data)),data)
  const path=coachCourseLaunchHref(lang,program)
  assert.equal(path,'/'+lang+'/my-coach/programs/'+program)
  assert.equal(isUnifiedMobileDockAppPath(path),true);assert.equal(unifiedMobileDockActive(path),'coach')
  assert.equal(coachCourseLaunchHref(lang,program,'genie'),path+'?coach=genie')
 }
 assert.equal(getCoachCourseLaunch('en','unknown'),null)
 assert.equal(coachCourseLaunchHref('en','https://outside.example'),null)
 assert.equal(normalizeLaunchCoach(['genie']), 'mira')
 assert.equal(normalizeLaunchCoach('genie'),'genie')
})
test('selection is short-lived, account-scoped if known, and cannot grant access or reset progress',()=>{
 const owner='12345678-1234-4234-8234-123456789012',other='12345678-1234-4234-8234-123456789013',now=10000
 const v=courseCoachChoice('clarity','merlin',owner,now)
 assert.equal(verifyCourseCoachChoice(v,'clarity',owner,now+1),'merlin')
 assert.equal(verifyCourseCoachChoice(v,'clarity',other,now+1),null)
 assert.equal(verifyCourseCoachChoice(v,'clarity',owner,now+900000),null)
 assert.equal(verifyCourseCoachChoice(v,'goal',owner,now+1),null)
 assert.equal(courseCoachChoice('business','mira',owner,now),null)
 assert.equal(courseCoachChoice('clarity','invalid',owner,now),null)
 assert.equal(verifyCourseCoachChoice(courseCoachChoice('clarity','genie',null,now),'clarity',owner,now+1),'genie')
 assert.equal(verifyCourseCoachChoice({...v,expires:Infinity},'clarity',owner,now+1),null)
})
test('course entry, selector, details below rail and private Daybook handoff are wired',()=>{
 const landing=read('components/my-coach-catalog.jsx')
 const comparison=read('components/my-coach-program-comparison.jsx')
 const page=read('app/[locale]/my-coach/programs/[program]/page.jsx')
 const view=read('components/my-coach-course-launch.jsx')
 const start=read('components/app/clarity-program.jsx')
 const dashboard=read('components/app/coaching-course-dashboard.jsx')
 assert.match(landing,/coachCourseLaunchHref\(lang,'clarity',selected\.id\)/)
 assert.match(comparison,/coachCourseLaunchHref\(lang,p\.id\)/)
 assert.match(page,/normalizeLaunchCoach\(query\?\.coach\)/)
 assert.match(view,/data-my-coach-hero=\{selected\.id\}/)
 assert.match(view,/data-course-coach-choice=\{id\}/)
 assert.match(view,/course\.available&&course\.id==='clarity'/)
 assert.match(view,/<ClarityStartLink locale=\{lang\} coachId=\{selected\.id\}/)
 assert.ok(view.indexOf('id="course-coach-rail"')<view.indexOf('data-course-session-details'))
 assert.match(start,/stageCoachCourseChoice\(program,coachId,boot\.account\.id\)/)
 assert.match(start,/continueTo:programContinuation\(program\)/)
 assert.match(dashboard,/consumeCoachCourseChoice\(program,accountId\)/)
 assert.match(dashboard,/sessionAvailable=program==='goal'/)
 assert.doesNotMatch(view,/startSession\(|live-token|paymentUrl|checkout/)
})
