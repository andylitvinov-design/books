import test from 'node:test'
import assert from 'node:assert/strict'
import { createCourseJourney, journeyStatus, checkInBeforeLesson, dailyLesson, feedbackProposal, finishCourseDay, pauseCourseJourney, setCoursePreferences, contentCoverage21, reviewCourseLesson, courseWeek } from '../lib/inner-growth/course-progression-21.js'
import { lessonFor as existingLessonFor } from '../lib/inner-growth/lesson-library.js'
const NOW='2026-10-12T12:00:00.000Z'
const syntheticLesson=(track,day,locale='en',variant='standard')=>({id:`synthetic:${track}:${day}`,version:'synthetic-content-v1',domain:track,day,title:`Synthetic lesson ${day}`,aphorism:'Synthetic reflection',ritual:'Synthetic task',reflection:'Synthetic question',variant,length:variant,
 sections:['arrive','learn','meditation','ritual','finish'].map(kind=>({kind,text:`Synthetic ${locale} ${kind} for day ${day}`})),accessibility:{eyesOpen:true,naturalBreathing:true,stopAnytime:true}})
const choices={confirmed:true,durationDays:21,topics:[{scaleId:'synthetic:a',track:'calm_regulation'},{scaleId:'synthetic:b',track:'inner_support'},{scaleId:'synthetic:c',track:'energy_agency'}]}
const journey=(options={})=>createCourseJourney({id:'synthetic-journey',choices,consent:true,timeZone:'UTC',contentVersion:'synthetic-content-v1',now:NOW,...options})
const atDay=(n)=>new Date(Date.parse(NOW)+(n-1)*86400000).toISOString()
function begin(s,now=NOW,options={}){return checkInBeforeLesson(s,{day:s.nextDay,skip:true,now,expectedRevision:s.revision,...options})}
function finish(s,now=NOW,options={}){const l=dailyLesson(s,{now,lessonFor:syntheticLesson,confirmAlternative:true});return finishCourseDay(s,{day:s.nextDay,lessonId:l.lesson?.id,now,expectedRevision:s.revision,lessonFor:syntheticLesson,confirmAlternative:true,...options})}

