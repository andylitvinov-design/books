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
  portraitAngleForAxis, portraitAxesForSectors, summarizePortraitSectors,
  portraitSectorMidAngle, portraitFullCircleAngleForAxis,
} from '../lib/assessments/portrait-sectors.js'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const descendants = node => node == null || typeof node !== 'object' ? []
  : Array.isArray(node) ? node.flatMap(descendants)
    : [node, ...descendants(node.props?.children)]
const nodes = (tree,type,match) => descendants(tree).filter(node => node.type === type && match(node.props))
const sectors = tree => nodes(tree,'button',p => typeof p['data-portrait-sector'] === 'string')
const rayOptions = tree => nodes(tree,'label',p => String(p.className).includes('portraitRayOption'))
const rayInputs = tree => rayOptions(tree).flatMap(item => nodes(item,'input',p => p.type === 'checkbox'))
const anchors = tree => nodes(tree,'circle',p => p['data-contour-axis'] !== undefined)
const detailRays = tree => nodes(tree,'g',p => p['data-detail-axis'] !== undefined)
const labels = tree => nodes(tree,'text',p => p.className === 'radarInlineLabel')
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
      if (name === '@/lib/assessments/portrait-sectors') return {
        PORTRAIT_SECTORS,PORTRAIT_SECTOR_KEYS,PORTRAIT_AXIS_ORDER,
        portraitAngleForAxis,portraitAxesForSectors,summarizePortraitSectors,
        portraitSectorMidAngle,portraitFullCircleAngleForAxis,
      }
      if (name.endsWith('.module.css')) return {__esModule:true,default:new Proxy({}, {get:(_,key)=>key})}
      return require(name)
    },
  })
  const portrait = {axes:Object.fromEntries(measured.map((axis,index)=>[axis,{
    percent:40+index,source:'Synthetic only',change:null,
  }]))}
  const coverage = {axes:Object.fromEntries(TEST_EXPLORER_AXES.map(axis=>[axis,{coverage:0}])),coveredCount:0}
  return {
    render(){hook=0;return compiled.exports.TestExplorerVisual({locale,coverage,portrait})},
    measured,portrait,
    choose(key){
      const control=sectors(this.render()).find(button=>button.props['data-portrait-sector']===key)
      assert.ok(control, 'missing category button: '+key)
      control.props.onClick()
      return this.render()
    },
  }
}

test('only FOUR category buttons, same component, no count block or All button',()=>{
  for(const locale of ['en','ru','es']){
    const app=harness(locale)
    const tree=app.render()
    assert.equal(sectors(tree).length,4)
    assert.equal(nodes(tree,'button',p=>p['data-portrait-sector-all']!==undefined).length,0)
    assert.equal(sectors(tree).filter(b=>b.props['aria-pressed']===true).length,1)
    assert.equal(sectors(tree)[0].props['data-portrait-sector'],'body')
    assert.equal(sectors(tree)[0].props['aria-pressed'],true)
    assert.equal(nodes(tree,'div',p=>p.role==='status' && String(p.className).includes('visualState')).length,0)
    assert.equal(nodes(tree,'svg',p=>p['data-radar-layout']==='full-circle').length,1)
    assert.equal(anchors(tree).length,5)
    assert.equal(labels(tree).length,5)
    assert.equal(rayOptions(tree).length,5)
    assert.equal(rayInputs(tree).filter(input=>input.props.checked).length,5)
  }
})

test('each category shows all its own 3–5 scales, spaced over the FULL 360-degree contour',()=>{
  for(const locale of ['en','ru','es']){
    const app=harness(locale)
    for(const sector of PORTRAIT_SECTORS){
      const tree=app.choose(sector.key)
      assert.equal(sectors(tree).filter(b=>b.props['aria-pressed']===true).length,1)
      assert.equal(sectors(tree).find(b=>b.props['aria-pressed']).props['data-portrait-sector'],sector.key)
      assert.equal(detailRays(tree).length,sector.axes.length)
      assert.equal(rayInputs(tree).length,sector.axes.length)
      assert.equal(anchors(tree).length,sector.axes.length)
      assert.equal(labels(tree).length,sector.axes.length)
      assert.equal(nodes(tree,'svg',p=>p['data-active-portrait-sector']===sector.key).length,1)
      for(let index=0;index<sector.axes.length;index++){
        const axis=sector.axes[index]
        const dot=anchors(tree).find(item=>item.props['data-contour-axis']===axis)
        assert.ok(dot,axis)
        const a=-Math.PI/2+index*2*Math.PI/sector.axes.length
        assert.ok(Math.abs(dot.props.cx-(180+146*Math.cos(a)))<1e-7,'full-circle x position '+axis)
        assert.ok(Math.abs(dot.props.cy-(182+146*Math.sin(a)))<1e-7,'full-circle y position '+axis)
        assert.equal(dot.props['data-measured'],app.measured.includes(axis))
      }
      const unrelated=PORTRAIT_AXIS_ORDER.filter(axis=>!sector.axes.includes(axis))
      assert.ok(!detailRays(tree).some(node=>unrelated.includes(node.props['data-detail-axis'])))
    }
  }
})

