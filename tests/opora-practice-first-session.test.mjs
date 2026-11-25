import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { antistressInteractiveDay } from '../lib/inner-growth/anti-stress-interactive-catalog.js'
import { antiStressLabFor, validateAntiStressLabAnswers,
  antiStressLabChoiceLabel } from '../lib/inner-growth/anti-stress-practice-lab.js'
import { courseSingleLessonOutcome } from '../lib/inner-growth/course-single-lesson-outcome.js'
import { DAY_ONE_SLIDES } from '../lib/inner-growth/anti-stress-day-one.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('every one of the thirteen later anti-stress days has two genuinely different executable exercises',()=>{
  const ids=new Set()
  for(let day=2;day<=14;day++){
    for(const locale of ['ru','en']){
      const plan=antiStressLabFor(day,locale),catalog=antistressInteractiveDay(day,locale)
      assert.equal(plan.day,day)
      assert.equal(plan.skillId,catalog.skill)
      assert.equal(plan.skillTitle,catalog.title)
      assert.equal(plan.main.method,catalog.methods[0])
      assert.ok(catalog.methods.includes(plan.reflect.method))
      assert.notEqual(plan.main.method,plan.reflect.method)
      assert.equal(plan.main.steps.length,2)
      assert.equal(plan.reflect.steps.length,2)
      assert.ok(plan.main.steps.every(x=>x.length>=20))
      assert.ok(plan.reflect.steps.every(x=>x.length>=20))
      assert.ok(plan.main.options.length>=4)
      assert.ok(plan.reflect.options.length>=4)
      assert.ok(!plan.main.instruction.toLowerCase().includes('diagnose'))
      assert.ok(!plan.reflect.instruction.toLowerCase().includes('diagnose'))
      ids.add(locale+':'+day+':'+plan.main.method)
    }
  }
  assert.equal(ids.size,26)
})

test('private practice responses are bounded per day and must not accept fabricated options or private text',()=>{
  assert.deepEqual(validateAntiStressLabAnswers({main:'switched',reflect:'hint',attempt:'tried'},2),
    {main:'switched',reflect:'hint',attempt:'tried'})
  assert.deepEqual(validateAntiStressLabAnswers({main:'rest'},4),{main:'rest'})
  assert.equal(validateAntiStressLabAnswers(null,5),null)
  for(const invalid of [
    {main:'switched'},  // wrong day
    {main:'x'.repeat(200)},
    {privateNote:'a client name'},
    {main:'object',attempt:'diagnosed'},
    {main:'colour',reflect:['one']},
  ])assert.throws(()=>validateAntiStressLabAnswers(invalid,10),/INVALID_PRACTICE_LAB/)
  assert.throws(()=>validateAntiStressLabAnswers({main:'anything'},1),/INVALID_PRACTICE_LAB/)
  assert.throws(()=>validateAntiStressLabAnswers('unsafe',2),/INVALID_PRACTICE_LAB/)
  assert.equal(antiStressLabChoiceLabel(11,'main','time','ru'),'Мне нужно немного времени')
  assert.equal(antiStressLabChoiceLabel(11,'main','made-up','ru'),null)
})

