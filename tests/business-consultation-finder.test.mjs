import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {
  BUSINESS_FINDER_ISSUES, BUSINESS_FINDER_OUTCOMES, BUSINESS_FINDER_FORMATS,
  suggestBusinessConsultation,
} from '../lib/business-consulting/consultation-finder.js'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('consultation matching maps real topics only to the four approved intake formats', () => {
  const expected = {
    gentle: 'free', 'one-step': 'express', deeper: 'full', ongoing: 'mentoring',
  }
  for (const [area, issues] of Object.entries(BUSINESS_FINDER_ISSUES)) {
    assert.equal(issues.length, 4)
    for (const issue of issues) {
      for (const outcome of BUSINESS_FINDER_OUTCOMES) {
        const format = suggestBusinessConsultation({area, issue, outcome})
        assert.ok(BUSINESS_FINDER_FORMATS.includes(format), area + '/' + issue + '/' + outcome)
        if (!['team', 'partnership'].includes(issue) || outcome !== 'one-step') {
          assert.equal(format, expected[outcome], area + '/' + issue + '/' + outcome)
        }
      }
    }
  }
  assert.equal(suggestBusinessConsultation({area:'business',issue:'team',outcome:'one-step'}), 'full')
  assert.equal(suggestBusinessConsultation({area:'project',issue:'partnership',outcome:'one-step'}), 'full')
})

test('unsupported topics never silently route users to a paid offer', () => {
  const invalid = [
    {}, {area:'money',issue:'not-a-topic',outcome:'deeper'},
    {area:'medical',issue:'diagnosis',outcome:'deeper'},
    {area:'business',issue:'launch',outcome:'gentle'},
    {area:'business',issue:'strategy',outcome:'investment-advice'},
  ]
  for (const entry of invalid) assert.equal(suggestBusinessConsultation(entry), null)
})

test('two answers yield transparent offers without sensitive profiling', () => {
  for (const [area, issues] of Object.entries(BUSINESS_FINDER_ISSUES)) {
    for (const issue of issues) {
      const selected = suggestBusinessConsultation({area, issue})
      assert.ok(['express', 'full'].includes(selected), area + '/' + issue)
    }
  }
  for (const issue of ['strategy', 'team', 'partnership', 'stuck']) {
    const area = Object.keys(BUSINESS_FINDER_ISSUES).find(a => BUSINESS_FINDER_ISSUES[a].includes(issue))
    assert.equal(suggestBusinessConsultation({area, issue}), 'full')
  }
  assert.equal(suggestBusinessConsultation({area:'money',issue:'income'}), 'express')
  assert.equal(suggestBusinessConsultation({area:'money',issue:'income',outcome:'gentle'}), 'free')
  assert.equal(suggestBusinessConsultation({area:'business',issue:'launch'}), null)
})

