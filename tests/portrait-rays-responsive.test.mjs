import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { TEST_EXPLORER_AXES, TEST_EXPLORER_AXIS_LABELS } from '../lib/assessments/test-explorer.js'
import { layoutPortraitRayLabels } from '../lib/assessments/portrait-ray-labels.js'
import { portraitAxisChoices } from '../lib/assessments/portrait-constructs.js'
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
const detailsLinks = tree => nodes(tree,'a',p => String(p.className).includes('portraitRayDetailsLink'))

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
    mode:'directional',percent:40+index,rawValue:4+index/10,min:0,max:10,
    source:'Synthetic only',sourceTitle:'Synthetic only',change:null,
    resultId:'saved-result-'+index, dimensionKey:'fixture.'+axis+'.total',
  }])),staleAxes:{},axisCandidates:portraitAxisChoices()}
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

test('All is the first of five views and shows only measurement coverage, not averaged health percentages',()=>{
  for(const locale of ['en','ru','es']){
    const app=harness(locale)
    const tree=app.render()
    assert.equal(sectors(tree).length,4)
    const all = nodes(tree,'button',p=>p['data-portrait-sector-all']!==undefined)
    assert.equal(all.length,1)
    assert.equal(all[0].props['aria-pressed'],true)
    assert.equal(sectors(tree).filter(b=>b.props['aria-pressed']===true).length,0)
    assert.equal(nodes(tree,'div',p=>p.role==='status' && String(p.className).includes('visualState')).length,0)
    assert.equal(nodes(tree,'svg',p=>p['data-radar-mode']==='summary').length,1)
    assert.equal(nodes(tree,'g',p=>p['data-summary-sector']!==undefined).length,4)
    assert.equal(nodes(tree,'polygon',p=>p.className==='radarArea').length,0)
    const summaryValues=nodes(tree,'text',p=>String(p.className).includes('radarSummaryValue'))
    assert.equal(summaryValues.length,4)
    assert.equal(anchors(tree).length,0)
    assert.equal(labels(tree).length,4)
    assert.equal(rayOptions(tree).length,0)
    const detail = app.choose('body')
    assert.equal(sectors(detail)[0].props['aria-pressed'],true)
    assert.equal(nodes(detail,'svg',p=>p['data-radar-layout']==='full-circle').length,1)
    assert.equal(anchors(detail).length,5)
    assert.equal(labels(detail).length,5)
    assert.equal(rayOptions(detail).length,5)
    assert.equal(rayInputs(detail).filter(input=>input.props.checked).length,5)
  }
})

test('All ray lengths equal the exact measured / total fraction of the 146-unit radius',()=>{
  // The example values are 4/5, 2/3, 2/4 and 4/5, not normalized wellbeing scores.
  const measured = ['stress','anxiety','sleep','energy','clarity','focus',
    'relationships','intimacy','mood','emotional_regulation','resource','meaning']
  const expected = {body:4/5,work:2/3,relationships:2/4,growth:4/5}
  for(const locale of ['en','ru','es']){
    const app = harness(locale,measured)
    const groups = nodes(app.render(),'g',p=>p['data-summary-sector']!==undefined)
    assert.equal(groups.length,4)
    for(const group of groups){
      const key = group.props['data-summary-sector']
      const ray = nodes(group,'line',p=>p.className==='radarRay')
      const dot = nodes(group,'circle',p=>p.className==='radarPoint')
      assert.equal(ray.length,1,key)
      assert.equal(dot.length,1,key)
      const length = Math.hypot(ray[0].props.x2-180,ray[0].props.y2-182)
      assert.ok(Math.abs(length-146*expected[key])<1e-8,`${locale}: ${key} expected ${expected[key]*100}% radius, got ${length/146*100}%`)
      assert.ok(Math.abs(Math.hypot(dot[0].props.cx-180,dot[0].props.cy-182)-length)<1e-8,key+' dot matches ray')
    }
  }
  const empty = harness('en',[]).render()
  for(const group of nodes(empty,'g',p=>p['data-summary-sector']!==undefined)){
    assert.equal(nodes(group,'line',p=>p.className==='radarRay').length,0)
  }
})

test('individual current and previous rays use the full 0–100 scale with no artificial minimum length',()=>{
  for(const locale of ['en','ru','es']){
    const app = harness(locale,['stress','anxiety','sleep','energy'])
    for(const [axis,percent] of [['stress',0],['anxiety',25],['sleep',50],['energy',100]]){
      app.portrait.axes[axis].percent=percent
    }
    app.portrait.axes.sleep.previousPercent=25
    const detail = app.choose('body')
    for(const [axis,percent] of [['stress',0],['anxiety',25],['sleep',50],['energy',100]]){
      const group=detailRays(detail).find(item=>item.props['data-detail-axis']===axis)
      const ray=nodes(group,'line',p=>p.className==='radarRay')
      const dot=nodes(group,'circle',p=>p.className==='radarPoint')
      assert.equal(ray.length,1,axis)
      assert.equal(dot.length,1,axis)
      const length=Math.hypot(ray[0].props.x2-180,ray[0].props.y2-182)
      assert.ok(Math.abs(length-146*percent/100)<1e-8,`${locale}: ${axis} ${length} vs ${percent}%`)
      assert.ok(Math.abs(Math.hypot(dot[0].props.cx-180,dot[0].props.cy-182)-length)<1e-8,axis+' dot')
    }
    const sleep=detailRays(detail).find(item=>item.props['data-detail-axis']==='sleep')
    const prior=nodes(sleep,'circle',p=>p.className==='radarPrior')
    assert.equal(prior.length,1)
    assert.ok(Math.abs(Math.hypot(prior[0].props.cx-180,prior[0].props.cy-182)-146*.25)<1e-8)
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
  const first=app.choose('body')
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
      const axis=new URL('https://holistichouse.vercel.app'+link.props.href).searchParams.get('axis')
      assert.ok(missing.includes(axis))
      assert.equal(link.props.href,`/en/app/tests?explore=1&axis=${axis}&suggest=${encodeURIComponent(app.portrait.axisCandidates[axis].testKey)}`)
      assert.equal(link.props.prefetch,false)
    }
  }
})

