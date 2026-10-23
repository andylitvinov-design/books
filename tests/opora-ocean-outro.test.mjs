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

test('day 14 closing meditation is exposed without a dropdown on EN/RU/ES',async()=>{
  for(const [locale,next,save,confidence,pattern] of [
    ['en','Continue','Save my practice','I managed a little',/Sit comfortably and notice the chair/],
    ['ru','Продолжить','Сохранить мою практику','Получилось немного',/Сядьте удобно и почувствуйте опору/],
    ['es','Continuar','Guardar mi práctica','Pude hacerlo un poco',/Siéntate cómodamente y siente el apoyo/]]){
    const f=fixture(locale,14),h=f.h
    try{
      await advanceOporaTo(h,'closingMeditation',next)
      assert.match(textOf(h.tree),pattern)
      assert.equal(sound(h).length,1)
      const panel=nodes(h.tree).find(n=>n.props?.['data-opora-final-meditation']==='day-14')
      assert.ok(panel)
      assert.equal(nodes(panel).filter(n=>n.type==='details'||n.type==='summary').length,0)
      await click(h,next)
      assert.equal(sound(h).length,0)
      assert.equal(screen(h).props['data-opora-current-screen'],'recapFeedback')
      await click(h,confidence)
      await click(h,save)
      assert.equal(f.writes,1)
      assert.equal(sound(h).length,0,'No repeated audio after save')
    }finally{h.unmount()}
  }
})
test('ordinary days never show the timer but preserve their saved receipt',async()=>{
  for(const day of [1,3,4,13]){
    const f=fixture('en',day),h=f.h
    try{
      await advanceOporaTo(h,'practice','Continue')
      assert.equal(sound(h).length,0)
      await advanceOporaTo(h,'recapFeedback','Continue')
      assert.equal(sound(h).length,0)
      await click(h,'I only explored them today')
      await click(h,'Save my practice')
      assert.equal(f.writes,1)
      assert.match(textOf(h.tree),/Congratulations/)
    }finally{h.unmount()}
  }
})
test('audio honors pause, elapsed seconds, foreground safety and never starts automatically',()=>{
  assert.match(outro,/useOceanPracticeAudio/)
  assert.match(outro,/Date\.now\(\)/)
  assert.match(outro,/window\.setInterval\(tick,250\)/)
  assert.match(outro,/remaining===0/)
  assert.match(outro,/audio\.pause\(\)/)
  assert.match(outro,/visibilitychange/)
  assert.match(outro,/data-opora-inline-audio=\{compact\?'true':undefined\}/)
  assert.match(player,/<OporaOceanOutro locale=\{lang\} paused=\{safety\} compact\/>/)
  assert.doesNotMatch(player,/outroOpen|moment==='ocean'/)
  const parsed=ts.createSourceFile('opora-experience-player.jsx',player,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.deepEqual(parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[])
})