test('Business-only wizard is localised, progressive, accessible and reuses consent-gated enquiry', () => {
  const finder = read('components/business-consultation-finder.tsx')
  const finderCss = read('components/business-consultation-finder.module.css')
  const selector = read('components/topic-journey-selector.tsx')
  const route = read('app/[locale]/explore/[theme]/page.tsx')
  const enquiry = read('components/business-website-enquiry.tsx')
  assert.match(selector,/<BusinessConsultationFinder locale=\{language\}/)
  assert.match(route,/theme === 'business' && <div/)
  assert.match(route,/<BusinessWebsiteEnquiry locale=/)
  assert.match(finder,/data-business-consultation-finder/)
  assert.match(finder,/data-business-finder-step="area"/)
  assert.match(finder,/data-business-finder-step="issue"/)
  assert.doesNotMatch(finder,/data-business-finder-step="outcome"/)
  assert.match(finder,/aria-pressed=\{area===key\}/)
  assert.match(finder,/aria-pressed=\{issue===key\}/)
  assert.match(finder,/aria-valuemax=\{2\}/)
  assert.match(finder,/aria-valuenow=\{answered\}/)
  assert.match(finder,/href="#business-direct-request"/)
  assert.match(finder,/data-business-finder-context/)
  assert.match(finder,/businessConsultingCopy\[locale\]\.offers/)
  assert.match(finder,/t\.areas\[area\]\.label/)
  assert.match(enquiry,/data-business-finder-context/)
  assert.match(enquiry,/previous\.trim\(\)\?previous:context/)
  assert.match(enquiry,/contactConsent:consent/)
  assert.match(enquiry,/type="checkbox" required/)
  assert.match(finderCss,/@media\(max-width:650px\)/)
  for (const lang of ['en', 'ru', 'es']) assert.match(finder,new RegExp('\\b'+lang+': \\{'))
  for (const phrase of ['Business & work','Money & income','For myself','My project / own venture',
    'Бизнес и работа','Деньги и доход','Для себя','Для своего дела']) assert.ok(finder.includes(phrase))
  assert.doesNotMatch(finder,/fetch\(|localStorage|sessionStorage|accountId|clientId|testResults|diagnose\(/)
})

/* Two-tap UI interaction test: compile the actual TSX and exercise its React
   state transitions. Only local editorial data is mocked; no API/lead is sent. */
const finderSource = ts.transpileModule(read('components/business-consultation-finder.tsx'), {
  fileName: 'business-consultation-finder.tsx',
  compilerOptions: {jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText
const allNodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
  ? node.flatMap(allNodes) : [node, ...allNodes(node.props?.children)]

function mountTwoQuestionFinder(locale) {
  const values = []; let index = 0, tree
  const offers = ['free','express','full'].map(kind => ({
    name: kind, price: kind === 'free' ? 'Free' : kind === 'express' ? '€50' : '€100', description: kind,
  }))
  const copy = Object.fromEntries(['en','ru','es'].map(lang => [lang, {
    offers, mentorTitle:'mentoring', mentorText:'mentoring',
  }]))
  const modules = {
    'react': {useState(initial) {
      const at=index++; if (!(at in values)) values[at]=initial
      return [values[at], next => {values[at]=typeof next==='function' ? next(values[at]) : next}]
    }},
    'react/jsx-runtime': {
      jsx: (type,props) => ({type,props}), jsxs: (type,props) => ({type,props}),
    },
    'lucide-react': new Proxy({}, {get: (_,name) => name}),
    '@/components/acquisition-event-link': {AcquisitionEventLink:'TrackedLink'},
    '@/data/business-consulting-copy': {businessConsultingCopy:copy},
    '@/lib/business-consulting/consultation-finder': {
      BUSINESS_FINDER_ISSUES, BUSINESS_FINDER_FORMATS, suggestBusinessConsultation,
    },
    './business-consultation-finder.module.css': {default:new Proxy({}, {get:(_,name)=>String(name)})},
  }
  const scope = {exports:{},require:name=>{assert.ok(modules[name],name);return modules[name]}}
  vm.runInNewContext(finderSource, scope)
  const render = () => {index=0;tree=scope.exports.BusinessConsultationFinder({locale})}
  const get = (name,value) => allNodes(tree).find(node=>node.props?.[name]===value)
  render()
  return {render,get, get tree(){return tree}}
}

for (const locale of ['en','ru','es']) {
  test(`first-screen finder gives a selectable consultation in exactly two answers (${locale})`, () => {
    const h = mountTwoQuestionFinder(locale)
    assert.ok(h.get('data-business-finder-step','area'))
    assert.equal(h.get('aria-valuemax',2)?.props['aria-valuenow'],0)
    assert.equal(h.get('data-business-finder-result',true),undefined)
    h.get('data-business-area','money').props.onClick()
    h.render()
    assert.ok(h.get('data-business-finder-step','issue'))
    assert.equal(h.get('aria-valuemax',2)?.props['aria-valuenow'],1)
    assert.equal(h.get('data-business-finder-step','outcome'),undefined)
    h.get('data-business-issue','income').props.onClick()
    h.render()
    assert.ok(h.get('data-business-finder-result',true))
    assert.equal(h.get('aria-valuemax',2)?.props['aria-valuenow'],2)
    const cta = allNodes(h.tree).find(node => node.props?.attributes?.['data-business-finder-start']==='website-form')
    assert.equal(cta.props.href,'#business-direct-request')
    assert.equal(cta.props.attributes['data-business-direct-option'],'express')
    assert.ok(cta.props.attributes['data-business-finder-context'].includes('income') ||
      cta.props.attributes['data-business-finder-context'].includes(locale==='ru'?'доход':'ingresos'))
    h.get('data-business-format-choice','free').props.onClick()
    h.render()
    const other=allNodes(h.tree).find(node=>node.props?.attributes?.['data-business-finder-start']==='website-form')
    assert.equal(other.props.attributes['data-business-direct-option'],'free')
    assert.ok(h.get('data-business-finder-result',true))
    const trail=allNodes(h.tree).find(node=>node.type==='nav' && node.props?.['aria-label'])
    allNodes(trail).find(node=>node.type==='button').props.onClick()
    h.render()
    assert.ok(h.get('data-business-finder-step','area'))
    assert.equal(h.get('data-business-finder-result',true),undefined)
  })
}
