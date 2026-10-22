import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,textOf,nodes} from './helpers/route-pipeline-harness.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const languages={
  en:{next:'Continue',save:'Save my practice',confidence:'I managed a little',map:"See what's next",
    instruction:/Sit comfortably and notice the chair or floor supporting you/,
    finish:/Congratulations/},
  ru:{next:'Продолжить',save:'Сохранить мою практику',confidence:'Получилось немного',
    map:'Посмотреть, что дальше',instruction:/Сядьте удобно и почувствуйте опору/,
    finish:/Поздравляем/},
  es:{next:'Continuar',save:'Guardar mi práctica',confidence:'Pude hacerlo un poco',
    map:'Ver qué viene después',instruction:/Siéntate cómodamente y siente el apoyo/,
    finish:/Enhorabuena/}
}
function fixture(locale='en',day=3){
  const lesson=lessonFor('calm_regulation',day,locale,'standard',COURSE_ANTISTRESS_SKILLS_V7)
  const data={cycle:{id:'00000000-0000-4000-8000-000000008888',day,durationDays:14},
    programme:{id:'stress'},lesson,currentSession:null}
  let writes=0,exits=0
  const h=mount('opora-experience-player',{locale,data,onClose(){exits++},onFinish(){exits++},
    onSession:async()=>{writes++;return true}})
  return {h,get writes(){return writes},get exits(){return exits}}
}
async function click(h,label){
  const control=findButton(h.tree,label)
  assert.ok(control,'Missing '+label+' on '+textOf(h.tree).slice(0,400))
  control.props.onClick()
  await h.settle()
}
const playerNode=tree=>nodes(tree).find(n=>n.type?.testName==='OporaOceanOutro'&&n.props?.compact)
const meditationNode=tree=>nodes(tree).find(n=>n.props?.['data-opora-guided-meditation']==='true')
async function practice(f,locale){
  const d=languages[locale]
  await click(f.h,d.next)
  await click(f.h,d.next)
}
async function finish(f,locale){
  const d=languages[locale],h=f.h
  for(let i=0;i<12&&!findButton(h.tree,d.save);i++)await click(h,d.next)
  assert.ok(findButton(h.tree,d.save),'Recap required before saving')
  await click(h,d.confidence)
  await click(h,d.save)
  assert.equal(f.writes,1)
}
test('inline guided two-minute meditation is a part of day 3 practice, not a new slide',async()=>{
  const f=fixture(),h=f.h
  await practice(f,'en')
  assert.match(textOf(h.tree),languages.en.instruction)
  assert.match(textOf(h.tree),/Start the timer: with waves or in silence/)
  assert.match(textOf(h.tree),/After two minutes, look around/)
  assert.ok(meditationNode(h.tree),'Visible three-step instructions before the player')
  assert.ok(playerNode(h.tree),'Existing compact player in the same practice slide')
  assert.equal(playerNode(h.tree).props.paused,false)
  assert.match(textOf(h.tree),/2-minute grounding meditation/)
  assert.equal(f.writes,0,'The timer is optional and cannot fabricate a saved attempt')
  await click(h,'Continue')
  assert.ok(!playerNode(h.tree),'Audio unmounts on next lesson step')
  await finish(f,'en')
  assert.match(textOf(h.tree),languages.en.finish)
  assert.ok(!playerNode(h.tree),'No audio stage after congratulations')
  assert.ok(!meditationNode(h.tree),'No repeated practice after congratulations')
  await click(h,languages.en.map)
  assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-course-map']==='all-14-days'))
  assert.equal(f.writes,1)
  h.unmount()
})
test('EN/RU/ES all have actionable meditation steps and direct map after saved reward',async()=>{
  for(const lang of ['en','ru','es']){
    const f=fixture(lang),h=f.h,d=languages[lang]
    await practice(f,lang)
    assert.match(textOf(h.tree),d.instruction)
    assert.ok(meditationNode(h.tree))
    assert.ok(playerNode(h.tree))
    await finish(f,lang)
    assert.match(textOf(h.tree),d.finish)
    assert.ok(!playerNode(h.tree))
    await click(h,d.map)
    assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-course-map']==='all-14-days'))
    assert.equal(f.writes,1)
    h.unmount()
  }
})
test('saved day 2 receipt bypasses optional ocean and keeps direct map navigation',async()=>{
  const f=fixture('en',2),h=f.h
  await finish(f,'en')
  assert.match(textOf(h.tree),/Congratulations! Lesson 2 complete!/)
  assert.ok(findButton(h.tree,"See what's next"))
  assert.ok(!findButton(h.tree,'Relax with waves'))
  assert.ok(!playerNode(h.tree))
  await click(h,"See what's next")
  assert.match(textOf(h.tree),/Your complete 14-day journey/)
  assert.equal(f.writes,1)
  h.unmount()
})
test('existing 120-second click-to-play ocean sound remains pausable, silent-capable and non-autoplay',()=>{
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
  assert.match(audio,/data-opora-inline-audio=\{compact\?'true':undefined\}/)
  assert.doesNotMatch(audio,/<audio[^>]*autoplay|fetch\(|new Audio\(/i)
  assert.match(player,/data-opora-guided-meditation="true"/)
  assert.match(player,/<OporaOceanOutro locale=\{lang\} paused=\{safety\} compact\/>/)
  assert.doesNotMatch(player,/outroOpen|moment==='ocean'/)
  assert.match(styles,/prefers-reduced-motion/)
  assert.match(styles,/@media\(max-width:345px\)/)
  for(const [path,source] of [
    ['components/app/opora-ocean-outro.jsx',audio],
    ['components/app/opora-experience-player.jsx',player]
  ]){
    const parsed=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(parsed.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],
      'JSX syntax must be valid: '+path)
  }
})
