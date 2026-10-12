import test from 'node:test'
import assert from 'node:assert/strict'
import { WEEK_THREE_DAYS, WEEK_THREE_CONTENT_STATUS } from '../data/inner-growth/week-three-days.js'
import { TRACKS, lessonFor as legacy } from '../lib/inner-growth/lesson-library.js'
import { lessonFor21, courseOutline21, COURSE_CONTENT_21_STATUS, COURSE_CONTENT_21_VERSION } from '../lib/inner-growth/lesson-library-21.js'
import { contentCoverage21, createCourseJourney, checkInBeforeLesson, dailyLesson, finishCourseDay } from '../lib/inner-growth/course-progression-21.js'

test('126 complete bilingual draft lessons; old84 untouched and new42 not copies',()=>{
 assert.equal(WEEK_THREE_CONTENT_STATUS,'ORIGINAL_DRAFT_REVIEW_REQUIRED')
 assert.equal(COURSE_CONTENT_21_STATUS,WEEK_THREE_CONTENT_STATUS)
 for(const locale of ['en','ru'])assert.deepEqual({...contentCoverage21(lessonFor21,undefined,locale),missing:[],duplicates:[]},{complete:true,expected:126,found:126,missing:[],duplicates:[]})
 const titles=new Set()
 for(const [track,days] of Object.entries(WEEK_THREE_DAYS)){
  assert.equal(days.length,7)
  for(const entry of days)for(const key of ['title','teaching','guide','action','aphorism','reflection']){
   assert.equal(entry[key].length,2)
   for(let i=0;i<2;i++){assert.ok(entry[key][i].length>12);if(['title','teaching','guide','action'].includes(key))assert.equal(TRACKS[track].some(old=>old[key][i]===entry[key][i]),false)}
  }
  for(const day of days)for(const title of day.title){assert.ok(!titles.has(title));titles.add(title)}
  assert.equal(legacy(track,15),null)
 }
 assert.equal(titles.size,84)
})
test('three-week bilingual outline and all126 specific outcomes are bound to standalone daily cards',()=>{
 for(const locale of ['en','ru']){
  const outline=courseOutline21(locale)
  assert.equal(outline.weeks.length,3);assert.equal(outline.clinicalValidation,false)
  assert.deepEqual(outline.weeks.flatMap(w=>w.days.map(d=>d.day)),Array.from({length:21},(_,i)=>i+1))
  assert.deepEqual(outline.weeks.flatMap(w=>w.days.filter(d=>d.review).map(d=>d.day)),[7,14,21])
  assert.equal(outline.sources.length,5)
  for(const source of outline.sources){assert.match(source.url,/^https:\/\//);assert.ok(source.principle.length>30)}
  for(const track of Object.keys(TRACKS))for(let day=1;day<=21;day++){
   const card=lessonFor21(track,day,locale),c=card.curriculum
   assert.equal(c.requiresPreviousTopicLesson,false)
   assert.ok(c.learningOutcome.length>15);assert.ok(c.recap.length>40)
   assert.equal(c.weekGoal,outline.weeks[Math.floor((day-1)/7)].goal)
   assert.equal(c.skill,outline.weeks[Math.floor((day-1)/7)].days[(day-1)%7].skill)
  }
 }
 assert.equal(courseOutline21('de'),null)
})
test('shorter and alternative variants contain less text, same day-specific idea/action, optional untimed completion',()=>{
 for(const track of Object.keys(TRACKS))for(let day=1;day<=21;day++)for(const locale of ['en','ru']){
  const standard=lessonFor21(track,day,locale),quick=lessonFor21(track,day,locale,'quick'),alternative=lessonFor21(track,day,locale,'grounding')
  const size=l=>l.sections.reduce((n,s)=>n+s.text.length,0)
  assert.ok(size(quick)<size(standard),`${track}:${day}:${locale}`)
  assert.ok(quick.durationSeconds<standard.durationSeconds)
  assert.equal(quick.ritual,standard.ritual);assert.equal(quick.title,standard.title)
  assert.equal(alternative.variant,'grounding');assert.equal(alternative.accessibility.eyesOpen,true)
  assert.equal(standard.completionTimerRequired,false);assert.equal(standard.generativeAI,false);assert.equal(standard.requiresEditorialReview,true)
 }
})
test('day14 is interim and day21 is final in the new version',()=>{
 for(const track of Object.keys(TRACKS)){
  const day14=lessonFor21(track,14),day21=lessonFor21(track,21)
  assert.equal(day14.week,2);assert.equal(day14.review,true);assert.equal(day21.week,3);assert.equal(day21.review,true)
  assert.notEqual(day14.title,legacy(track,14).title)
  assert.match(day14.sections.find(s=>s.kind==='learn').text,/next week/i)
 }
 assert.equal(lessonFor21('calm_regulation',22),null);assert.equal(lessonFor21('calm_regulation',1,'de'),null)
})
test('each selected track supports a complete21-day synthetic journey using real prepared content',()=>{
 for(const track of Object.keys(TRACKS))for(const locale of ['en','ru']){
  let s=createCourseJourney({id:'synthetic:'+track,choices:{confirmed:true,durationDays:21,topics:[{scaleId:'synthetic',track}]},consent:true,timeZone:'UTC',contentVersion:COURSE_CONTENT_21_VERSION,now:'2026-10-12T12:00:00Z'})
  const ids=[]
  for(let day=1;day<=21;day++){
   const now=new Date(Date.UTC(2026,9,11+day,12)).toISOString()
   s=checkInBeforeLesson(s,{day,skip:true,now,expectedRevision:s.revision})
   const card=dailyLesson(s,{now,locale,lessonFor:lessonFor21});assert.equal(card.status,'ready');ids.push(card.lesson.id)
   s=finishCourseDay(s,{day,lessonId:card.lesson.id,now,expectedRevision:s.revision,lessonFor:lessonFor21,locale})
  }
  assert.equal(s.status,'finished');assert.equal(new Set(ids).size,21)
 }
})