test('user can opt out of one scale; switching categories preserves that preference',()=>{
  const app=harness('en')
  const first=app.render()
  const bodyAxes=PORTRAIT_SECTORS[0].axes
  assert.equal(rayInputs(first).filter(input=>input.props.checked).length,bodyAxes.length)
  // Embodiment is not measured in the fixture but its axis and label are visible.
  const finalInput=rayInputs(first).at(-1)
  assert.equal(finalInput.props.checked,true)
  finalInput.props.onChange()
  assert.equal(anchors(app.render()).length,bodyAxes.length-1)
  app.choose('work')
  app.choose('relationships')
  const body=app.choose('body')
  assert.equal(anchors(body).length,bodyAxes.length-1)
  assert.equal(rayInputs(body).at(-1).props.checked,false)
  // Real values have not been changed by presentation preferences.
  assert.equal(app.portrait.axes.stress.percent,40)
})

test('without test results each category retains its axes and does not invent values',()=>{
  const app=harness('ru',[])
  for(const sector of PORTRAIT_SECTORS){
    const tree=app.choose(sector.key)
    assert.equal(labels(tree).length,sector.axes.length)
    assert.equal(anchors(tree).length,sector.axes.length)
    assert.ok(anchors(tree).every(node=>node.props['data-measured']===false))
    assert.ok(detailRays(tree).every(node=>node.props['data-measured']===false))
    assert.equal(testItLinks(tree).length,sector.axes.length)
    assert.equal(nodes(tree,'polygon',p=>p.className==='radarArea').length,0)
  }
})

test('missing scales keep actual test links and source data stays private',()=>{
  const app=harness('en')
  for(const sector of PORTRAIT_SECTORS){
    const tree=app.choose(sector.key)
    const missing=sector.axes.filter(axis=>!app.measured.includes(axis))
    assert.equal(testItLinks(tree).length,missing.length)
    for(const link of testItLinks(tree)){
      const axis=link.props.href.split('axis=')[1]
      assert.ok(missing.includes(axis))
      assert.equal(link.props.href,`/en/app/tests?explore=1&axis=${axis}`)
      assert.equal(link.props.prefetch,false)
    }
  }
})

test('mobile CSS stays four columns even at 320px and uses wide aspect-ratio radar',()=>{
  const css=read('components/app/test-explorer.module.css')
  const fresh=css.slice(css.indexOf('/* Portrait v3: four compact tabs'))
  assert.ok(fresh.length>2500)
  assert.match(fresh,/\.visual:not\(\.visualCompact\) \.portraitSectorGrid\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(fresh,/@media\(max-width:760px\)\{[\s\S]*?\.portraitSectorGrid\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(fresh,/@media\(max-width:440px\)\{[\s\S]*?\.portraitSectorGrid\{[\s\S]*?grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\)\{[\s\S]*?aspect-ratio:360 \/ 390/)
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\) > \.portraitRadar\{[\s\S]*?height:100%/)
  assert.match(fresh,/\.radarContourMeasured\{/)
  assert.match(fresh,/\.radarContourUnmeasured\{/)
  assert.match(css,/\.portraitRayTestLink:focus-visible/)
})

test('Reports keeps the two original quick actions right under the radar',()=>{
  const src=read('components/app/test-explorer-visual.jsx')
  assert.ok(src.indexOf('className={styles.portraitRadar}')<src.indexOf('{portrait && !compact && portraitActions}'))
  assert.ok(src.indexOf('{portrait && !compact && portraitActions}')<src.indexOf('className={styles.portraitControls}'))
  assert.match(src,/\{portrait && !compact && <section className=\{styles.portraitControls\}/)
  assert.match(src,/data-portrait-sector=\{sector.key\}/)
  assert.doesNotMatch(src,/toggleAllSectors|toggleSector\(|data-portrait-sector-all|summaryPoints/)
})
