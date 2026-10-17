import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '../lib/assessments/test-explorer.js'
import { layoutPortraitRayLabels } from '../lib/assessments/portrait-ray-labels.js'
import {
  PORTRAIT_SECTORS, PORTRAIT_SECTOR_KEYS, PORTRAIT_AXIS_ORDER,
  portraitAngleForAxis, portraitAxesForSectors, summarizePortraitSectors, portraitSectorMidAngle,
} from '../lib/assessments/portrait-sectors.js'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const descendants = node => node == null || typeof node !== 'object' ? []
  : Array.isArray(node) ? node.flatMap(descendants)
    : [node, ...descendants(node.props?.children)]
const nodes = (tree,type,match) => descendants(tree).filter(node => node.type === type && match(node.props))
const sectors = tree => nodes(tree,'button',p => typeof p['data-portrait-sector'] === 'string')
const all = tree => nodes(tree,'button',p => 'data-portrait-sector-all' in p)[0]
const rayOptions = tree => nodes(tree,'label',p => String(p.className).includes('portraitRayOption'))
const rayInputs = tree => rayOptions(tree).flatMap(item => nodes(item,'input',p => p.type === 'checkbox'))
const points = tree => nodes(tree,'circle',p => p['data-sector-point'] !== undefined)
const rayLabels = tree => nodes(tree,'text',p => p.className === 'radarInlineLabel')
const summaryLabels = tree => nodes(tree,'text',p => p.className === 'radarSummaryLabel')
const testItLinks = tree => nodes(tree,'a',p => String(p.className).includes('portraitRayTestLink'))

function harness(locale, measured = TEST_EXPLORER_AXES.filter(axis => axis !== 'personality').slice(0,8)) {
  const values = []
  let hook = 0
  const fakeReact = {
    useState(initial) {
      const index = hook++
      if (!(index in values)) values[index] = initial
      return [values[index], next => { values[index] = typeof next === 'function' ? next(values[index]) : next }]
    },
    useRef: initial => ({ current: initial }),
    useId: () => 'portrait-rays-test-options',
  }
  const code = ts.transpileModule(read('components/app/test-explorer-visual.jsx'), {
    fileName:'components/app/test-explorer-visual.jsx',
    compilerOptions:{ jsx:ts.JsxEmit.ReactJSX, module:ts.ModuleKind.CommonJS, esModuleInterop:true },
  }).outputText
  const compiled = { exports:{} }
  runInNewContext(code,{
    module:compiled,exports:compiled.exports,
    require(name) {
      if (name === 'react') return fakeReact
      if (name === 'next/link') return { __esModule:true, default:'a' }
      if (name === 'next/image') return { __esModule:true, default:'img' }
      if (name === '@/lib/assessments/test-explorer') return {TEST_EXPLORER_AXES,TEST_EXPLORER_AXIS_LABELS}
      if (name === '@/lib/assessments/portrait-ray-labels') return {layoutPortraitRayLabels}
      if (name === '@/lib/assessments/portrait-sectors') return {PORTRAIT_SECTORS,PORTRAIT_SECTOR_KEYS,PORTRAIT_AXIS_ORDER,portraitAngleForAxis,portraitAxesForSectors,summarizePortraitSectors,portraitSectorMidAngle}
      if (name.endsWith('.module.css')) return {__esModule:true,default:new Proxy({}, {get:(_,key)=>key})}
      return require(name)
    },
  })
  const portrait = {axes:Object.fromEntries(measured.map((axis,index)=>[axis,{percent:40+index,source:'Synthetic only',change:null}]))}
  const coverage = {axes:Object.fromEntries(TEST_EXPLORER_AXES.map(axis=>[axis,{coverage:0}])),coveredCount:0}
  return {
    render(){hook=0;return compiled.exports.TestExplorerVisual({locale,coverage,portrait})},
    measured, portrait,
    choose(key){const tree=this.render();const control=key==='all'?all(tree):sectors(tree).find(s=>s.props['data-portrait-sector']===key);assert.ok(control,key);control.props.onClick();return this.render()},
  }
}

test('All by default: five true buttons, four sector dots and no crowded individual rays', () => {
  for (const locale of ['en','ru','es']){
    const app=harness(locale)
    const initial=app.render()
    assert.equal(all(initial).props['aria-pressed'],true)
    assert.equal(sectors(initial).length,4)
    assert.equal(sectors(initial).filter(s=>s.props['aria-pressed']).length,0)
    assert.equal(points(initial).length,4)
    assert.equal(nodes(initial,'g',p=>p['data-summary-sector'] !== undefined).length,4)
    assert.equal(summaryLabels(initial).length,4)
    assert.equal(rayLabels(initial).length,0)
    assert.equal(rayOptions(initial).length,0)
    assert.equal(rayInputs(initial).length,0)
    assert.equal(nodes(initial,'input',p=>p.type==='checkbox').length,0)
    assert.equal(nodes(initial,'svg',p=>p['data-radar-mode']==='summary').length,1)
    assert.equal(nodes(initial,'g',p=>p['data-summary-sector']!==undefined).filter(x=>x.props['data-measured']).length,
      summarizePortraitSectors(app.portrait).filter(s=>s.percent!==null).length)
  }
})

