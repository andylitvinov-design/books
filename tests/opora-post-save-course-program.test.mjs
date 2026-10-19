import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaExperienceDay} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_DAY_ONE_RESTORED_KEYS,OPORA_EXPERIENCE_PRE_SAVE_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

function fixture(locale,day){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000014001',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let finishCount=0
  const saved=[]
  const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){finishCount++},
    onSession:async payload=>{saved.push(structuredClone(payload));return true}})
  return {h,saved,get finishCount(){return finishCount}}
}
async function press(h,label){
  const b=findButton(h.tree,label)
  assert.ok(b,'Missing '+label+' in '+textOf(h.tree).slice(0,300))
  b.props.onClick()
  await h.settle()
}
const words={
  en:{next:'Continue',save:'Save my practice',receipt:'Your moment is saved',
    start:"See what's next",week1:'Week 1: Find your supports',week2:'Week 2: Make it your own',
    nextTitle:'Your next small step',map:'My course map',finished:'Your 14 days are complete'},
  ru:{next:'Продолжить',save:'Сохранить мою практику',receipt:'Ваш момент сохранён',
    start:'Посмотреть, что дальше',week1:'Первая неделя: найти опору',
    week2:'Вторая неделя: свой опыт',nextTitle:'Следующий маленький шаг',
    map:'К карте курса',finished:'Ваши 14 дней позади'},
}
test('confirmed Day 1 save leads to three programme slides with real 14-day titles and one map exit',async()=>{
  for(const locale of ['en','ru']){
    const f=fixture(locale,1),w=words[locale]
    for(let i=0;i<8;i++)await press(f.h,w.next)
    await press(f.h,w.save)
    assert.equal(f.saved.length,1)
    assert.deepEqual(f.saved[0].visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
    assert.match(textOf(f.h.tree),new RegExp(w.receipt))
    assert.equal(f.finishCount,0)
    await press(f.h,w.start)
    assert.match(textOf(f.h.tree),new RegExp(w.week1))
    for(let day=1;day<=7;day++)assert.ok(textOf(f.h.tree).includes(oporaExperienceDay(day,locale).title))
    const one=nodes(f.h.tree).find(n=>n.props?.['data-opora-program-week']==='1')
    assert.ok(one)
    await press(f.h,w.next)
    assert.match(textOf(f.h.tree),new RegExp(w.week2))
    for(let day=8;day<=14;day++)assert.ok(textOf(f.h.tree).includes(oporaExperienceDay(day,locale).title))
    await press(f.h,w.next)
    assert.match(textOf(f.h.tree),new RegExp(w.nextTitle))
    assert.ok(textOf(f.h.tree).includes(oporaExperienceDay(2,locale).practice))
    await press(f.h,w.map)
    assert.equal(f.finishCount,1)
    assert.equal(f.saved.length,1,'preview must not submit another lesson')
    f.h.unmount()
  }
})
test('Days 2-13 show the real next lesson after saving; Day 14 shows completion, not Day 15',async()=>{
  for(const day of [2,13,14]){
    const f=fixture('en',day),w=words.en
    for(let i=0;i<OPORA_EXPERIENCE_PRE_SAVE_KEYS.length-1;i++)await press(f.h,w.next)
    await press(f.h,w.save)
    assert.equal(f.saved.length,1)
    assert.deepEqual(f.saved[0].visitedSlideKeys,[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
    await press(f.h,w.start)
    const rendered=textOf(f.h.tree)
    if(day===14){
      assert.match(rendered,new RegExp(w.finished))
      assert.doesNotMatch(rendered,/Day 15/)
    }else{
      assert.ok(rendered.includes(oporaExperienceDay(day+1,'en').title))
      assert.ok(rendered.includes(oporaExperienceDay(day+1,'en').practice))
    }
    await press(f.h,w.map)
    assert.equal(f.finishCount,1)
    assert.equal(f.saved.length,1)
    f.h.unmount()
  }
})
