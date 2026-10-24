import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,nodes,textOf} from './helpers/route-pipeline-harness.mjs'
import {advanceOporaTo} from './helpers/opora-gentle-navigation.mjs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const player=read('components/app/opora-experience-player.jsx')
const outro=read('components/app/opora-ocean-outro.jsx')
const style=read('components/app/opora-experience-player.module.css')
function fixture(locale,day){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  let writes=0
  const h=mount('opora-experience-player',{locale,data:{
    cycle:{id:'00000000-0000-4000-8000-000000009999',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null},
    onClose(){},onFinish(){},onSession:async()=>{writes++;return true}})
  return {h,get writes(){return writes}}
}
const sound=h=>nodes(h.tree).filter(n=>n.type?.testName==='OporaOceanOutro'&&n.props?.compact)
const screen=h=>nodes(h.tree).find(n=>n.props?.['data-opora-current-screen'])
async function click(h,label){
  const b=findButton(h.tree,label)
  assert.ok(b,'Missing '+label+' at '+textOf(h.tree).slice(0,200))
  b.props.onClick();await h.settle()
}

test('meditation is day 14 only, always visible and fully localized',async()=>{
  assert.match(player,/cycle\.day===14&&scene==='recapFeedback'/)
  assert.match(player,/moment==='closingMeditation'/)
  assert.doesNotMatch(player,/data-opora-inline-practice-audio=/)
  assert.doesNotMatch(style,/\.optionalMeditation/)
  assert.match(style,/\.closingMeditationBlock/)
  assert.match(outro,/const DURATION=120/)
  assert.match(outro,/visibilitychange/)
  assert.match(outro,/audio\.pause\(\)/)
  assert.match(outro,/await audio\.play\(\)/)
  assert.match(outro,/onClick=\{running\?pause:play\}/)
  for(const phrase of ['почувствуйте опору стула','notice the chair or floor supporting you','siente el apoyo de la silla'])
    assert.ok(player.includes(phrase))
  for(const [locale,next,back] of [
    ['en','Continue','Go back'],['ru','Продолжить','Вернуться'],['es','Continuar','Volver']]){
    const f=fixture(locale,14),h=f.h
    try{
      await advanceOporaTo(h,'practice',next)
      assert.equal(sound(h).length,0,'No timer at the start of daily practice')
      await advanceOporaTo(h,'closingMeditation',next)
      const closing=nodes(h.tree).find(n=>n.props?.['data-opora-final-meditation']==='day-14')
      assert.ok(closing)
      assert.equal(nodes(closing).filter(n=>n.type==='details'||n.type==='summary').length,0)
      assert.ok(nodes(closing).some(n=>n.props?.['data-opora-guided-meditation']==='true'))
      assert.equal(sound(h).length,1)
      assert.equal(sound(h)[0].props.paused,false)
      await click(h,locale==='es'?'Pausa':locale==='ru'?'Пауза':'Pause')
      assert.equal(sound(h)[0].props.paused,true)
      await click(h,back)
      assert.equal(sound(h)[0].props.paused,false)
      await click(h,next)
      assert.equal(sound(h).length,0,'Timer unmounts before final feedback')
      assert.equal(f.writes,0,'Optional audio never fabricates session completion')
    }finally{h.unmount()}
  }
})

test('day 4 practice has no expandable panels and still saves exactly once',async()=>{
  const f=fixture('en',4),h=f.h
  try{
    await advanceOporaTo(h,'practice','Continue')
    assert.equal(sound(h).length,0)
    assert.equal(nodes(h.tree).filter(n=>n.type==='details').length,0)
    const help=findButton(h.tree,'Show gentle guidance')
    assert.ok(help,'Guidance remains available as an explicit optional choice')
    assert.equal(help.props['aria-expanded'],false)
    assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-optional-guidance']==='true').length,0)
    await click(h,'Show gentle guidance')
    assert.equal(findButton(h.tree,'Show gentle guidance').props['aria-expanded'],true)
    assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-optional-guidance']==='true').length,1)
    assert.equal(f.writes,0,'Opening guidance is never a save')
    await click(h,'Show gentle guidance')
    assert.equal(findButton(h.tree,'Show gentle guidance').props['aria-expanded'],false)
    assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-optional-guidance']==='true').length,0)
    await click(h,'I tried a little')
    await advanceOporaTo(h,'recapFeedback','Continue')
    assert.equal(sound(h).length,0)
    assert.equal(f.writes,0)
    await click(h,'I managed a little')
    await click(h,'Save my practice')
    assert.equal(f.writes,1)
  }finally{h.unmount()}
})

test('visible audio widget keeps its click-to-play, 120s and iPhone controls',()=>{
  const css=read('components/app/opora-ocean-outro.module.css')
  for(const label of ['Включить на 2 минуты','Start 2 minutes','Escuchar 2 minutos'])assert.ok(outro.includes(label))
  assert.match(outro,/data-opora-inline-audio=\{compact\?'true':undefined\}/)
  assert.match(css,/@media\(max-width:345px\)/)
  assert.match(css,/prefers-reduced-motion/)
  assert.doesNotMatch(outro,/<audio[^>]*autoplay|fetch\(|new Audio\(/i)
  for(const [path,content] of [['opora-experience-player.jsx',player],['opora-ocean-outro.jsx',outro]]){
    const parsed=ts.createSourceFile(path,content,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[])
  }
})
