import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaEndingCopy} from '../lib/inner-growth/opora-lesson-outro.js'
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
  en:{next:'Continue',save:'Save my practice',
    audio:'Relax with waves',start:"See what's next",week1:'Week 1: Find your supports',week2:'Week 2: Make it your own',
    nextTitle:'Your next small step',map:'My course map',finished:'Your 14 days are complete',habit:'Keep OPORA close',configure:'Set it up',later:'Not now'},
  ru:{next:'Продолжить',save:'Сохранить мою практику',
    audio:'Послушать волны',start:'Посмотреть, что дальше',week1:'Первая неделя: найти опору',
    week2:'Вторая неделя: свой опыт',nextTitle:'Следующий маленький шаг',
    map:'К карте курса',finished:'Ваши 14 дней позади',habit:'ОПОРА всегда под рукой',configure:'Настроить',later:'Не сейчас'},
}
test('confirmed Day 1 save leads to programme, commitment, optional phone setup, then tomorrow',async()=>{
  for(const locale of ['en','ru']){
    const f=fixture(locale,1),w=words[locale]
    for(let i=0;i<9;i++)await press(f.h,w.next)
    await press(f.h,locale==='ru'?'Получилось немного':'I managed a little')
    await press(f.h,w.save)
    assert.equal(f.saved.length,1)
    assert.deepEqual(f.saved[0].visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
    assert.ok(textOf(f.h.tree).includes(oporaEndingCopy(locale).congratsTitle.replace('{day}','1')),
      'Only a confirmed save shows the first-lesson completion receipt')
    assert.equal(findButton(f.h.tree,w.save),undefined)
    assert.equal(f.finishCount,0)
    await press(f.h,w.audio)
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
    await press(f.h,"I'm committed")
    assert.match(textOf(f.h.tree),new RegExp(w.habit))
    assert.ok(findButton(f.h.tree,w.configure),'Setup must require explicit opt in')
    assert.ok(findButton(f.h.tree,w.later),'Not now must always remain available')
    assert.equal(f.finishCount,0)
    await press(f.h,w.configure)
    assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-setup']),
      'Settings become visible only after opting in')
    await press(f.h,w.next)
    assert.match(textOf(f.h.tree),locale==='ru'?/Увидимся завтра/:/See you tomorrow/)
    assert.deepEqual(nodes(f.h.tree).filter(node=>node.type==='a').map(node=>node.props.href),[
      '/'+locale+'/tests','/'+locale+'/academy/principles-of-energywork/learn',
      '/'+locale+'/services/free-consultation'])
    await press(f.h,w.map)
    assert.equal(f.finishCount,1)
    assert.equal(f.saved.length,1,'preview must not submit another lesson')
    f.h.unmount()
  }
})
test('Days 2-13 show the real next lesson after saving; Day 14 shows completion, not Day 15',async()=>{
  for(const day of [2,13,14]){
    const f=fixture('en',day),w=words.en
    for(let i=0;i<OPORA_EXPERIENCE_PRE_SAVE_KEYS.length;i++)await press(f.h,w.next)
    await press(f.h,'I managed a little')
    await press(f.h,w.save)
    assert.equal(f.saved.length,1)
    assert.deepEqual(f.saved[0].visitedSlideKeys,[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
    await press(f.h,w.audio)
    await press(f.h,w.start)
    const rendered=textOf(f.h.tree)
    if(day===14){
      assert.match(rendered,new RegExp(w.finished))
      assert.doesNotMatch(rendered,/Day 15/)
    }else{
      assert.ok(rendered.includes(oporaExperienceDay(day+1,'en').title))
      assert.ok(rendered.includes(oporaExperienceDay(day+1,'en').practice))
    }
    await press(f.h,"I'm committed")
    assert.match(textOf(f.h.tree),day===14?/Your course is complete!/:/See you tomorrow!/)
    await press(f.h,w.map)
    assert.equal(f.finishCount,1)
    assert.equal(f.saved.length,1)
    f.h.unmount()
  }
})

test('declining the first lesson phone reminder keeps the lesson saved and still shows tomorrow', async () => {
  const f=fixture('en',1),w=words.en
  for(let i=0;i<9;i++)await press(f.h,w.next)
  await press(f.h,'I managed a little')
  await press(f.h,w.save)
  await press(f.h,w.audio)
  await press(f.h,w.start)
  await press(f.h,w.next)
  await press(f.h,w.next)
  await press(f.h,"I'm committed")
  assert.match(textOf(f.h.tree),/Keep OPORA close/)
  await press(f.h,w.later)
  assert.match(textOf(f.h.tree),/See you tomorrow!/)
  assert.equal(f.saved.length,1)
  await press(f.h,w.map)
  assert.equal(f.finishCount,1)
  f.h.unmount()
})