test('exactly three weeks, no diagnosis time charged, optional checkin before lesson',()=>{
 let s=journey();assert.equal(s.durationDays,21);assert.equal(journeyStatus(s,NOW).day,1);assert.equal(dailyLesson(s,{now:NOW,lessonFor:syntheticLesson}).lesson,null)
 s=begin(s);assert.equal(s.checkins[1].wellbeing,null);assert.equal(s.checkins[1].formalAssessment,false)
 assert.equal(dailyLesson(s,{now:NOW,lessonFor:syntheticLesson}).status,'ready')
 assert.deepEqual([1,7,8,14,15,21].map(d=>courseWeek(d).week),[1,1,2,2,3,3]);assert.throws(()=>courseWeek(22),/INVALID_LEARNING_DAY/)
 assert.equal(s.habitGuarantee,false);assert.equal(s.notificationsEnabled,false)
})
test('21 new learning days; no day22 and all completed lessons remain repeatable',()=>{
 let s=journey();const ids=[]
 for(let day=1;day<=21;day++){s=begin(s,atDay(day));const lesson=dailyLesson(s,{now:atDay(day),lessonFor:syntheticLesson});ids.push(lesson.lesson.id);s=finish(s,atDay(day))}
 assert.equal(new Set(ids).size,21);assert.equal(s.status,'finished');const v=journeyStatus(s,atDay(30));assert.equal(v.day,null);assert.equal(v.completedDays,21);assert.equal(v.progressMeaning,'lessons-completed-not-health-improvement')
 assert.equal(reviewCourseLesson(s,{day:1,lessonFor:syntheticLesson}).changesProgress,false)
})
test('one new lesson per local day; same-day double click cannot advance twice',()=>{
 let s=finish(begin(journey()));assert.equal(journeyStatus(s,NOW).status,'next-local-day')
 assert.throws(()=>begin(s),/DAY_NOT_AVAILABLE/)
 assert.throws(()=>finishCourseDay(s,{day:1,now:NOW,expectedRevision:0,lessonFor:syntheticLesson}),/DAY_NOT_AVAILABLE/)
 assert.equal(journeyStatus(s,atDay(2)).status,'check-in-required')
})
test('time zone midnight and DST use local dates',()=>{
 let s=journey({timeZone:'America/New_York',now:'2026-11-01T03:30:00.000Z'})
 s=finish(begin(s,'2026-11-01T03:30:00.000Z'),'2026-11-01T03:30:00.000Z')
 assert.equal(journeyStatus(s,'2026-11-01T04:01:00.000Z').status,'check-in-required')
 s=finish(begin(s,'2026-11-01T05:30:00.000Z'),'2026-11-01T05:30:00.000Z')
 assert.equal(journeyStatus(s,'2026-11-01T06:30:00.000Z').status,'next-local-day')
 assert.throws(()=>journey({timeZone:'Not/AZone'}),/TIMEZONE/)
})
test('absence, skip and pause preserve progress without added work',()=>{
 let s=finish(begin(journey()));s=pauseCourseJourney(s,{paused:true,now:atDay(2),expectedRevision:s.revision})
 assert.equal(journeyStatus(s,atDay(30)).status,'paused');assert.equal(s.nextDay,2)
 s=pauseCourseJourney(s,{paused:false,now:atDay(30),expectedRevision:s.revision});s=begin(s,atDay(30));s=finish(s,atDay(30),{status:'skipped'})
 const v=journeyStatus(s,atDay(31));assert.equal(v.completedDays,1);assert.equal(v.day,3);assert.equal(v.penalty,0);assert.equal(v.progressReset,false);assert.equal(v.additionalWorkRequired,false)
 assert.equal(reviewCourseLesson(s,{day:2,lessonFor:syntheticLesson}).mode,'optional-catchup')
 assert.equal(journeyStatus(s,atDay(99)).day,3)
})
test('wellbeing has no invented cutoff; explicit low energy or available time selects shorter practice',()=>{
 let s=begin(journey(),NOW,{skip:false,wellbeing:0,energy:'usual'});assert.equal(dailyLesson(s,{now:NOW,lessonFor:syntheticLesson}).length,'standard')
 s=begin(journey(),NOW,{skip:false,wellbeing:9,energy:'low'});assert.equal(dailyLesson(s,{now:NOW,lessonFor:syntheticLesson}).length,'quick')
 assert.throws(()=>begin(journey(),NOW,{wellbeing:11}),/INVALID_WELLBEING/)
 const rest=begin(journey(),NOW,{pauseRequested:true});assert.equal(dailyLesson(rest,{now:NOW,lessonFor:syntheticLesson}).lesson,null)
})
test('feedback only changes future prepared variants with explicit apply; no escalation',()=>{
 let s=finish(begin(journey()),NOW,{feedback:{difficulty:'too-hard'},applyFeedback:false});assert.equal(s.preferences.length,'standard')
 s=finish(begin(journey()),NOW,{feedback:{difficulty:'too-hard'},applyFeedback:true});assert.equal(s.preferences.length,'quick')
 s=begin(s,atDay(2));assert.equal(dailyLesson(s,{now:atDay(2),lessonFor:syntheticLesson}).length,'quick')
 assert.equal(dailyLesson(s,{now:atDay(2),lessonFor:syntheticLesson}).automaticIntensityIncrease,false)
})
test('discomfort offers stop/alternative, cannot rename original as safe alternative',()=>{
 let s=finish(begin(journey()),NOW,{feedback:{comfort:'uncomfortable'},applyFeedback:true});s=begin(s,atDay(2))
 assert.equal(dailyLesson(s,{now:atDay(2),lessonFor:syntheticLesson}).status,'choose-comfortable-option')
 assert.equal(dailyLesson(s,{now:atDay(2),lessonFor:syntheticLesson,confirmAlternative:true}).lesson.variant,'grounding')
 const lying=(...args)=>({...syntheticLesson(...args),variant:'standard'})
 assert.equal(dailyLesson(s,{now:atDay(2),lessonFor:lying,confirmAlternative:true}).status,'alternative-unavailable')
})
test('free comments stay private journal text, never advertised as automatically understood',()=>{
 const f=feedbackProposal({comment:'Synthetic personal comment',reflectionAnswer:'Synthetic answer'})
 assert.equal(f.externalTransmission,false);assert.equal(f.monitoredForUrgentHelp,false);assert.equal(f.commentProcessing,'private-journal-only-not-automatically-interpreted')
 assert.equal(f.proposal.length,null);assert.equal(f.proposal.alternativeRequested,false)
 assert.throws(()=>feedbackProposal({comment:'x'.repeat(1001)}),/INVALID_PRIVATE_COMMENT/)
 assert.throws(()=>feedbackProposal({comfort:'diagnosis'}),/INVALID_COMFORT/)
})
test('prepared-content coverage detects 42 missing lessons in current library and duplicate IDs',()=>{
 const base=contentCoverage21(existingLessonFor);assert.equal(base.expected,126);assert.equal(base.found,84);assert.equal(base.missing.length,42);assert.equal(base.complete,false)
 assert.equal(contentCoverage21(syntheticLesson).complete,true)
 const duplicate=(...args)=>({...syntheticLesson(...args),id:'same'});assert.equal(contentCoverage21(duplicate).duplicates.length,125)
})
test('stale revisions and unknown lesson ID rejected; data input is not mutated',()=>{
 const s=journey(),before=structuredClone(s);begin(s);assert.deepEqual(s,before)
 assert.throws(()=>checkInBeforeLesson(s,{day:1,skip:true,now:NOW,expectedRevision:99}),/STALE_COURSE_REVISION/)
 const b=begin(s);assert.throws(()=>finishCourseDay(b,{day:1,lessonId:'wrong',now:NOW,expectedRevision:b.revision,lessonFor:syntheticLesson}),/EXACT_CURRENT_LESSON_REQUIRED/)
 assert.throws(()=>setCoursePreferences(b,{length:'intense',alternativeRequested:false,stopOffer:false,now:NOW,expectedRevision:b.revision}),/INVALID_PREFERENCES/)
})

