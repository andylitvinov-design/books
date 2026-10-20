import test from 'node:test'
import assert from 'node:assert/strict'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {oporaExperienceDay} from '../lib/inner-growth/opora-as56-experience-guides.js'
import {OPORA_DAY_ONE_RESTORED_KEYS,OPORA_EXPERIENCE_EXTENDED_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

function fixture(locale,day){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000014001',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let exits=0
  const sessions=[]
  const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){exits++},
    onSession:async payload=>{sessions.push(structuredClone(payload));return true}})
  return {h,sessions,get exits(){return exits}}
}
async function press(h,label){
  const b=findButton(h.tree,label)
  assert.ok(b,'Missing '+label+' in '+textOf(h.tree).slice(0,350))
  b.props.onClick();await h.settle()
}
const labels={
  en:{next:'Continue',save:'Save my practice',receipt:'Saved to your course',
    audio:'Relax with waves',path:"See what's next",map:'My course map',later:'Not now',invite:'See you tomorrow!'},
  ru:{next:'Продолжить',save:'Сохранить мою практику',receipt:'Сохранено в вашем курсе',
    audio:'Послушать волны',path:'Посмотреть, что дальше',map:'К карте курса',later:'Не сейчас',invite:'Увидимся завтра!'},
}
function assertPath(h,locale,day){
  const map=nodes(h.tree).find(n=>n.props?.['data-opora-course-map']==='all-14-days')
  assert.ok(map,'A single navigable full-course roadmap is required')
  const cards=nodes(map).filter(n=>n.props?.['data-opora-journey-day']!==undefined)
  assert.equal(cards.length,14)
  for(let n=1;n<=14;n++){
    const card=cards.find(x=>x.props['data-opora-journey-day']===n)
    assert.ok(card)
    assert.ok(textOf(card).includes(oporaExperienceDay(n,locale).title))
    assert.equal(card.props['data-day-status'],n<=day?'completed':n===day+1?'next':'locked')
  }
}
test('Day 1 retains its optional setup and complete 14-day path after verified save',async()=>{
  for(const locale of ['en','ru']){
    const f=fixture(locale,1),w=labels[locale]
    for(let i=0;i<10;i++)await press(f.h,w.next)
    await press(f.h,locale==='ru'?'Получилось немного':'I managed a little')
    await press(f.h,w.save)
    assert.equal(f.sessions.length,1)
    assert.deepEqual(f.sessions[0].visitedSlideKeys,[...OPORA_DAY_ONE_RESTORED_KEYS])
    assert.ok(textOf(f.h.tree).includes(w.receipt))
    await press(f.h,w.audio);await press(f.h,w.path)
    assertPath(f.h,locale,1)
    await press(f.h,"I'm committed")
    assert.match(textOf(f.h.tree),/Keep OPORA close|ОПОРА всегда под рукой/)
    await press(f.h,w.later)
    assert.ok(textOf(f.h.tree).includes(w.invite))
    await press(f.h,w.map)
    assert.equal(f.exits,1)
    assert.equal(f.sessions.length,1)
    f.h.unmount()
  }
})
test('Days 2, 13 and 14 save 11 learning moments and display all 14 destinations',async()=>{
  for(const day of [2,13,14]){
    const f=fixture('en',day),w=labels.en
    for(let i=0;i<OPORA_EXPERIENCE_EXTENDED_KEYS.length;i++)await press(f.h,w.next)
    await press(f.h,'I managed a little')
    await press(f.h,w.save)
    assert.equal(f.sessions.length,1)
    assert.deepEqual(f.sessions[0].visitedSlideKeys,[...OPORA_EXPERIENCE_EXTENDED_KEYS])
    await press(f.h,w.audio);await press(f.h,w.path)
    assertPath(f.h,'en',day)
    if(day===14)assert.match(textOf(f.h.tree),/Your 14 days are complete/)
    await press(f.h,"I'm committed")
    assert.match(textOf(f.h.tree),day===14?/Your course is complete!/:/See you tomorrow!/)
    await press(f.h,w.map)
    assert.equal(f.exits,1)
    assert.equal(f.sessions.length,1,'Programme and links must never save twice')
    f.h.unmount()
  }
})
