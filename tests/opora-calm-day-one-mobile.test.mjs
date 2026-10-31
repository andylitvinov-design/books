import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {mount,nodes,findPart,textOf} from './helpers/route-pipeline-harness.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const legacy=read('components/app/course-slide-player.jsx')
const legacyCss=read('components/app/course-slide-player.module.css')
const dayOne=read('components/app/anti-stress-day-one.jsx')
const dayOneCss=read('components/app/anti-stress-day-one.module.css')
const v6=read('components/app/opora-v6-slide-player.jsx')
const v6Css=read('components/app/opora-v6-slide-player.module.css')

function mountDay(kind,locale='en',answers={}){
  const recorded=[]
  const h=mount('anti-stress-day-one',{
    kind,locale,answers,lesson:{},onAnswer:(field,value)=>recorded.push({field,value}),
    locked:false,onDiscomfort(){},onStopPractice(){},onReturnToPractice(){},
  })
  const chooser=nodes(h.tree).find(n=>n.type?.name==='DayOneChoices'&&
    n.props.options?.some(x=>x.value==='look'||x.value==='colour'))
  const buttons=chooser?mount('anti-stress-day-one',chooser.props,{exportName:'DayOneChoices'}):null
  return {h,buttons,recorded}
}

test('Day 1 preparation is photo-led with three gentle choices, not a five-card questionnaire',()=>{
  const x=mountDay('day1-prepare')
  assert.match(textOf(x.h.tree),/Let.s begin gently/)
  assert.doesNotMatch(textOf(x.h.tree),/STEP 06|How I begin|Today we will notice how we are/)
  const opts=x.buttons?.tree&&nodes(x.buttons.tree).filter(n=>n.type==='button')||[]
  assert.equal(opts.length,3)
  assert.deepEqual(opts.map(n=>textOf(n)),['Look around','Use the picture','Just read for now'])
  assert.ok(nodes(x.h.tree).some(n=>n.type==='img'&&n.props?.src?.includes('course-focus-mountain-boy')))
  opts[0].props.onClick()
  assert.deepEqual(x.recorded,[{field:'preparation',value:'look'}])
  x.buttons.unmount();x.h.unmount()
})

test('Day 1 notice directs attention outward; inner checking is optional and not required',()=>{
  const x=mountDay('day1-notice')
  assert.match(textOf(x.h.tree),/Notice one ordinary detail/)
  assert.doesNotMatch(textOf(x.h.tree),/STEP 07|What do you notice inside right now/)
  const opts=x.buttons?.tree&&nodes(x.buttons.tree).filter(n=>n.type==='button')||[]
  assert.deepEqual(opts.map(n=>textOf(n)),['Colour','Shape','Object'])
  assert.ok(nodes(x.h.tree).some(n=>n.type==='details'))
  opts[1].props.onClick()
  assert.deepEqual(x.recorded,[{field:'noticed',value:'shape'}])
  x.buttons.unmount();x.h.unmount()
})

test('The screenshot route has no extra Skip controls; pace and imagery are separate',()=>{
  assert.match(legacy,/data-opora-first-lesson=\{isDayOne\?"as-1\.9":undefined\}/)
  assert.match(legacy,/data-opora-calm-pace/)
  assert.match(legacy,/!isDayOne&&<button type="button" disabled=\{locked\} aria-pressed=\{cycle\.preferences\?\.imagery/)
  assert.match(legacy,/className=\{styles\.calmNoImagery\}/)
  assert.match(legacy,/!isSkillV5&&!isDayOne&&<button type="button" className=\{styles\.welcomeSkip\}/)
  assert.match(legacy,/!isSkillV5&&!isDayOne&&\(\['baseline','checkin','guided','ritual','transfer','symbol','moment','reflection'\]/)
  assert.match(dayOne,/options=\{options\.filter\(item=>item\.value!=='skip'\)\}/)
  // Old backend still accepts legacy answers stored before this presentation change.
  const oldContract=read('lib/inner-growth/anti-stress-day-one.js')
  assert.match(oldContract,/preparation: \['look','photo','read','rest','skip'\]/)
})

test('shorter footer and calm photo protect the iPhone viewport without clipping zoomed content',()=>{
  assert.match(legacyCss,/first-day restorative mobile flow/)
  assert.match(legacyCss,/\.overlay\[data-opora-first-lesson\]\[data-course-one-screen\] \.footer\{/)
  assert.match(legacyCss,/grid-template-columns:auto minmax\(0,1fr\)/)
  assert.match(legacyCss,/overflow-y:auto;overflow-x:hidden/)
  assert.match(dayOneCss,/calmPhoto/)
  assert.match(dayOneCss,/height:clamp\(103px,17dvh,150px\)/)
  assert.match(dayOneCss,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  for(const file of ['components/app/course-slide-player.jsx','components/app/anti-stress-day-one.jsx']){
    const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
    assert.deepEqual(tree.parseDiagnostics,[],file+' JSX should parse')
  }
})

test('the current V6 retains full scenic photographs and an accessible mobile scrolling fallback',()=>{
  assert.match(v6,/data-opora-lesson-photo/)
  assert.match(v6,/className=\\{styles\\.scenicBackdrop\\}/)
  assert.match(v6,/data-scene-role=/)
  assert.match(v6Css,/OPORA scenic lesson system/)
  assert.match(v6Css,/scenicBackdrop/)
  assert.match(v6Css,/One step per mobile viewport/)
  assert.match(v6Css,/overflow-y:auto/)
  const tree=ts.createSourceFile('opora-v6-slide-player.jsx',v6,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.deepEqual(tree.parseDiagnostics,[])
})