test('lesson result separates practised skills, actual attempt, choice, comfort and score',()=>{
 const o=courseSingleLessonOutcome({locale:'ru',day:9,
   lesson:{antiStress:{skill:'Мягкая работа с мыслями'}},
   beforeNow:7,afterNow:5,comfort:'neutral',usefulness:'unchanged',
   flexibility:'more_choice',adaptationChoice:'simplify',practiceLab:{
     main:'notice',reflect:'must',attempt:'tried',
   },
 })
 assert.equal(o.skill,'Мягкая работа с мыслями')
 assert.equal(o.attempt,'Попробовал(а)')
 assert.equal(o.anchor,'Просто заметить мысль')
 assert.equal(o.anotherChoice,'От меня ждут ответа немедленно')
 assert.deepEqual(o.state,{before:7,after:5,delta:-2})
 assert.equal(o.comfort,'Нейтрально или терпимо')
 assert.equal(o.usefulness,'Явной пользы не заметил(а)')
 assert.equal(o.flexibility,'Немного больше свободы выбора')
 assert.equal(o.adaptation,'Попробовать короткую версию')
})
test('a skipped practice never fabricates a measured change, improvement or skill mastery',()=>{
 const o=courseSingleLessonOutcome({locale:'en',day:4,lesson:{title:'Day 4'},
   beforeNow:7,afterNow:null,comfort:'skip',flexibility:'unsure',practiceLab:{}})
 assert.equal(o.state,null)
 assert.equal(o.anchor,null)
 assert.equal(o.attempt,'Not reported')
 assert.equal(o.comfort,'Not reported')
 const dayOne=courseSingleLessonOutcome({locale:'ru',day:1,lesson:{antiStress:{skill:'Ориентация'}},
   dayOne:{anchor:'shape',practiceAttempt:'partly'}})
 assert.equal(dayOne.anchor,'Форма')
 assert.equal(dayOne.attempt,'Попробовал(а) частично')
})

test('the existing 15-slide sequence and 15-step first lesson remain unchanged',()=>{
 const player=read('components/app/course-slide-player.jsx')
 const builder=player.match(/function buildSlides\(lesson\) \{[\s\S]*?\n\}/)?.[0]
 assert.ok(builder)
 assert.deepEqual([...builder.matchAll(/kind:\s*'([^']+)'/g)].map(x=>x[1]),[
   'welcome','baseline','checkin','recall','idea','understand',
   'phrase','guided','ritual','transfer','symbol','reflection','moment','feedback'
 ])
 assert.match(builder,/guided\.map/)
 assert.equal(DAY_ONE_SLIDES.length,15)
 assert.equal((player.match(/isExtendedStress&&!neutralMode&&<PracticeLabComponent/g)||[]).length,2)
 assert.match(player,/const PracticeLabComponent=routePlan\?RoutePracticeLab:AntiStressPracticeLab/)
 assert.match(player,/data-course-real-lesson-result|<CourseLessonResult/)
 assert.match(player,/minutesEstimate/)
 assert.match(player,/practiceLab:isExtendedStress\?\(alreadyDone\?session\?\.signals\?\.practiceLab\|\|null:practiceLab\):null/)
})

test('the voluntary exercises and result use the existing private server workflow',()=>{
 const server=read('lib/app/growth-daily.js')
 const client=read('components/app/anti-stress-practice-lab.jsx')
 const player=read('components/app/course-slide-player.jsx')
 assert.match(server,/validateAntiStressLabAnswers\(input\.practiceLab,today\.day,routePlan\?\.practiceLab\)/)
 assert.match(server,/input\.practiceLab!==undefined/)
 assert.match(server,/practiceLab,practiceLabVersion:routePlan\?\(routePlan\.version\|\|'opora-nav2-lab-1'\):'opora-lab-1'/)
 assert.match(player,/onSession\(\{/)
 assert.match(client,/data-course-five-associations/)
 assert.match(client,/const accepted=onSaveReflection\(text\)/)
 assert.match(client,/setCopyError\(accepted===false\)/)
 assert.doesNotMatch(client,/onSaveReflection\(text\.slice/)
 assert.match(player,/onSaveReflection=\{appendRouteReflection\}/)
 assert.match(player,/if\(next.length>500\)return false/)
 assert.match(player,/setReflection\(next\);return true/)
 assert.match(server,/seal\(reflection,context\(actor,id,'course\.session_note'\),config\)/)
 assert.doesNotMatch(player,/data-course-global-discomfort|discomfortShortcut|discomfortAction/)
 assert.match(player,/data-course-discomfort-support/)
 assert.doesNotMatch(client,/fetch\(|localStorage|sessionStorage|speechSynthesis|analytics/i)
})
