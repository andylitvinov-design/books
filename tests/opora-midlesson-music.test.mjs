import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,textOf,nodes} from './helpers/route-pipeline-harness.mjs'

const player=readFileSync(new URL('../components/app/opora-experience-player.jsx',import.meta.url),'utf8')
const style=readFileSync(new URL('../components/app/opora-experience-player.module.css',import.meta.url),'utf8')

test('guided meditation stays inside lesson practice, not an extra save/visit requirement',()=>{
  assert.match(player,/moment==='practice'&&<>/)
  assert.match(player,/data-opora-mid-lesson-music="true"/)
  assert.match(player,/moment==='musicPause'&&<>/)
  assert.match(player,/data-opora-guided-meditation="true"/)
  assert.match(player,/midPauseSteps\.map/)
  assert.doesNotMatch(player,/outroOpen|t\.audioNext/)
  for(const phrase of ['почувствуйте опору стула','notice the chair or floor','nota el apoyo de la silla']){
    assert.ok(player.includes(phrase),'Missing clear meditation instruction: '+phrase)
  }
  assert.match(player,/<OporaOceanOutro locale=\{lang\} paused=\{safety\}\/>/)
  assert.match(player,/setMidPauseOpen\(false\)/)
  assert.match(player,/midPauseOpen\?'musicPause'/)
  assert.match(player,/visitedSlideKeys:\[\.\.\.scenes\]/)
  assert.match(style,/\.midPauseButton[\s\S]*min-height:50px/)
  assert.match(style,/\.midPauseButton:focus-visible/)
  for(const label of ['Медитация «Опора» · 2 минуты','2-minute grounding meditation','Meditación de apoyo · 2 minutos']){
    assert.ok(player.includes(label),'Missing EN/RU/ES optional interlude text: '+label)
  }
  const parsed=ts.createSourceFile('components/app/opora-experience-player.jsx',player,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.deepEqual(parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[])
})

test('day 2 may enter/leave the guided meditation before saving, with no added write',async()=>{
  const day=2,locale='en'
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  let writes=0
  const data={cycle:{id:'00000000-0000-4000-8000-000000009999',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
    onSession:async()=>{writes++;return true}})
  const click=async label=>{const b=findButton(h.tree,label) || nodes(h.tree).find(n =>
    n.type === 'button' && n.props?.['data-opora-mid-lesson-music'] === 'true' && textOf(n).includes(label))
    assert.ok(b,'Missing '+label+' in '+textOf(h.tree).slice(0,350))
    b.props.onClick()
    await h.settle()}
  try{
    await click('Continue') // supportive second slide
    await click('Continue') // enter the daily practice
    await click('2-minute grounding meditation')
    assert.match(textOf(h.tree),/2-minute grounding meditation/)
    assert.match(textOf(h.tree),/Sit comfortably and notice the chair or floor/)
    assert.match(textOf(h.tree),/At the end, look around/)
    assert.equal(writes,0)
    await click('Back')
    assert.ok(nodes(h.tree).some(n => n.type === 'button' && n.props?.['data-opora-mid-lesson-music'] === 'true'))
    assert.equal(writes,0)
    await click('2-minute grounding meditation')
    await click('Continue lesson')
    assert.equal(writes,0,'Leaving optional music does not invent a saved practice')
  }finally{h.unmount()}
})
