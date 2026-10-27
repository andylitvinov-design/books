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
  portraitAngleForAxis, portraitAxesForSectors, summarizePortraitSectors, portraitSectorReadouts,
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
        portraitAngleForAxis,portraitAxesForSectors,summarizePortraitSectors,portraitSectorReadouts,
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
      const control=key === 'all'
        ? nodes(this.render(),'button',p=>p['data-portrait-sector-all']!==undefined)[0]
        : sectors(this.render()).find(button=>button.props['data-portrait-sector']===key)
      assert.ok(control, 'missing category button: '+key)
      control.props.onClick()
      return this.render()
    },
    view(key){
      const tab=nodes(this.render(),'button',p=>p['data-portrait-view']===key)[0]
      assert.ok(tab, 'missing portrait view: '+key)
      tab.props.onClick()
      return this.render()
    },
    openAxes(){return this.view('axes')},
  }
}

test('All is the first of six views and labels actual original test values, not a domain average',()=>{
  for(const locale of ['en','ru','es']){
    const app=harness(locale)
    const tree=app.render()
    assert.equal(sectors(tree).length,5)
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
    assert.equal(rayOptions(detail).length,0, 'chart is the default view')
    const axes=app.openAxes()
    assert.equal(rayOptions(axes).length,5)
    assert.equal(rayInputs(axes).filter(input=>input.props.checked).length,5)
  }
})

test('All selects a named latest verified test score, not measured-count coverage',()=>{
  const measured = ['stress','anxiety','sleep','energy','clarity','focus',
    'relationships','intimacy','mood','emotional_regulation','resource','meaning']
  for(const locale of ['en','ru','es']){
    const app = harness(locale,measured)
    // 4/5 measured in Body must NEVER show 4/5 as a pseudo sector score.
    app.portrait.axes.stress.measuredAt='2026-10-22T12:00:00Z'
    app.portrait.axes.stress.rawValue=1
    app.portrait.axes.stress.max=5
    app.portrait.axes.stress.percent=95
    app.portrait.axes.energy.measuredAt='2026-10-23T12:00:00Z'
    app.portrait.axes.energy.rawValue=3
    app.portrait.axes.energy.max=5
    app.portrait.axes.energy.percent=15
    const tree=app.render()
    const groups=nodes(tree,'g',p=>p['data-summary-sector']!==undefined)
    assert.equal(groups.length,4)
    const body=groups.find(group=>group.props['data-summary-sector']==='body')
    assert.equal(body.props['data-source-axis'],'energy')
    const actual=nodes(body,'text',p=>p['data-summary-test-score']==='body')
    assert.equal(actual.length,1)
    assert.equal(actual[0].props.children,'3 / 5')
    // The drawing position comes from the SAME saved test, not 4/5 coverage.
    const ray=nodes(body,'line',p=>p.className==='radarRay')
    assert.equal(ray.length,1)
    assert.ok(Math.abs(Math.hypot(ray[0].props.x2-180,ray[0].props.y2-182)-146*.15)<1e-8)
    assert.equal(nodes(body,'circle',p=>p.className==='radarPoint').length,1)
    for(const group of groups){
      const axis=group.props['data-source-axis']
      assert.ok(axis && app.portrait.axes[axis],locale+' '+group.props['data-summary-sector'])
      const source=app.portrait.axes[axis]
      const actual=nodes(group,'text',p=>p['data-summary-test-score']!==undefined)
      assert.equal(actual[0].props.children,`${source.rawValue} / ${source.max}`)
      assert.equal(nodes(group,'text',p=>p.className==='radarSummaryAxis').length,1)
    }
    const empty=harness(locale,[]).render()
    for(const group of nodes(empty,'g',p=>p['data-summary-sector']!==undefined)){
      assert.equal(group.props['data-source-axis'],'')
      assert.equal(nodes(group,'line',p=>p.className==='radarRay').length,0)
      assert.equal(nodes(group,'text',p=>p['data-summary-test-score']!==undefined)[0].props.children,'—')
    }
  }
})

