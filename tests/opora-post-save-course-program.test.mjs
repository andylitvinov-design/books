import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaAs59Day} from '../lib/inner-growth/opora-as59-seven-skills.js'
import {OPORA_DAY_ONE_RESTORED_KEYS,OPORA_EXPERIENCE_PRE_SAVE_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {oporaEndingCopy} from '../lib/inner-growth/opora-lesson-outro.js'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

function fixture(locale,day){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000014001',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let finishCount=0
  const saved=[],original=structuredClone(data)
  const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){finishCount++},
    onSession:async payload=>{saved.push(structuredClone(payload));return true}})
  return {h,saved,day,data,original,get finishCount(){return finishCount}}
}
async function press(h,label){
  const b=findButton(h.tree,label)
  assert.ok(b,'Missing '+label+' in '+textOf(h.tree).slice(0,300))
  assert.equal(b.props.disabled,false)
  await b.props.onClick()
  await h.settle()
}
const words={
  en:{next:'Continue',save:'Save my practice',
    start:"See what's next",map:'My course map',habit:'Keep OPORA close',
    back:'Back',skip:'Not now',configure:'Set it up',confidence:'I managed a little',week1:'Week 1: Find your supports',
    week2:'Week 2: Make it your own',finished:'Your 14 days are complete'},
  ru:{next:'Продолжить',save:'Сохранить мою практику',
    start:'Посмотреть, что дальше',map:'К карте курса',habit:'ОПОРА всегда под рукой',
    back:'Назад',skip:'Не сейчас',configure:'Настроить',confidence:'Получилось немного',week1:'Первая неделя: найти опору',
    week2:'Вторая неделя: свой опыт',finished:'Ваши 14 дней позади'},
}
async function saveAndOpenMap(f,locale){
  const w=words[locale]
  await advanceOporaTo(f.h,'recapFeedback',w.next)
  await press(f.h,w.confidence)
  assert.equal(f.saved.length,0)
  assert.ok(!nodes(f.h.tree).some(n=>n.props?.['data-opora-lesson-outro']==='saved'||
    n.props?.['data-opora-course-map']||n.props?.['data-opora-first-lesson-habit-setup']))
  await press(f.h,w.save)
  assert.equal(f.saved.length,1)
  const receipt=nodes(f.h.tree).find(n=>n.props?.['data-opora-current-screen']==='receipt')
  assert.ok(receipt,'Only a confirmed save opens the receipt')
  assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-lesson-outro']==='saved'))
  const ending=oporaEndingCopy(locale)
  assert.equal(textOf(nodes(receipt).find(n=>n.type==='h2')),
    f.day===14?ending.congratsFinal:ending.congratsTitle.replace('{day}',String(f.day)))
  assert.ok(findButton(f.h.tree,w.start),'Receipt opens the course map directly')
  await press(f.h,w.start)
  const map=nodes(f.h.tree).find(n=>n.props?.['data-opora-course-map']==='all-14-days')
  assert.ok(map)
  const cards=nodes(map).filter(n=>n.props?.['data-opora-journey-day']!==undefined)
  assert.deepEqual(cards.map(n=>n.props['data-opora-journey-day']),
    Array.from({length:14},(_,index)=>index+1),'Each scheduled day appears exactly once, in order')
  for(const card of cards){
    const day=card.props['data-opora-journey-day'],copy=oporaAs59Day(day,locale)
    assert.ok(textOf(card).includes(copy.title),'Day '+day+' uses its own title')
    assert.ok(textOf(card).includes(copy.practice),'Day '+day+' uses its own practice')
    assert.equal(card.props['data-day-status'],day<=f.day?'completed':day===f.day+1?'next':'locked')
    assert.equal(nodes(card).filter(n=>n.type==='details').length,1,'Day previews remain read-only disclosures')
    assert.equal(nodes(card).filter(n=>['button','a','input'].includes(n.type)).length,0,
      'Previewing a future day cannot start it or bypass its schedule')
  }
  const progress=nodes(map).find(n=>n.type==='progress')
  assert.ok(progress)
  assert.equal(progress.props.max,14)
  assert.equal(progress.props.value,f.day)
  assert.equal(f.saved.length,1)
  assert.equal(f.finishCount,0)
  assert.deepEqual(f.data,f.original)
  assert.ok(textOf(map).includes(w.week1))
  assert.ok(textOf(map).includes(w.week2))
  return map
}

