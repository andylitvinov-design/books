// Isolated, synthetic visual QA of the ACTUAL compact numeric assessment report.
// Never connect this fixture to a real account, database, API or deployed site.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { getAssessmentDefinition } from '../../lib/assessments/definitions.js'
import { scoreAssessment } from '../../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../../lib/assessments/scale-guides.js'
import { gaugeModel, gaugeChange } from '../../lib/assessments/dashboard-gauges.js'
import { assessmentResultOverview } from '../../lib/assessments/result-overview.js'
import { scoreChangeReading } from '../../lib/assessments/score-change-reading.js'
import { assessmentEvidenceStatus } from '../../lib/assessments/assessment-evidence-status.js'
import { syntheticTraumaContext } from '../../tests/helpers/trauma-context-fixtures.mjs'

export const reportMobileFixtureScope =
  'ACTUAL_COMPACT_ASSESSMENT_REPORT_SSR_WITH_PRODUCTION_STYLES_NO_AUTH_NO_PRIVATE_DATA'
export const reportMobileFixtureOrigin = 'http://127.0.0.1:3100'
export const reportMobileWidths = Object.freeze([320, 375, 390, 1280])
export const reportMobileCases = Object.freeze([
  {key:'cbi-personal',version:'v1',instrumentLocale:'en',pattern:'burnout-middle'},
  {key:'cbi-work',version:'v1',instrumentLocale:'en',pattern:'middle'},
  {key:'phq-9',version:'v1',instrumentLocale:'en',pattern:'middle'},
  {key:'phq-4',version:'v1',instrumentLocale:'en',pattern:'high'},
  {key:'brcs',version:'v1',instrumentLocale:'en',pattern:'middle'},
  {key:'hh-current-state',version:'v2',instrumentLocale:'ru',pattern:'middle'},
  {key:'hh-money-pressure',version:'v2',instrumentLocale:'ru',pattern:'middle'},
  {key:'hh-money-pressure',version:'v1',instrumentLocale:'ru',pattern:'middle'},
  {key:'hh-socionics-32',version:'v1',instrumentLocale:'ru',pattern:'middle'},
  {key:'hh-enneagram-36',version:'v1',instrumentLocale:'en',pattern:'middle'},
  {key:'ipip-big-five-50',version:'v1',instrumentLocale:'en',pattern:'middle'},
  {key:'gad-7',version:'v1',instrumentLocale:'ru',pattern:'middle'},
  {key:'cdc-hrqol-4',version:'v1',instrumentLocale:'en',pattern:'middle'},
  {key:'cfpb-financial-wellbeing-5',version:'v1',instrumentLocale:'en',pattern:'middle'},
])

const root = new URL('../../', import.meta.url)
const loadFile = path => readFile(new URL(path, root), 'utf8')
const reportPath = 'components/app/compact-assessment-report.jsx'
const dialPath = 'components/app/assessment-gauge.jsx'
const reportCssPath = 'components/app/compact-assessment-report.module.css'
const dialCssPath = 'components/app/assessment-gauge.module.css'
const rootRoute = 'app/[locale]/app/[[...path]]/page.jsx'
export function reportMobileFixturePath({key,version,instrumentLocale,locale,pattern}) {
  assert.ok(reportMobileCases.some(item=>item.key===key && item.version===version &&
    item.instrumentLocale===instrumentLocale && item.pattern===pattern),'Unsupported synthetic case')
  assert.ok(['en','ru'].includes(locale),'Unsupported display locale')
  return '/__hh-test__/assessment-report/' + [key,version,instrumentLocale,locale,pattern].join('/')
}

export function buildReportMobileFixtures() {
  return reportMobileCases.flatMap(entry => ['ru','en'].map(locale => {
    const definition=getAssessmentDefinition(entry.key,entry.version,entry.instrumentLocale)
    assert.ok(definition,entry.key)
    const answers=Object.fromEntries(definition.questions.map((question,index)=>{
      if(entry.pattern==='burnout-middle')return [question.id,[3,2,2,2,1,1][index]]
      const min=question.min??definition.answerScale?.min
      const max=question.max??definition.answerScale?.max
      assert.ok(Number.isFinite(min)&&Number.isFinite(max),entry.key + '/' + question.id)
      return [question.id,entry.pattern==='high'?max:Math.round((min+max)/2)]
    }))
    const result=scoreAssessment(definition,answers,syntheticTraumaContext(definition))
    const report=buildAssessmentResultReport(result,locale)
    assert.ok(report.sections?.length && report.verified!==false,entry.key+'/'+locale)
    const fixture={...entry,locale,result,report}
    return {...fixture,path:reportMobileFixturePath(fixture)}
  }))
}

export function scopeReportModuleCss(source,prefix,path){
  const styles=Object.create(null)
  const parsed=postcss.parse(source,{from:path})
  parsed.walkRules(rule=>{
    rule.selector=selectorParser(selectors=>selectors.walkClasses(node=>{
      node.value=styles[node.value]=prefix+'_'+node.value
    })).processSync(rule.selector)
  })
  return {styles,css:parsed.toString()}
}

