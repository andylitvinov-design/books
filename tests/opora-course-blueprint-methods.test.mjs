import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {antiStressBlueprint,OPORA_SKILLS,OPORA_TESTS,OPORA_METRICS,OPORA_APPROACHES} from '../lib/inner-growth/anti-stress-blueprint.js'
import {antiStressDay,antiStressSkillCards} from '../lib/inner-growth/anti-stress-outcomes-v3.js'
import {oporaSkillForDay} from '../lib/inner-growth/anti-stress-skills-v5.js'
import {getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {antiStressMethodActivity,validateAntiStressMethodChoice,ANTI_STRESS_METHOD_ACTIVITIES} from '../lib/inner-growth/anti-stress-method-activities.js'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('the public landing and the learner share exactly seven verified skills and fourteen authored days',()=>{
 assert.equal(OPORA_SKILLS.length,7)
 for(const locale of ['ru','en','es']){
   const b=antiStressBlueprint(locale)
   assert.equal(b.skills.length,7)
   assert.equal(b.days.length,14)
   assert.deepEqual(b.skills.map(s=>s.days),[[1,8],[2,9],[3,10],[4,11],[5,12],[6,13],[7,14]])
   const real=antiStressSkillCards(locale==='es'?'en':locale)
   assert.deepEqual(b.skills.map(s=>s.id),real.map(s=>s.id))
   for(let day=1;day<=14;day++){
      const p=b.days[day-1]
      assert.equal(p.day,day)
      assert.equal(p.skillId, 'S'+((day-1)%7+1))
      assert.equal(p.title,day===p.day?b.days[day-1].title:'')
      if(locale!=='es')assert.equal(p.title,oporaSkillForDay(day,locale).title)
      assert.ok(p.methodNames.length>=3)
   }
 }
})
test('primary outcome is weekly.load and does not mix instruments or timeframes',()=>{
 const primary=OPORA_METRICS.filter(s=>s.tier==='primary')
 assert.deepEqual(primary.map(s=>s.id),['weekly.load'])
 assert.equal(primary[0].direction,'down')
 assert.equal(primary[0].test,'hh-weekly-pulse')
 assert.equal(OPORA_METRICS.find(m=>m.id==='gad-7').test,'gad-7')
 for(const m of OPORA_METRICS)assert.ok(['down','up'].includes(m.direction))
 assert.deepEqual(OPORA_TESTS.map(t=>[t.key,t.count,t.role]),[
  ['hh-weekly-pulse',8,'core'],['gad-7',7,'optional'],['hh-resource-pulse',6,'optional']])
 const weeklyRu=getAssessmentDefinition('hh-weekly-pulse','v1','ru')
 assert.equal(weeklyRu.timeframe,'past-7-days')
 assert.equal(weeklyRu.questions.length,8)
 const gadRu=getAssessmentDefinition('gad-7','v1','ru')
 assert.equal(gadRu.timeframe,'past-2-weeks')
 assert.match(gadRu.translationVersion,/unvalidated/)
})
test('seven approaches are transparent about educational scope and link to real sources',()=>{
 assert.equal(OPORA_APPROACHES.length,7)
 assert.ok(OPORA_APPROACHES.every(a=>a.title.ru&&a.title.en&&a.reference.startsWith('https://')))
 assert.match(OPORA_APPROACHES.map(a=>a.id).join(' '),/trauma-informed/)
 assert.match(OPORA_APPROACHES.map(a=>a.id).join(' '),/act/)
 assert.match(OPORA_APPROACHES.map(a=>a.id).join(' '),/cbt/)
 const landing=source('components/public-antistress-landing.tsx')
 const evidence=source('components/public-antistress-evidence.tsx')
 const overview=source('components/app/course-14-day-overview.jsx')
 assert.match(landing,/programme.skills.map/)
 assert.match(landing,/previewDay\(stageDays\[0\]\)/)
 assert.match(landing,/PublicAntistressEvidence/)
 assert.match(evidence,/data-antistress-measurements/)
 assert.match(evidence,/data-antistress-test=/)
 assert.match(evidence,/data-antistress-methodologies/)
 assert.match(overview,/antiStressBlueprint/)
})
test('days two through fourteen have real safe interactive activity, not a passive repeating list',()=>{
 assert.equal(ANTI_STRESS_METHOD_ACTIVITIES.length,13)
 assert.deepEqual(ANTI_STRESS_METHOD_ACTIVITIES.map(a=>a.day),Array.from({length:13},(_,i)=>i+2))
 assert.equal(new Set(ANTI_STRESS_METHOD_ACTIVITIES.map(a=>a.kind)).size,13)
 for(const lang of ['ru','en']){
   for(let day=2;day<=14;day++){
     const a=antiStressMethodActivity(day,lang)
     assert.equal(a.day,day)
     assert.equal(a.title,antiStressDay(day,lang).title)
     assert.equal(a.skillId,antiStressDay(day,lang).skillId)
     assert.equal(a.choices.length,4)
     assert.equal(new Set(a.choices.map(q=>q.value)).size,4)
     assert.ok(a.choices.every(q=>q.label.length>=5))
     assert.equal(validateAntiStressMethodChoice(day,a.choices[0].value),a.choices[0].value)
     assert.equal(validateAntiStressMethodChoice(day,null),null)
     assert.throws(()=>validateAntiStressMethodChoice(day,'not_in_catalog'),/INVALID/)
   }
 }
 assert.equal(antiStressMethodActivity(1),null)
 assert.throws(()=>validateAntiStressMethodChoice(1,'object'),/INVALID/)
})
test('server accepts only bounded activity codes for active stress days 2 to 14',()=>{
 const client=source('components/app/course-slide-player.jsx')
 const server=source('lib/app/growth-daily.js')
 const methods=source('components/app/anti-stress-method-activity.jsx')
 const course=source('lib/app/growth-course.js')
 const picker=source('components/app/course-r3-steps.jsx')
 assert.match(client,/dailyMethodChoice:dailyMethodChoice\|\|null/)
 assert.match(client,/AntiStressMethodActivity/)
 assert.match(client,/cycle.day>1/)
 assert.match(server,/validateAntiStressMethodChoice\(today.day,input.dailyMethodChoice,routePlan\?\.methodActivity\)/)
 assert.match(server,/INVALID_OPORA_METHOD_DAY/)
 assert.match(server,/dailyMethodHintUsed:Boolean\(input.dailyMethodHintUsed\)/)
 assert.match(methods,/data-opora-method-day/)
 assert.match(methods,/data-opora-method=/)
 assert.match(methods,/data-opora-method=.+/)
 assert.match(course,/COURSE_ANTISTRESS_BASELINE_REQUIRED/)
 assert.ok(picker.includes("withAntistressRequiredBaseline("),'Weekly Pulse is included by the onboarding helper')
 assert.ok(picker.includes("if(isAntistress && key===ANTISTRESS_REQUIRED_BASELINE_KEY) return"),'Mandatory Weekly Pulse cannot be unchecked')
 assert.doesNotMatch(methods,/autoplay|traumatic memories|diagnosis from answers/)
})
