import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {OPORA54_PRE_SAVE_KEYS,validateOpora54Signals} from '../lib/inner-growth/anti-stress-skills-v6.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const R={
  ru:{next:'Далее',save:'Сохранить практику',vote:'Пока сомневаюсь',
    partial:'Частично',plan:'Составил(а) план',result:'Практика сохранена',
    neutral:'Без изменений'},
  en:{next:'Continue',save:'Save my practice',vote:'Not sure yet',
    partial:'Partly',plan:'Made a plan',result:'Practice saved',
    neutral:'No change'},
}
const count=14
async function click(h,label){
  const node=findButton(h.tree,label)
  assert.ok(node,'Missing button '+label+': '+textOf(h.tree).slice(0,300))
  node.props.onClick()
  await h.settle()
}
const visibleButtonText=h=>nodes(h.tree).filter(n=>n.type==='button').map(textOf).join(' | ')

test('all 28 RU/EN V7 sessions traverse the 14 learning steps and save a truthful fifteenth receipt',async()=>{
  let lessons=0
  for(const lang of ['ru','en'])for(let day=1;day<=count;day++){
    const t=R[lang],lesson=lessonFor('calm_regulation',day,lang,'standard',COURSE_ANTISTRESS_SKILLS_V7)
    assert.ok(lesson)
    const data={
      cycle:{id:'00000000-0000-4000-8000-000000001015',day,durationDays:14,preferences:{}},
      programme:{id:'stress'},lesson,currentSession:null,
    }
    let requests=0,stored=null
    const h=mount('opora-v6-slide-player',{locale:lang,data,
      onClose(){},onFinish(){},onSession:async payload=>{requests++;stored=structuredClone(payload);return true},
    })
    for(let i=0;i<count;i++){
      const page=textOf(h.tree)
      assert.match(page,new RegExp((lang==='ru'?'Шаг':'Step')+'\\s+'+(i+1)+'\\s+'+(lang==='ru'?'из':'of')+'\\s+15'))
      assert.doesNotMatch(visibleButtonText(h),/Пропустить|Skip this step|Skip this check-in/)
      if(i===4)await click(h,t.vote)
      if(i===7){
        const action=lesson.opora54.exercises.notice.a[0]
        await click(h,action)
        assert.ok(textOf(h.tree).includes(lesson.opora54.exercises.notice.f[0]))
        await click(h,t.partial)
      }
      if(i===8){
        await click(h,lesson.opora54.exercises.act.choices[0])
        await click(h,t.partial)
      }
      if(i===10){
        const sc=lesson.opora54.scenario
        await click(h,sc.choices[1])
        assert.ok(textOf(h.tree).includes(sc.feedback[1]),
          'Choice-aware feedback on '+lang+' day '+day)
      }
      if(i===11){
        assert.ok(!lesson.opora54.exercises.act.choices.includes(lesson.opora54.exercises.transfer.choices[0]),
          'Transfer must not simply repeat the act choice')
        await click(h,lesson.opora54.exercises.transfer.choices[0])
        await click(h,t.plan)
      }
      if(i===12)await click(h,t.neutral)
      if(i===13){
        const preview=textOf(h.tree)
        assert.ok(preview.includes(lesson.opora54.exercises.act.choices[0]),
          'Actual selected exercise in save preview '+lang+' day '+day)
        assert.ok(preview.includes(lesson.opora54.exercises.transfer.choices[0]),
          'Possible plan in save preview '+lang+' day '+day)
      }
      if(i<13)await click(h,t.next)
      else await click(h,t.save)
    }
    assert.equal(requests,1,'one API save per '+lang+' day '+day)
    assert.equal(stored.lessonId,lesson.id)
    assert.deepEqual(stored.visitedSlideKeys,[...OPORA54_PRE_SAVE_KEYS])
    assert.equal(stored.opora54.answers.aphorism,'unsure')
    assert.equal(stored.opora54.answers.noticeChoice,'one')
    assert.equal(stored.opora54.answers.notice,'partly')
    assert.equal(stored.opora54.answers.actChoice,'one')
    assert.equal(stored.opora54.answers.act,'partly')
    assert.equal(stored.opora54.answers.scenario,'two')
    assert.equal(stored.opora54.answers.transferChoice,'one')
    assert.equal(stored.opora54.answers.transfer,'planned')
    assert.equal(stored.practiceAttempt,'simplified')
    assert.equal(stored.transferStage,'plan')
    assert.equal(stored.beforeNow,null)
    assert.equal(stored.afterNow,null)
    assert.equal(stored.opora54.ease,null)
    assert.deepEqual(validateOpora54Signals(stored.opora54).answers,stored.opora54.answers)
    assert.ok(textOf(h.tree).includes(t.result),'server-confirmed receipt')
    const receipt=textOf(h.tree)
    assert.ok(receipt.includes(lesson.opora54.exercises.act.choices[0]),
      'Actual selected exercise in saved receipt '+lang+' day '+day)
    assert.ok(receipt.includes(lesson.opora54.exercises.transfer.choices[0]),
      'Actual personal transfer plan in saved receipt '+lang+' day '+day)
    assert.match(receipt,lang==='ru'?/Частично получилось/:/Partly tried/)
    assert.doesNotMatch(receipt,/100% освоено|clinically proven|healed trauma/)
    h.unmount()
    lessons++
  }
  assert.equal(lessons,28)
})

test('public OPORA metadata is consistent with six paths, seven skills, and one 14-day course',()=>{
  const landing=read('components/public-antistress-landing.tsx')
  const routes=read('components/public-antistress-route-map.tsx')
  const dynamic=read('app/[locale]/courses/antistress/page.tsx')
  const spanish=read('app/es/courses/antistress/page.tsx')
  for(const term of ['"factSkills": "6 маршрутов"','"factSkills": "6 learning paths"',
    '"factSkills": "6 rutas"','title: "7 skills"','title: "7 habilidades"',
    'title: "7 навыков"','title: "6 routes"','title: "6 rutas"'])
    assert.ok(landing.includes(term),'Missing corrected public label: '+term)
  assert.doesNotMatch(landing,/title: "5 routes"|title: "5 rutas"/)
  assert.doesNotMatch(spanish,/Cinco rutas|cinco rutas/)
  assert.match(spanish,/14 días y 6 rutas/)
  assert.match(dynamic,/14 Days & 6 Learning Paths/)
  assert.match(dynamic,/14 занятий · 6 маршрутов/)
  assert.match(routes,/One OPORA programme\. Six personalized 14-day paths\./)
  assert.match(routes,/Одна программа ОПОРА — шесть персональных маршрутов/)
  assert.match(routes,/Un programa OPORA, seis rutas personalizadas de 14 días/)
  assert.match(routes,/clinical support/)
  assert.match(routes,/профессиональным|специалист/)
})