test('explicitly feeling worse lowers load without inventing numeric wellbeing bands',()=>{
 const s=begin(journey(),NOW,{skip:false,wellbeing:7,energy:'usual',feelingChange:'worse'})
 const lesson=dailyLesson(s,{now:NOW,lessonFor:syntheticLesson});assert.equal(lesson.length,'quick');assert.equal(lesson.canRest,true);assert.equal(lesson.canStop,true)
})
test('confirmation requires booleans; helpful repeats are optional and do not replace new lessons',()=>{
 assert.throws(()=>journey({consent:'yes'}),/CONSENT_AND_TOPICS_REQUIRED/)
 let s=begin(journey());assert.throws(()=>finish(s,NOW,{applyFeedback:'yes'}),/INVALID_FEEDBACK_CONFIRMATION/)
 s=finish(s,NOW,{feedback:{helpfulness:'helpful'}})
 for(let day=2;day<=3;day++)s=finish(begin(s,atDay(day)),atDay(day))
 s=begin(s,atDay(4));const l=dailyLesson(s,{now:atDay(4),lessonFor:syntheticLesson});assert.equal(l.repeatSuggestion.day,1);assert.equal(l.repeatSuggestion.optional,true);assert.notEqual(l.lesson.id,l.repeatSuggestion.lessonId)
})


test('a saved checkin from a previous local date must be refreshed or explicitly skipped again',()=>{
 const s=begin(journey());assert.equal(dailyLesson(s,{now:atDay(10),lessonFor:syntheticLesson}).status,'check-in-required')
 assert.throws(()=>finish(s,atDay(10),{status:'skipped'}),/CHECKIN_OR_EXPLICIT_SKIP_REQUIRED/)
 assert.equal(dailyLesson(begin(s,atDay(10)),{now:atDay(10),lessonFor:syntheticLesson}).status,'ready')
})
test('journey pins content version and repeat pins exact saved lesson identity',()=>{
 let s=begin(journey())
 const changed=(...a)=>({...syntheticLesson(...a),version:'new-content'})
 assert.equal(dailyLesson(s,{now:NOW,lessonFor:changed}).status,'material-unavailable')
 s=finish(s)
 assert.equal(reviewCourseLesson(s,{day:1,lessonFor:changed}).status,'material-unavailable')
 const renamed=(...a)=>({...syntheticLesson(...a),id:'different-id'})
 assert.equal(reviewCourseLesson(s,{day:1,lessonFor:renamed}).status,'material-unavailable')
 const variant=(...a)=>({...syntheticLesson(...a),variant:'quick'})
 assert.equal(reviewCourseLesson(s,{day:1,lessonFor:variant}).status,'material-unavailable')
 assert.equal(reviewCourseLesson(s,{day:1,lessonFor:syntheticLesson}).lesson.id,s.sessions[1].lessonId)
})

test('a skipped day with helpful feedback is never suggested as a completed repeat',()=>{
 let state=finish(begin(journey()),NOW,{status:'skipped',feedback:{helpfulness:'helpful'}})
 state=finish(begin(state,atDay(2)),atDay(2));state=finish(begin(state,atDay(3)),atDay(3));state=begin(state,atDay(4))
 assert.equal(dailyLesson(state,{now:atDay(4),lessonFor:syntheticLesson}).repeatSuggestion,null)
})