test('measured rays show localized Details links to their exact result and scored dimension',()=>{
  for(const locale of ['en','ru','es']){
    const app=harness(locale)
    for(const sector of PORTRAIT_SECTORS){
      const tree=app.choose(sector.key)
      const measured=sector.axes.filter(axis=>app.measured.includes(axis))
      assert.equal(detailsLinks(tree).length,measured.length)
      for(const link of detailsLinks(tree)){
        const axis=link.props['data-portrait-scale-details']
        assert.ok(measured.includes(axis))
        const source=app.portrait.axes[axis]
        assert.equal(link.props.href,`/${locale}/app/results/${encodeURIComponent(source.resultId)}?scale=${encodeURIComponent(source.dimensionKey)}#hh-assessment-scale-panel`)
        assert.equal(link.props.prefetch,false)
        const contents=JSON.stringify(link.props.children)
        assert.ok(contents.includes(locale==='ru'?'Подробнее':locale==='es'?'Detalles':'Details'))
      }
    }
  }
})

test('Test it opens the reviewed source with the correct scored axis, without automatic start',()=>{
  const explorer=read('components/app/test-explorer.jsx')
  const visual=read('components/app/test-explorer-visual.jsx')
  assert.match(visual,/suggest=\$\{encodeURIComponent\(candidate\.testKey\)\}/)
  assert.match(explorer,/params\.get\('suggest'\)/)
  assert.match(explorer,/params\.get\('axis'\)/)
  assert.match(explorer,/item\.selectable === true/)
  assert.match(explorer,/item\.measurementAxes\?\.includes\(requestedAxis\)/)
  assert.match(explorer,/setSelectedKeys\(\[entry\.key\]\)/)
  assert.match(explorer,/setAxes\(\[requestedAxis\]\)/)
  assert.ok(!explorer.slice(explorer.indexOf('// Reports → Test it:'), explorer.indexOf('  const facets =')).includes('onStart('))
})

test('the saved report honors the exact scale selected by the portrait Details link',()=>{
  const workspace=read('components/app/app-workspace.jsx')
  const personal=read('components/app/personal-result-report.jsx')
  const compact=read('components/app/compact-assessment-report.jsx')
  assert.match(workspace,/focusScaleKey = searchParams\?\.get\('scale'\)/)
  assert.match(workspace,/focusScaleKey=\{focusScaleKey\}/)
  assert.match(personal,/focusScaleKey=\{focusScaleKey\}/)
  assert.match(compact,/sections\.findIndex\(item => item\.key === focusScaleKey\)/)
  assert.match(compact,/focusedIndex >= 0 \? focusedIndex/)
})

test('mobile CSS keeps five portrait views in one row down to 320px',()=>{
  const css=read('components/app/test-explorer.module.css')
  const fresh=css.slice(css.lastIndexOf('/* Portrait v4:'))
  assert.ok(fresh.length>1500)
  assert.match(fresh,/\.visual:not\(\.visualCompact\) \.portraitSectorGrid\{/)
  assert.match(fresh,/grid-template-columns:minmax\(43px,\.68fr\) repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(fresh,/@media\(max-width:440px\)\{/)
  assert.match(fresh,/grid-template-columns:minmax\(39px,\.68fr\) repeat\(4,minmax\(0,1fr\)\)/)
  assert.match(fresh,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\)\{[\s\S]*?aspect-ratio:360 \/ 390/)
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\) > \.portraitRadar\{[\s\S]*?height:100%/)
  assert.match(css,/\.radarContourMeasured\{/)
  assert.match(css,/\.radarContourUnmeasured\{/)
  assert.match(css,/\.portraitRayTestLink:focus-visible/)
})

test('Reports keeps the three quick actions right under the radar',()=>{
  const src=read('components/app/test-explorer-visual.jsx')
  assert.ok(src.indexOf('className={styles.portraitRadar}')<src.indexOf('{portrait && !compact && portraitActions}'))
  assert.ok(src.indexOf('{portrait && !compact && portraitActions}')<src.indexOf('className={styles.portraitControls}'))
  assert.match(src,/\{portrait && !compact && !allSectors && <section className=\{styles.portraitControls\}/)
  assert.match(src,/data-portrait-sector=\{sector.key\}/)
  assert.match(src,/data-portrait-sector-all/)
})
