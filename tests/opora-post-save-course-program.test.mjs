import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaAs60Day} from '../lib/inner-growth/opora-as60-experiential-practices.js'
import {OPORA_DAY_ONE_RESTORED_KEYS,OPORA_EXPERIENCE_PRE_SAVE_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'

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
  assert.equal(b.props.disabled,false)
  await b.props.onClick()
  await h.settle()
}
const words={
  en:{next:'Continue',save:'Save my practice',receipt:'Your moment is saved',
    start:"See what's next",map:'My course map',habit:'Keep OPORA close',
    configure:'Set it up',confidence:'I managed a little',week1:'Week 1: Find your supports',
    week2:'Week 2: Make it your own',finished:'Your 14 days are complete'},
  ru:{next:'Продолжить',save:'Сохранить мою практику',receipt:'Ваш момент сохранён',
    start:'Посмотреть, что дальше',map:'К карте курса',habit:'ОПОРА всегда под рукой',
    configure:'Настроить',confidence:'Получилось немного',week1:'Первая неделя: найти опору',
    week2:'Вторая неделя: свой опыт',finished:'Ваши 14 дней позади'},
}
async function saveAndOpenMap(f,locale){
  const w=words[locale]
  await advanceOporaTo(f.h,'recapFeedback',w.next)
  await press(f.h,w.confidence)
  assert.equal(f.saved.length,0)
  await press(f.h,w.save)
  assert.equal(f.saved.length,1)
  assert.ok(nodes(f.h.tree).some(node=>node.props?.['data-opora-lesson-outro']==='saved'),'Only a confirmed save opens the receipt')
  assert.ok(findButton(f.h.tree,w.start),'Receipt opens the course map directly')
  await press(f.h,w.start)
  const map=nodes(f.h.tree).find(n=>n.props?.['data-opora-course-map']==='all-14-days')
  assert.ok(map)
  assert.equal(nodes(map).filter(n=>n.props?.['data-opora-journey-day']!==undefined).length,14)
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
        assert.ok(textOf(map).includes(oporaAs60Day(day,locale).title))
      assert.equal(f.finishCount,0)
      await press(f.h,"I'm committed")
      assert.ok(textOf(f.h.tree).includes(w.habit))
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
    }finally{f.h.unmount()}
  }
})

test('Days 2, 13 and 14 keep day-specific previews and never invent a fifteenth day',async()=>{
  for(const day of [2,13,14]){
    const f=fixture('en',day),w=words.en
    try{
      const map=await saveAndOpenMap(f,'en')
      assert.deepEqual(f.saved[0].visitedSlideKeys,[...OPORA_EXPERIENCE_PRE_SAVE_KEYS])
      assert.ok(textOf(map).includes(oporaAs60Day(day,'en').title))
      if(day===14){
        assert.ok(textOf(map).includes(w.finished))
        assert.doesNotMatch(textOf(map),/Day 15/)
      }else{
        assert.ok(textOf(map).includes(oporaAs60Day(day+1,'en').title))
        assert.ok(textOf(map).includes(oporaAs60Day(day+1,'en').practice))
      }
      await press(f.h,"I'm committed")
      assert.ok(textOf(f.h.tree).includes(day===14?'Your course is complete!':'See you tomorrow!'))
      await press(f.h,w.map)
      assert.equal(f.finishCount,1)
      assert.equal(f.saved.length,1)
    }finally{f.h.unmount()}
  }
})