test('Choosing one sector shows only its scales; switching sectors never combines unrelated rays',()=>{
  for(const locale of ['en','ru','es']){
    const app=harness(locale)
    for(const sector of PORTRAIT_SECTORS){
      const detail=app.choose(sector.key)
      assert.equal(all(detail).props['aria-pressed'],false)
      assert.equal(sectors(detail).filter(b=>b.props['aria-pressed']).length,1)
      assert.equal(sectors(detail).find(b=>b.props['aria-pressed']).props['data-portrait-sector'],sector.key)
      assert.equal(points(detail).length,0)
      assert.equal(summaryLabels(detail).length,0)
      assert.equal(rayOptions(detail).length,sector.axes.length)
      assert.equal(rayInputs(detail).length,sector.axes.length)
      assert.equal(rayLabels(detail).length,sector.axes.filter(axis=>app.measured.includes(axis)).length)
      assert.equal(nodes(detail,'svg',p=>p['data-radar-mode']==='detail').length,1)
    }
    const restored=app.choose('all')
    assert.equal(points(restored).length,4)
    assert.equal(rayLabels(restored).length,0)
  }
})

test('Selecting one missing scale survives switches to All and other sectors',()=>{
  const app=harness('en')
  const body=app.choose('body')
  const absent=rayOptions(body).find(option=>nodes(option,'input',p=>p.checked===false).length)
  assert.ok(absent,'a sector should include a missing optional scale')
  const checkbox=nodes(absent,'input',p=>p.type==='checkbox')[0]
  checkbox.props.onChange()
  assert.equal(rayInputs(app.render()).filter(i=>i.props.checked).length,
    app.measured.filter(axis=>PORTRAIT_SECTORS[0].axes.includes(axis)).length + 1)
  app.choose('all')
  app.choose('work')
  const again=app.choose('body')
  assert.equal(nodes(rayOptions(again).at(-1),'input',p=>p.type==='checkbox')[0].props.checked,true)
})

test('No completed scores: four unmeasured markers, never fabricated percentages',()=>{
  const app=harness('en',[])
  const overview=app.render()
  assert.equal(points(overview).length,4)
  assert.ok(points(overview).every(p=>p.props['data-measured']===false))
  assert.equal(rayLabels(overview).length,0)
  for(const sector of PORTRAIT_SECTORS){
    const detail=app.choose(sector.key)
    assert.equal(rayLabels(detail).length,0)
    assert.equal(rayOptions(detail).length,sector.axes.length)
    assert.equal(testItLinks(detail).length,sector.axes.length)
  }
  assert.equal(app.choose('all').props?.portrait,undefined)
})

test('Unmeasured scales offer a separate scoped test link; measured axes keep original data',()=>{
  const app=harness('en')
  for(const sector of PORTRAIT_SECTORS){
    const detail=app.choose(sector.key)
    const missing=sector.axes.filter(axis=>!app.measured.includes(axis))
    assert.equal(testItLinks(detail).length,missing.length)
    for(const link of testItLinks(detail)){
      const axis=link.props.href.split('axis=')[1]
      assert.ok(sector.axes.includes(axis))
      assert.equal(link.props.href,`/en/app/tests?explore=1&axis=${axis}`)
      assert.equal(link.props.prefetch,false)
    }
  }
})

test('Wide radar on iPhone has no fixed 320px image height, with clear selected-button styling',()=>{
  const css=read('components/app/test-explorer.module.css')
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\)\{[\s\S]*?aspect-ratio:360 \/ 390/)
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\) > \.portraitRadar\{[\s\S]*?height:100%/)
  assert.match(css,/\.portraitSectorGrid\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.portraitSectorGrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css,/\.portraitSectorAll\[aria-pressed=true\]/)
  assert.match(css,/\.portraitSectorChip\[aria-pressed=true\]/)
  assert.match(css,/\.radarSummaryMissingPoint\{/)
  assert.match(css,/\.portraitRayOptions\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css,/\.portraitRayTestLink:focus-visible/)
})

test('The report action bar stays after the radar and before the detail scale list',()=>{
  const source=read('components/app/test-explorer-visual.jsx')
  assert.ok(source.indexOf('className={styles.portraitRadar}')<source.indexOf('{portrait && !compact && portraitActions}'))
  assert.ok(source.indexOf('{portrait && !compact && portraitActions}')<source.indexOf('className={styles.portraitControls}'))
  assert.match(source,/selectedSector !== 'all' && <section className=\{styles.portraitControls\}/)
  assert.match(source,/data-portrait-sector-all/)
  assert.doesNotMatch(source,/toggleAllSectors|toggleSector\(/)
})
