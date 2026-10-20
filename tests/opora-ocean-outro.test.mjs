import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {OPORA_DAY_ONE_RESTORED_KEYS,OPORA_EXPERIENCE_PRE_SAVE_KEYS} from '../lib/inner-growth/course-slide-sequence.js'
import {oporaEndingCopy} from '../lib/inner-growth/opora-lesson-outro.js'
import {mount,findButton,findPart,nodes,textOf} from './helpers/route-pipeline-harness.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

function fixture(locale='en',day=1){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000008888',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let writes=0,exits=0
  const payloads=[]
  const h=mount('opora-experience-player',{locale,data,onClose(){exits++},
    onFinish(){exits++},onSession:async payload=>{writes++;payloads.push(structuredClone(payload));return true}})
  return {h,payloads,get writes(){return writes},get exits(){return exits}}
}
async function click(h,label){
  const button=findButton(h.tree,label)
  assert.ok(button,'Missing button '+label+' in '+textOf(h.tree).slice(0,400))
  assert.ok(!button.props.disabled,'Button must be enabled: '+label)
  button.props.onClick()
  await h.settle()
}

async function saveFromRecap(f,locale,day,next,save){
  const scenes=day===1?OPORA_DAY_ONE_RESTORED_KEYS:OPORA_EXPERIENCE_PRE_SAVE_KEYS
  const copy=oporaEndingCopy(locale)
  for(let i=0;i<scenes.length;i++)await click(f.h,next)
  assert.equal(f.writes,0,'Teaching screens never save')
  assert.equal(findPart(f.h.tree,'OporaOceanOutro'),undefined,'Audio is unavailable before persistence')
  assert.equal(textOf(nodes(f.h.tree).find(node=>node.type==='h2')),copy.recapTitle)
  await click(f.h,save)
  assert.equal(f.writes,0,'Missing recap selection must not save')
  assert.ok(nodes(f.h.tree).some(node=>node.props?.role==='alert'&&textOf(node)===copy.required))
  await click(f.h,copy.choices.find(([value])=>value==='explored')[1])
  await click(f.h,save)
  assert.equal(f.writes,1)
  assert.deepEqual(f.payloads[0].visitedSlideKeys,[...scenes])
  assert.deepEqual(f.payloads[0].opora54.answers,{lessonConfidence:'explored'})
  assert.equal(f.payloads[0].practiceAttempt,null,'Recap reflection must not invent practice')
  assert.equal(textOf(nodes(f.h.tree).find(node=>node.type==='h2')),
    day===14?copy.congratsFinal:copy.congratsTitle.replace('{day}',String(day)))
  assert.equal(findButton(f.h.tree,save),undefined)
  assert.equal(findPart(f.h.tree,'OporaOceanOutro'),undefined,'Receipt does not start optional audio')
}

test('the ocean slide follows confirmed receipt, but neither it nor its audio are completion gates',async()=>{
  const f=fixture('en',1)
  await saveFromRecap(f,'en',1,'Continue','Save my practice')
  assert.equal(f.writes,1)
  assert.match(textOf(f.h.tree),/Congratulations! Lesson 1 complete!/)
  assert.ok(findButton(f.h.tree,'My course map'),'Receipt must retain direct exit to the map')
  assert.ok(findButton(f.h.tree,'Relax with waves'),'The primary next step opens optional relaxation')
  assert.match(textOf(f.h.tree),/11\s*\/\s*17/)
  await click(f.h,'Relax with waves')
  assert.equal(f.writes,1,'Opening audio never performs another save')
  assert.match(textOf(f.h.tree),/Two quiet minutes/)
  assert.equal(findPart(f.h.tree,'OporaOceanOutro')?.props.locale,'en')
  assert.match(textOf(f.h.tree),/12\s*\/\s*17/)
  await click(f.h,'Back')
  assert.match(textOf(f.h.tree),/Congratulations! Lesson 1 complete!/)
  await click(f.h,'My course map')
  assert.equal(f.exits,1)
  assert.equal(f.writes,1)
  f.h.unmount()
})

test('the receipt can skip the audio entirely for short lessons',async()=>{
  const f=fixture('en',2)
  await saveFromRecap(f,'en',2,'Continue','Save my practice')
  assert.equal(f.writes,1)
  await click(f.h,'My course map')
  assert.equal(f.exits,1)
  assert.equal(f.writes,1)
  f.h.unmount()
})

test('the ocean slide remains localized and saves no extra practice response',async()=>{
  const labels=[
    ['ru','Продолжить','Сохранить мою практику','Послушать волны','Две минуты спокойствия','К карте курса'],
    ['es','Continuar','Guardar mi práctica','Escuchar las olas','Dos minutos de calma','Mapa del curso'],
  ]
  for(const [locale,next,save,audio,title,map] of labels){
    const f=fixture(locale,2)
    await saveFromRecap(f,locale,2,next,save)
    const saved=structuredClone(f.payloads[0])
    await click(f.h,audio)
    assert.match(textOf(f.h.tree),new RegExp(title))
    assert.equal(findPart(f.h.tree,'OporaOceanOutro')?.props.locale,locale)
    assert.match(textOf(f.h.tree),/8\s*\/\s*10/)
    assert.equal(f.writes,1)
    await click(f.h,map)
    assert.equal(f.exits,1)
    assert.deepEqual(f.payloads,[saved],'Optional ocean and exit leave the one saved response unchanged')
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
  assert.match(audio,/Date\.now\(\)/)
  assert.match(audio,/window\.setInterval\(tick,250\)/)
  assert.match(audio,/remaining===0/)
  assert.match(audio,/DURATION=120/)
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