test('Day 1 save shows all fourteen lessons, optional home-screen setup and next-day choices',async()=>{
  for(const locale of ['en','ru']){
    const f=fixture(locale,1),w=words[locale]
    try{
      const map=await saveAndOpenMap(f,locale)
      assert.deepEqual(f.saved[0].visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
      for(let day=1;day<=14;day++)
        assert.ok(textOf(map).includes(oporaAs59Day(day,locale).title))
      assert.equal(f.finishCount,0)
      await press(f.h,"I'm committed")
      assert.ok(textOf(f.h.tree).includes(w.habit))
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-invitation']))
      assert.ok(!nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-setup']),
        'Committing to tomorrow is not permission to configure a device')
      assert.ok(findButton(f.h.tree,w.configure),'Phone opt-in must be deliberate')
      await press(f.h,w.configure)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-setup']))
      await press(f.h,w.next)
      assert.ok(textOf(f.h.tree).includes(locale==='ru'?'Увидимся завтра!':'See you tomorrow!'))
      assert.deepEqual(nodes(f.h.tree).filter(node=>node.type==='a').map(node=>node.props.href),[
        '/'+locale+'/tests','/'+locale+'/academy/principles-of-energywork/learn',
        '/'+locale+'/services/free-consultation'])
      await press(f.h,w.map)
      assert.equal(f.finishCount,1)
      assert.equal(f.saved.length,1,'Preview or ending cannot save again')
      assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  }
})

test('Days 2, 13 and 14 keep day-specific previews and never invent a fifteenth day',async()=>{
  for(const locale of ['en','ru'])for(const day of [2,13,14]){
    const f=fixture(locale,day),w=words[locale]
    try{
      const map=await saveAndOpenMap(f,locale)
      assert.deepEqual(f.saved[0].visitedSlideKeys,[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
      assert.ok(textOf(map).includes(oporaAs59Day(day,locale).title))
      if(day===14){
        assert.ok(textOf(map).includes(w.finished))
        assert.doesNotMatch(textOf(map),/Day 15|День 15/)
      }else{
        assert.ok(textOf(map).includes(oporaAs59Day(day+1,locale).title))
        assert.ok(textOf(map).includes(oporaAs59Day(day+1,locale).practice))
      }
      await press(f.h,"I'm committed")
      const ending=oporaEndingCopy(locale)
      assert.ok(textOf(f.h.tree).includes(day===14?ending.inviteFinal:ending.inviteTitle))
      assert.ok(!nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-invitation']||
        n.props?.['data-opora-first-lesson-habit-setup']),'Device setup is not repeated after Day 1')
      await press(f.h,w.map)
      assert.equal(f.finishCount,1)
      assert.equal(f.saved.length,1)
    }finally{f.h.unmount()}
  }
})


test('Day 1 habit setup is optional and backtracking the saved ending never resaves',async()=>{
  for(const locale of ['en','ru']){
    const f=fixture(locale,1),w=words[locale]
    try{
      await saveAndOpenMap(f,locale)
      await press(f.h,oporaEndingCopy(locale).commit)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-invitation']))
      assert.ok(!nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-setup']))
      await press(f.h,w.skip)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-tomorrow-links']==='true'))
      assert.ok(!nodes(f.h.tree).some(n=>n.props?.['data-opora-first-lesson-habit-setup']))
      assert.equal(f.finishCount,0,'Declining setup still offers the ending before closing')
      await press(f.h,w.back) // Invitation -> optional setup choice, still not configured.
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-habit-skip']))
      await press(f.h,w.back) // Habit invitation -> read-only map.
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-course-map']==='all-14-days'))
      await press(f.h,w.back) // Map -> confirmed receipt.
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='receipt'))
      await press(f.h,w.back) // Receipt -> recap, with no second save action.
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='recapFeedback'))
      assert.equal(findButton(f.h.tree,w.save),undefined)
      await press(f.h,w.next)
      assert.ok(nodes(f.h.tree).some(n=>n.props?.['data-opora-current-screen']==='receipt'))
      await press(f.h,w.start)
      await press(f.h,oporaEndingCopy(locale).commit)
      await press(f.h,w.skip)
      await press(f.h,w.map)
      assert.equal(f.finishCount,1)
      assert.equal(f.saved.length,1,'Neither declining setup nor revisiting saved screens writes again')
      assert.deepEqual(f.data,f.original)
    }finally{f.h.unmount()}
  }
})
