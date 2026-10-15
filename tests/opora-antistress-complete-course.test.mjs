import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {antiStressDay,antiStressSkillCards,COURSE_ANTISTRESS_OUTCOME_V3} from '../lib/inner-growth/anti-stress-outcomes-v3.js'
import {antiStressPublicPlan,antiStressPublicSkills,ANTISTRESS_SCREEN_ROLES} from '../lib/inner-growth/anti-stress-day-scheme.js'
import {buildAntistressWeeklyCheckpoint} from '../lib/inner-growth/anti-stress-weekly-checkpoint.js'
import {getAssessmentDefinition} from '../lib/assessments/definitions.js'
import {scoreAssessment} from '../lib/assessments/scoring.js'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const start='2026-10-14T10:00:00Z'
const week=(id,date)=>({id,definitionKey:'hh-weekly-pulse',definitionVersion:'v1',
  instrumentLocale:'ru',translationVersion:'hh-ru-v1',
  contentHash:'hash:v1',scoringVersion:'v1',timeframe:'past-7-days',
  measurementAt:date,
})
const source={
  startedAt:start,completedLessons:7,testKeys:['hh-weekly-pulse'],
  results:[week('baseline','2026-10-14T09:00:00Z')],
}

test('all fourteen Anti-Stress days expose their true exercise, outcome and 18-stage scheme',()=>{
  assert.equal(ANTISTRESS_SCREEN_ROLES.length,18)
  assert.deepEqual(ANTISTRESS_SCREEN_ROLES.slice(0,3),['welcome','baseline','checkin'])
  assert.deepEqual(ANTISTRESS_SCREEN_ROLES.slice(-3),['saved-result','participation-xp','course-map'])
  for(const lang of ['en','ru','es']){
    const plan=antiStressPublicPlan(lang)
    assert.equal(plan.length,14)
    const skills=antiStressPublicSkills(lang)
    assert.equal(skills.length,7)
    for(const [index,day] of plan.entries()){
      assert.equal(day.day,index+1)
      assert.equal(day.skillId,'S'+(Math.floor(index/2)+1))
      assert.equal(day.checkDay,(index+1)%2===0)
      assert.ok(day.title.length>9)
      assert.ok(day.exercise.length>14)
      assert.ok(day.result.length>12)
      assert.equal(day.screens.length,18)
      assert.ok(day.screens.every((row,i)=>row.number===i+1&&row.expected.length>9))
      assert.ok(day.scales.length>0&&day.scales.every(scale=>scale.id&&scale.label))
      if(lang!=='es'){
        assert.equal(day.title,antiStressDay(index+1,lang).title)
        assert.equal(day.result,antiStressDay(index+1,lang).outcome)
      }
    }
  }
})

test('the public, guest, and private programme views reuse the exact curriculum',()=>{
  const publicPage=read('components/public-growth-courses.tsx')
  const guest=read('components/app/course-entry-selector.jsx')
  const privatePage=read('components/app/course-today.jsx')
  const overview=read('components/app/course-14-day-overview.jsx')
  assert.match(publicPage,/data-opora-14-day-public-plan/)
  assert.match(publicPage,/Course14DayOverview locale=\{locale\} programId="stress" compact/)
  assert.match(guest,/Course14DayOverview locale=\{locale\} programId=/)
  assert.match(privatePage,/data-course-full-14-day-scheme/)
  assert.match(overview,/antiStressPublicPlan/)
  assert.match(overview,/data-antistress-day-schema=\{day\.day\}/)
  assert.match(overview,/day\.screens\.map/)
})

test('7-day checkpoint never offers an unauthorized, duplicate or premature assessment',()=>{
  const before=buildAntistressWeeklyCheckpoint({...source,now:'2026-10-20T10:00:00Z'})
  assert.equal(before.canStart,false)
  assert.equal(before.completed,false)
  assert.equal(before.reason,'not_due')
  const due=buildAntistressWeeklyCheckpoint({...source,now:'2026-10-21T10:01:00Z'})
  assert.equal(due.canStart,true)
  assert.equal(due.baselineResultId,'baseline')
  assert.equal(due.instrumentLocale,'ru')
  assert.equal(buildAntistressWeeklyCheckpoint({...source,testKeys:[],now:'2026-10-21T10:01:00Z'}),null)
  assert.equal(buildAntistressWeeklyCheckpoint({...source,completedLessons:6,now:'2026-10-21T10:01:00Z'}),null)
  assert.equal(buildAntistressWeeklyCheckpoint({...source,completedLessons:14,now:'2026-10-29T10:00:00Z'}),null)
  const done=buildAntistressWeeklyCheckpoint({...source,now:'2026-10-22T15:00:00Z',
    results:[...source.results,week('follow-up','2026-10-21T11:00:00Z')]})
  assert.equal(done.completed,true)
  assert.equal(done.canStart,false)
  assert.equal(done.afterResultId,'follow-up')
  const wrongLocale=buildAntistressWeeklyCheckpoint({...source,now:'2026-10-22T10:00:00Z',
    results:[...source.results,{...week('mismatch','2026-10-21T11:00:00Z'),instrumentLocale:'en'}]})
  assert.equal(wrongLocale.completed,false)
})

test('GAD-7 Russian has all seven public-domain items, preserved scoring and explicit caveats',()=>{
  const ru=getAssessmentDefinition('gad-7','v1','ru')
  const en=getAssessmentDefinition('gad-7','v1','en')
  assert.notEqual(ru.id,en.id)
  assert.equal(ru.questions.length,7)
  assert.equal(ru.instrumentLocale,'ru')
  assert.equal(ru.timeframe,'past-2-weeks')
  assert.match(ru.translationVersion,/unvalidated/)
  assert.match(ru.source.permission,/no-permission-required/)
  const zero=Object.fromEntries(ru.questions.map(q=>[q.id,0]))
  const max=Object.fromEntries(ru.questions.map(q=>[q.id,3]))
  assert.equal(scoreAssessment(ru,zero).dimensions.find(d=>d.key==='symptoms.gad7.total').value,0)
  assert.equal(scoreAssessment(ru,max).dimensions.find(d=>d.key==='symptoms.gad7.total').value,21)
})

test('14 days support educational activity evidence without turning clicks into therapy outcomes',()=>{
  const player=read('components/app/course-slide-player.jsx')
  const service=read('lib/app/growth-daily.js')
  const setup=read('components/app/course-r3-steps.jsx')
  const flow=read('lib/app/course-test-flow.js')
  assert.match(player,/data-course-aphorism-dialogue/)
  assert.match(player,/data-course-practice-attempt/)
  assert.match(player,/data-course-everyday-transfer/)
  assert.match(player,/data-antistress-skill-probe/)
  assert.match(service,/practiceAttempt:optionalChoice/)
  assert.match(service,/skillProbeChoice:probeChoice/)
  assert.match(service,/COURSE_ANTISTRESS_OUTCOME_V3/)
  assert.match(setup,/hh-weekly-pulse','gad-7/)
  assert.match(flow,/startOrResumeCourseWeeklyCheckpoint/)
  assert.match(service,/buildAntistressWeeklyCheckpoint/)
  assert.equal(COURSE_ANTISTRESS_OUTCOME_V3,'hh-antistress-outcomes-v3-20261014')
})