function transpile(path,source,imports){
  const t=ts.transpileModule(source,{
    fileName:path,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022},
    reportDiagnostics:true,
  })
  assert.deepEqual(t.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error),[])
  const mod={exports:{}}
  runInNewContext(t.outputText,{exports:mod.exports,require:name=>{
    assert.ok(Object.hasOwn(imports,name),'Unexpected numeric report dependency '+name)
    return imports[name]
  }})
  return mod.exports
}

// The two actual JSX components are compiled with original CSS Modules. No
// fabricated report markup is allowed in the hosted-browser test.
export async function buildReportMobileRenderer(){
  const sourceProof=[]
  const source=async path=>{
    const text=await loadFile(path)
    sourceProof.push({path,sha256:createHash('sha256').update(text).digest('hex')})
    return text
  }
  const gaugeCss=scopeReportModuleCss(await source(dialCssPath),'hh_qa_gauge',dialCssPath)
  const reportCss=scopeReportModuleCss(await source(reportCssPath),'hh_qa_report',reportCssPath)
  const Gauge=transpile(dialPath,await source(dialPath),{
    'react/jsx-runtime':jsxRuntime,
    '@/lib/assessments/dashboard-gauges':{gaugeModel,gaugeChange},
    '@/lib/assessments/score-change-reading':{scoreChangeReading},
    './assessment-gauge.module.css':gaugeCss.styles,
  })
  const Report=transpile(reportPath,await source(reportPath),{
    'react/jsx-runtime':jsxRuntime,react:React,
    './free-course-banner':{FreeCourseBanner:()=>null},
    './assessment-gauge':Gauge,
    '@/lib/assessments/scale-guides':{getTestScaleGuide},
    '@/lib/assessments/dashboard-gauges':{gaugeModel},
    '@/lib/assessments/result-overview':{assessmentResultOverview},
    '@/lib/assessments/assessment-evidence-status':{assessmentEvidenceStatus},
    './compact-assessment-report.module.css':reportCss.styles,
  }).CompactAssessmentReport
  const rootLayout=await source('app/layout.tsx')
  const route=await source(rootRoute)
  const styles=[]
  const rootCss=[...rootLayout.matchAll(/import\s+["']\.\/([^"']+\.css)["']/g)].map(m=>'app/'+m[1])
  const routeCss=[...route.matchAll(/import\s+["']([^"']+\.css)['"]/g)].map(m=>
    m[1].startsWith('@/')?m[1].slice(2):'app/[locale]/app/[[...path]]/'+m[1].replace(/^\.\//,''))
  assert.ok(rootCss.includes('app/globals.css'))
  assert.ok(routeCss.includes('app/[locale]/app/[[...path]]/workspace.css'))
  for(const path of [...rootCss,...routeCss]){
    const css=await source(path)
    if(path==='app/globals.css'){
      const compiled=await postcss([
        tailwindcss({config:fileURLToPath(new URL('tailwind.config.ts',root))}),
        autoprefixer(),
      ]).process(css,{from:fileURLToPath(new URL(path,root))})
      assert.deepEqual(compiled.warnings().map(w=>w.toString()),[])
      styles.push(compiled.css)
    }else styles.push(css)
  }
  styles.push(gaugeCss.css,reportCss.css)
  const css=styles.join('\n').replace(/<\/style/gi,'<\\/style')
  return {
    sourceProof,scope:reportMobileFixtureScope,
    document(fixture){
      reportMobileFixturePath(fixture)
      const snapshot=JSON.stringify(fixture.result)
      const markup=renderToStaticMarkup(React.createElement(Report,{
        result:fixture.result,report:fixture.report,locale:fixture.locale,
      }))
      assert.equal(JSON.stringify(fixture.result),snapshot,'Never mutate saved results')
      return '<!doctype html><html lang="'+fixture.locale+'"><head><meta charset="utf-8">'+
        '<meta name="viewport" content="width=device-width, initial-scale=1">'+
        '<meta name="robots" content="noindex"><title>Synthetic Numeric Report QA</title>'+
        '<style>'+css+'</style></head><body>'+
        '<main class="hh-app"><article class="hh-result-page">'+markup+
        '</article></main></body></html>'
    },
  }
}

export function requireHostedReportMobile(env){
  assert.equal(env.CI,'true','Run on CI only')
  assert.equal(env.GITHUB_ACTIONS,'true','GitHub-hosted browser only')
  assert.equal(env.RUNNER_ENVIRONMENT,'github-hosted','Must be a GitHub-hosted runner')
  assert.equal(env.HH_APP_TEST_RUNTIME,'isolated','Must use an isolated synthetic runtime')
  assert.ok(!env.VERCEL,'Never use production or preview browser access')
}
