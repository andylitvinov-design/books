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

test('new 14-day curriculum offers optional, localized imagery music on EVERY day',async()=>{
  assert.match(player,/cycle\.day===14&&!showIntegratedJourney&&scene==='recapFeedback'/)
  assert.match(player,/moment==='closingMeditation'/,'Historic edition keeps its Day 14 outro')
  assert.match(player,/channel==='imagery'&&<OporaOceanOutro locale=\{lang\} paused=\{safety\} compact\/>/)
  assert.doesNotMatch(style,/\.optionalMeditation/)
  assert.match(style,/\.closingMeditationBlock/)
  assert.match(outro,/const DURATION=120/)
  assert.match(outro,/visibilitychange/)
  assert.match(outro,/audio\.pause\(\)/)
  assert.match(outro,/await audio\.play\(\)/)
  assert.match(outro,/onClick=\{running\?pause:play\}/)
  for(const [locale,next,back] of [
    ['en','Continue','Go back'],['ru','Продолжить','Вернуться'],['es','Continuar','Volver']]){
    for(const day of [1,7,14]){
      const f=fixture(locale,day),h=f.h
      try{
        await advanceOporaTo(h,'imageryMeditation',next)
        assert.equal(sound(h).length,1,'Daily guided imagery includes music, day '+day)
        assert.equal(sound(h)[0].props.paused,false)
        await click(h,locale==='es'?'Pausa':locale==='ru'?'Пауза':'Pause')
        assert.equal(sound(h)[0].props.paused,true,'Stop must pause soundtrack')
        await click(h,back)
        assert.equal(sound(h)[0].props.paused,false)
        await click(h,next)
        assert.equal(sound(h).length,0,'Music unmounts outside the imagery screen')
        await advanceOporaTo(h,'practice',next)
        assert.equal(sound(h).length,0,'Three-step physical exercise has no competing soundtrack')
        assert.equal(f.writes,0,'Listening never marks a session completed')
      }finally{h.unmount()}
    }
  }
})

test('day 4 practice has no expandable panels and still saves exactly once',async()=>{
  const f=fixture('en',4),h=f.h
  try{
    await advanceOporaTo(h,'practice','Continue')
    assert.equal(sound(h).length,0)
    assert.equal(nodes(h.tree).filter(n=>n.type==='details').length,0)
    assert.ok(nodes(h.tree).some(n=>n.props?.['data-gentle-guidance']==='practice'), 'Accessible hint control remains available')
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
