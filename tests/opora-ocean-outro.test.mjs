import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {lessonFor} from '../lib/inner-growth/lesson-library.js'
import {COURSE_ANTISTRESS_SKILLS_V7} from '../lib/inner-growth/anti-stress-skills-v7.js'
import {mount,findButton,textOf,nodes} from './helpers/route-pipeline-harness.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const WORDS={
  en:{next:'Continue',meditation:'2-minute grounding meditation',save:'Save my practice',
    confidence:'I managed a little',map:"See what's next",congratulations:/Congratulations/,
    guidance:/Sit comfortably and notice the chair or floor/},
  ru:{next:'Продолжить',meditation:'Медитация «Опора» · 2 минуты',save:'Сохранить мою практику',
    confidence:'Получилось немного',map:'Посмотреть, что дальше',congratulations:/Поздравляем/,
    guidance:/Сядьте удобно и почувствуйте опору/},
  es:{next:'Continuar',meditation:'Meditación de apoyo · 2 minutos',save:'Guardar mi práctica',
    confidence:'Pude hacerlo un poco',map:'Ver qué viene después',congratulations:/Enhorabuena/,
    guidance:/Siéntate cómodamente y nota el apoyo/},
}
function fixture(locale='en',day=3){
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
async function finish(f,locale){
  const d=WORDS[locale],h=f.h
  for(let i=0;i<12&&!findButton(h.tree,d.save);i++)await click(h,d.next)
  assert.ok(findButton(h.tree,d.save),'Recap must be reached before saving')
  await click(h,d.confidence)
  await click(h,d.save)
  assert.equal(f.writes,1,'A successful recap saves the lesson only once')
}
test('day 3 grounding: 3-step meditation is available from practice before congratulation, never after',async()=>{
  const f=fixture('en',3),h=f.h,d=WORDS.en
  await click(h,d.next)
  await click(h,d.next)
  assert.ok(findButton(h.tree,d.meditation),'Grounding is linked to the actual daily practice')
  await click(h,d.meditation)
  assert.match(textOf(h.tree),d.guidance)
  assert.match(textOf(h.tree),/Press Start/)
  assert.match(textOf(h.tree),/At the end, look around/)
  assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-guided-meditation']==='true').length,1)
  assert.match(textOf(h.tree),/2:00/)
  assert.equal(f.writes,0,'Meditation is not a phantom completion')
  await click(h,'Back')
  assert.ok(findButton(h.tree,d.meditation))
  await finish(f,'en')
  assert.match(textOf(h.tree),d.congratulations)
  assert.ok(!findButton(h.tree,d.meditation),'No additional practice after saving')
  assert.ok(!findButton(h.tree,'Relax with waves'),'Remove the old post-congrats detour')
  await click(h,d.map)
  assert.equal(nodes(h.tree).filter(n=>n.props?.['data-opora-course-map']==='all-14-days').length,1)
  assert.equal(f.writes,1)
  h.unmount()
})
test('receipt goes directly to course map without audio, with existing save and navigation',async()=>{
  const f=fixture('en',2),h=f.h
  await finish(f,'en')
  assert.ok(findButton(h.tree,WORDS.en.map))
  assert.doesNotMatch(textOf(h.tree),/Two quiet minutes|A GENTLE ENDING/)
  await click(h,WORDS.en.map)
  assert.match(textOf(h.tree),/Your complete 14-day journey/)
  assert.equal(f.writes,1)
  h.unmount()
})
test('EN/RU/ES optional grounding instructions and reward order are consistent',async()=>{
  for(const lang of ['en','ru','es']){
    const f=fixture(lang,3),h=f.h,d=WORDS[lang]
    await click(h,d.next);await click(h,d.next);await click(h,d.meditation)
    assert.match(textOf(h.tree),d.guidance)
    assert.equal(f.writes,0)
    await click(h,d.next==='Continue'?'Continue lesson':lang==='ru'?'Продолжить урок':'Continuar lección')
    await finish(f,lang)
    assert.match(textOf(h.tree),d.congratulations)
    assert.ok(!findButton(h.tree,d.meditation))
    await click(h,d.map)
    assert.ok(nodes(h.tree).some(n=>n.props?.['data-opora-course-map']==='all-14-days'))
    assert.equal(f.writes,1)
    h.unmount()
  }
})
test('audio timer remains click-to-play, pauseable and opt-out: no autoplay or invented practice signal',()=>{
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
  assert.match(player,/moment==='musicPause'/)
  assert.match(player,/data-opora-guided-meditation="true"/)
  assert.doesNotMatch(player,/outroOpen|moment==='ocean'/)
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
