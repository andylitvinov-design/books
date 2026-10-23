import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,nodes} from './helpers/route-pipeline-harness.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const player=read('components/app/opora-experience-player.jsx')
const audio=read('components/app/opora-ocean-outro.jsx')
const playerStyle=read('components/app/opora-experience-player.module.css')
const audioStyle=read('components/app/opora-ocean-outro.module.css')

test('OPORA practice has a 2-minute Play/Pause ocean player inline on the feedback slide',()=>{
  assert.match(player,/moment==='practice'&&<>/)
  assert.match(player,/data-opora-inline-practice-audio="true"/)
  assert.match(player,/data-opora-guided-meditation="true"/)
  assert.match(player,/meditationSteps\.map/)
  assert.doesNotMatch(player,/outroOpen|moment==='ocean'/)
  for(const phrase of ['почувствуйте опору стула','notice the chair or floor supporting you','siente el apoyo de la silla']) {
    assert.ok(player.includes(phrase),'Concrete grounding steps missing: '+phrase)
  }
  assert.match(player,/<OporaOceanOutro locale=\{lang\} paused=\{safety\} compact\/>/)
  assert.doesNotMatch(player,/data-opora-mid-lesson-music|midPauseOpen|moment==='musicPause'/)
  assert.match(player,/visitedSlideKeys:\[\.\.\.scenes\]/)
  assert.match(audio,/const DURATION=120/)
  assert.match(audio,/data-opora-inline-audio=\{compact\?'true':undefined\}/)
  assert.match(audio,/onClick=\{running\?pause:play\}/)
  assert.match(audio,/await audio\.play\(\)/)
  assert.match(audio,/visibilitychange/)
  assert.match(audio,/audio\.pause\(\)/)
  assert.match(audioStyle,/\.outro\.compact/)
  assert.match(audioStyle,/@media\(max-width:345px\)/)
  assert.match(playerStyle,/\.inlinePracticeAudio/)
  for(const label of ['Включить на 2 минуты','Start 2 minutes','Escuchar 2 minutos']){
    assert.ok(audio.includes(label),'Missing EN/RU/ES Play label: '+label)
  }
  for(const [path,source] of [
    ['components/app/opora-experience-player.jsx',player],
    ['components/app/opora-ocean-outro.jsx',audio],
  ]){
    const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(parsed.parseDiagnostics.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')),[])
  }
})

test('day 2 keeps audio on the same slide and never creates a new step or save',async()=>{
  const locale='en',day=2
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  let writes=0
  const data={cycle:{id:'00000000-0000-4000-8000-000000009999',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},
    onSession:async()=>{writes++;return true}})
  const click=async label=>{
    const button=findButton(h.tree,label)
    assert.ok(button,'Missing '+label)
    button.props.onClick()
    await h.settle()
  }
  const inlinePlayers=()=>nodes(h.tree).filter(n=>n.type?.testName==='OporaOceanOutro'&&n.props?.compact)
  try{
    await click('Continue')
    await click('Continue')
    assert.equal(inlinePlayers().length,1,'Exactly one inline player')
    assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-guided-meditation']==='true'),
      'The player must explain the three meditation steps before asking for feedback')
    assert.equal(inlinePlayers()[0].props.locale,'en')
    assert.equal(inlinePlayers()[0].props.paused,false)
    assert.equal(writes,0)
    await click('I tried a little')
    assert.equal(inlinePlayers().length,1,'Feedback must not replace audio')
    await click('Pause')
    assert.equal(inlinePlayers()[0].props.paused,true,'Safety sheet suspends audio')
    await click('Go back')
    assert.equal(inlinePlayers()[0].props.paused,false)
    await click('Continue')
    assert.equal(inlinePlayers().length,0,'Changing slide unmounts the player')
    assert.equal(writes,0,'Optional audio never fabricates completion')
  }finally{h.unmount()}
})

test('EN/RU/ES practice screens show one player and optional Continue',async()=>{
  for(const [locale,next] of [['en','Continue'],['ru','Продолжить'],['es','Continuar']]){
    const day=3
    const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
    const data={cycle:{id:'00000000-0000-4000-8000-000000008881',day,durationDays:14},
      programme:{id:'stress'},lesson,currentSession:null}
    const h=mount('opora-experience-player',{locale,data,onClose(){},onFinish(){},onSession:async()=>true})
    try{
      for(let i=0;i<2;i++){
        const button=findButton(h.tree,next)
        assert.ok(button,'Missing '+next+' for '+locale)
        button.props.onClick()
        await h.settle()
      }
      const matches=nodes(h.tree).filter(n=>n.type?.testName==='OporaOceanOutro'&&n.props?.compact)
      assert.equal(matches.length,1,'One inline player for '+locale)
      assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-guided-meditation']==='true'),
        'Localized meditation steps must be visible before congratulations')
      assert.equal(matches[0].props.locale,locale)
      assert.ok(findButton(h.tree,next),'Continue must remain available without audio')
    }finally{h.unmount()}
  }
})