test('detail charts label only actual raw test scores including descriptive values',()=>{
  const app=harness('en',['stress','anxiety','energy'])
  app.portrait.axes.stress.rawValue=1.5
  app.portrait.axes.stress.max=5
  app.portrait.axes.stress.percent=70
  app.portrait.axes.energy.mode='descriptive'
  app.portrait.axes.energy.percent=null
  app.portrait.axes.energy.rawValue=2
  app.portrait.axes.energy.max=4
  const tree=app.choose('body')
  const axis=key=>detailRays(tree).find(node=>node.props['data-detail-axis']===key)
  assert.equal(nodes(axis('stress'),'text',p=>p['data-portrait-raw-score']==='stress')[0].props.children,'1.5 / 5')
  assert.equal(nodes(axis('energy'),'text',p=>p['data-portrait-raw-score']==='energy')[0].props.children,'2 / 4')
  assert.equal(nodes(axis('energy'),'line',p=>p.className==='radarRay').length,0)
  assert.equal(nodes(axis('sleep'),'text',p=>p['data-portrait-raw-score']!==undefined).length,0)
  assert.equal(nodes(axis('embodiment'),'text',p=>p['data-portrait-raw-score']!==undefined).length,0)
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
      assert.equal(rayInputs(app.openAxes()).length,sector.axes.length)
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
  app.choose('body')
  const first=app.openAxes()
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
    app.choose(sector.key)
    const tree=app.openAxes()
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
    app.choose(sector.key)
    const tree=app.openAxes()
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
      app.choose(sector.key)
      const tree=app.openAxes()
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

test('mobile CSS keeps All plus five profiles in one row at 320px with 44px taps',()=>{
  const css=read('components/app/test-explorer.module.css')
  const fresh=css.slice(css.lastIndexOf('/* Five life profiles plus All:'))
  assert.ok(fresh.length>1500)
  assert.match(fresh,/\.visual:not\(\.visualCompact\) \.portraitSectorGrid\{/)
  assert.match(fresh,/grid-template-columns:minmax\(44px,\.68fr\) repeat\(5,minmax\(44px,1fr\)\)/)
  assert.match(fresh,/@media\(max-width:440px\)\{/)
  assert.match(fresh,/grid-template-columns:minmax\(44px,\.68fr\) repeat\(5,minmax\(44px,1fr\)\)/)
  assert.match(fresh,/grid-template-columns:minmax\(44px,\.64fr\) repeat\(5,minmax\(44px,1fr\)\)/)
  assert.match(fresh,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\)\{[\s\S]*?aspect-ratio:360 \/ 390/)
  assert.match(css,/\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\) > \.portraitRadar\{[\s\S]*?height:100%/)
  assert.match(css,/\.radarContourMeasured\{/)
  assert.match(css,/\.radarContourUnmeasured\{/)
  assert.match(css,/\.portraitRayTestLink:focus-visible/)
})

test('Reports uses a thin Chart / Axes / Tests switch and preserves lower actions once',()=>{
  const src=read('components/app/test-explorer-visual.jsx')
  const nav=src.indexOf('className={styles.portraitModeBar}')
  const chooser=src.indexOf('className={styles.portraitControls}')
  const radar=src.indexOf('className={styles.portraitRadar}')
  const actions=src.indexOf('portraitActions({ selectedSector, portrait })')
  assert.ok(nav>=0 && chooser>nav && radar>chooser && actions>radar,
    'Axis chooser replaces the chart and stays immediately under its switch')
  assert.match(src,/portraitView === 'axes' && <section/)
  assert.match(src,/hidden=\{Boolean\(portrait\) && \(portraitView !== 'chart' \|\| selectedSector === 'goal'\)\}/)
  assert.match(src,/data-portrait-sector=\{sector.key\}/)
  assert.match(src,/data-portrait-sector-all/)
  assert.match(src,/data-portrait-sector="goal"/)
  assert.match(src,/selectedSector === 'goal' && <GoalProfilePanel/)
})

test('All overview changes with chosen axes without altering saved source measurements',()=>{
  for(const locale of ['en','ru','es']){
    const app=harness(locale,['stress','energy','clarity','relationships','mood'])
    app.portrait.axes.energy.measuredAt='2026-10-26T12:00:00Z'
    app.portrait.axes.stress.measuredAt='2026-10-25T12:00:00Z'
    let all=app.render()
    const source=tree=>nodes(tree,'g',p=>p['data-summary-sector']==='body')[0]
    assert.equal(source(all).props['data-source-axis'],'energy')
    const tabs=nodes(all,'button',p=>p['data-portrait-view']!=null)
    assert.equal(tabs.length,3)
    assert.equal(tabs[0].props['aria-selected'],true)
    assert.equal(tabs[1].props['aria-selected'],false)
    assert.match(JSON.stringify(tabs.map(t=>t.props.children)),locale==='ru' ? /График/ : locale==='es' ? /Gráfico/ : /Chart/)
    const axes=app.openAxes()
    assert.equal(nodes(axes,'div',p=>p.className==='modelStage')[0].props.hidden,true)
    assert.equal(rayInputs(axes).length,17,'All exposes the full set of audited axes')
    const options=nodes(axes,'div',p=>p['data-portrait-ray']==='energy')
    assert.equal(options.length,1)
    const energy=rayInputs(options[0])[0]
    assert.equal(energy.props.checked,true)
    energy.props.onChange()
    all=app.view('chart')
    assert.equal(source(all).props['data-source-axis'],'stress',
      'the overview falls back to a different real measured axis when selected source is hidden')
    assert.equal(nodes(all,'div',p=>p.className==='modelStage')[0].props.hidden,false)
    assert.equal(app.portrait.axes.energy.rawValue,4.1,
      'display filtering must not rewrite an assessment result')
    const again=app.openAxes()
    assert.equal(rayInputs(nodes(again,'div',p=>p['data-portrait-ray']==='energy')[0])[0].props.checked,false)
  }
})

test('select all / clear all affect only the focused profile; empty overview is not a fake score',()=>{
  const app=harness('en',['stress','energy','clarity','relationships','mood'])
  app.choose('body')
  let tree=app.openAxes()
  const quick=nodes(tree,'div',p=>p.className==='portraitRayBulk')[0]
  assert.ok(quick)
  const buttons=nodes(quick,'button',()=>true)
  assert.equal(buttons.length,2)
  buttons[1].props.onClick()
  tree=app.render()
  assert.equal(rayInputs(tree).filter(input=>input.props.checked).length,0)
  app.choose('all')
  tree=app.view('chart')
  const body=nodes(tree,'g',p=>p['data-summary-sector']==='body')[0]
  assert.equal(body.props['data-source-axis'],'')
  assert.equal(nodes(body,'line',p=>p.className==='radarRay').length,0)
  const work=nodes(tree,'g',p=>p['data-summary-sector']==='work')[0]
  assert.equal(work.props['data-source-axis'],'clarity',
    'clearing Body does not erase scores or axes in Work')
  tree=app.openAxes()
  const allQuick=nodes(tree,'div',p=>p.className==='portraitRayBulk')[0]
  nodes(allQuick,'button',()=>true)[0].props.onClick()
  tree=app.view('chart')
  assert.equal(nodes(tree,'g',p=>p['data-summary-sector']==='body')[0].props['data-source-axis'],'stress')
})

test('second-level axes selection drives the whole-wheel chart across all four life profiles',()=>{
  const app=harness('en',['stress','sleep','focus','relationships','mood'])
  app.choose('body')
  const checked=app.openAxes()
  const sleepOption=nodes(checked,'div',p=>p['data-portrait-ray']==='sleep')[0]
  assert.ok(sleepOption)
  rayInputs(sleepOption)[0].props.onChange()
  app.view('chart')
  const mode=nodes(app.render(),'button',p=>p['data-chart-mode']==='axes')[0]
  assert.ok(mode)
  mode.props.onClick()
  const axes=app.render()
  const svg=nodes(axes,'svg',p=>p['data-radar-mode']==='axes')[0]
  assert.ok(svg,'selected-axes wheel replaces four-profile summary')
  assert.equal(svg.props['data-active-portrait-sector'],'selected-axes')
  const displayed=detailRays(svg).map(item=>item.props['data-detail-axis'])
  assert.equal(displayed.length,16)
  assert.ok(displayed.includes('focus') && displayed.includes('relationships') && displayed.includes('mood'),
    'full-wheel mode keeps selected axes from Work, Relationships and Growth even with Body active')
  assert.ok(!displayed.includes('sleep'),'the unchecked axis cannot reappear in the graph')
  assert.equal(app.portrait.axes.sleep.rawValue,4.1,'hiding an axis is never a mutation of test data')
  const missing=detailRays(svg).filter(item=>item.props['data-measured']===false)
  assert.ok(missing.length>0,'unmeasured axes are shown without false values')
  for(const item of missing){
    assert.equal(nodes(item,'text',p=>p['data-portrait-raw-score']!==undefined).length,0)
  }
})
