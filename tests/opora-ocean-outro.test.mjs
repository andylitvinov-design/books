import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,textOf} from './helpers/route-pipeline-harness.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function fixture(locale='en',day=1){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000008888',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let writes=0,exits=0
  const h=mount('opora-experience-player',{locale,data,onClose(){exits++},
    onFinish(){exits++},onSession:async()=>{writes++;return true}})
  return {h,get writes(){return writes},get exits(){return exits}}
}
async function click(h,label){
  const button=findButton(h.tree,label)
  assert.ok(button,'Missing button '+label+' in '+textOf(h.tree).slice(0,400))
  button.props.onClick()
  await h.settle()
}

test('the ocean slide follows confirmed receipt, but neither it nor its audio are completion gates',async()=>{
  const f=fixture('en',1)
  for(let i=0;i<8;i++)await click(f.h,'Continue')
  await click(f.h,'Save my practice')
  assert.equal(f.writes,1)
  assert.match(textOf(f.h.tree),/Your moment is saved/)
  assert.ok(findButton(f.h.tree,'My course map'),'Receipt must retain direct exit to the map')
  assert.ok(findButton(f.h.tree,'Relax with waves'))
  assert.match(textOf(f.h.tree),/10\s*\/\s*11/)
  await click(f.h,'Relax with waves')
  assert.equal(f.writes,1,'Opening audio never performs another save')
  assert.match(textOf(f.h.tree),/One quiet minute/)
  assert.match(textOf(f.h.tree),/11\s*\/\s*11/)
  await click(f.h,'Back')
  assert.match(textOf(f.h.tree),/Your moment is saved/)
  await click(f.h,'My course map')
  assert.equal(f.exits,1)
  assert.equal(f.writes,1)
  f.h.unmount()
})

test('the receipt can skip the audio entirely for short lessons',async()=>{
  const f=fixture('en',2)
  for(let i=0;i<4;i++)await click(f.h,'Continue')
  await click(f.h,'Save my practice')
  assert.equal(f.writes,1)
  await click(f.h,'My course map')
  assert.equal(f.exits,1)
  assert.equal(f.writes,1)
  f.h.unmount()
})

test('the ocean slide remains localized and saves no extra practice response',async()=>{
  const labels=[
    ['ru','Продолжить','Сохранить мою практику','Послушать волны','Минута спокойствия','К карте курса'],
    ['es','Continuar','Guardar mi práctica','Escuchar las olas','Un minuto tranquilo','Mapa del curso'],
  ]
  for(const [locale,next,save,audio,title,map] of labels){
    const f=fixture(locale,2)
    for(let i=0;i<4;i++)await click(f.h,next)
    await click(f.h,save)
    await click(f.h,audio)
    assert.match(textOf(f.h.tree),new RegExp(title))
    assert.equal(f.writes,1)
    await click(f.h,map)
    assert.equal(f.exits,1)
    f.h.unmount()
  }
})

test('ocean playback requires a user click and pauses on hidden browser, safety pause and unmount',()=>{
  const audio=read('components/app/opora-ocean-outro.jsx')
  const player=read('components/app/opora-experience-player.jsx')
  const styles=read('components/app/opora-ocean-outro.module.css')
  assert.match(audio,/useOceanPracticeAudio/)
  assert.match(audio,/onClick=\{running\?pause:play\}/)
  assert.match(audio,/audio\.play\(\)/)
  assert.match(audio,/audio\.pause\(\)/)
  assert.match(audio,/visibilitychange/)
  assert.match(audio,/remaining===0/)
  assert.match(audio,/DURATION=60/)
  assert.doesNotMatch(audio,/<audio[^>]*autoplay|fetch\(|new Audio\(/i)
  assert.match(player,/outroOpen&&<OporaOceanOutro locale=\{lang\} paused=\{safety\}\/>/)
  assert.match(styles,/prefers-reduced-motion/)
  assert.match(styles,/max-height:680px/)
  for(const [path,source] of [
    ['components/app/opora-ocean-outro.jsx',audio],
    ['components/app/opora-experience-player.jsx',player]
  ]){
    const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],
      'JSX syntax must be valid: '+path)
  }
})
