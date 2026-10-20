import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { URL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'
import { getAssessmentDefinition } from '../lib/assessments/definitions.js'
import { scoreAssessment } from '../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../lib/assessments/scale-guides.js'
import { gaugeChange, gaugeModel } from '../lib/assessments/dashboard-gauges.js'
import { assessmentResultOverview } from '../lib/assessments/result-overview.js'
import { assessmentEvidenceStatus } from '../lib/assessments/assessment-evidence-status.js'
import { scoreChangeReading } from '../lib/assessments/score-change-reading.js'

const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/app/free-course-banner.jsx')
const compiled = ts.transpileModule(source, {
  fileName: 'free-course-banner.jsx',
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText
const Link = function Link() {}
const loaded = { exports: {} }
runInNewContext(compiled, {
  exports: loaded.exports,
  require: name => name === 'next/link' ? Link
    : name.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
      : require(name),
})
const { FreeCourseBanner } = loaded.exports
const isolatedReactState = { useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}] }
const walk = node => node == null || typeof node === 'boolean' ? []
  : Array.isArray(node) ? node.flatMap(walk)
    : typeof node === 'object' ? [node, ...walk(node.props?.children)] : [node]
const elements = tree => walk(tree).filter(node => typeof node === 'object')
const text = tree => walk(tree).filter(node => typeof node === 'string').join(' ')

for (const locale of ['en', 'ru']) {
  test('optional course banner renders both choices and factual information in ' + locale, () => {
    const tree = FreeCourseBanner({ locale })
    const nodes = elements(tree)
    assert.equal(tree.type, 'aside')
    assert.equal(tree.props.className, 'banner')
    assert.ok(tree.props['aria-label'])
    assert.equal(nodes.filter(node => node.type === 'h3').length, 1)
    const links = nodes.filter(node => node.type === Link)
    assert.equal(links.length, 1)
    assert.equal(links[0].props.href, '/' + locale + '/app/course?program=stress')
    assert.equal(links[0].props.prefetch, false)
    assert.match(text(links[0]), locale === 'ru' ? /Начать курс бесплатно/ : /Start course for free/)
    const details = nodes.find(node => node.type === 'details')
    assert.ok(details)
    assert.equal(details.props.open, undefined)
    assert.equal(details.props.children[0].type, 'summary')
    assert.match(text(details.props.children[0]), locale === 'ru' ? /Подробнее о курсе/ : /More about the course/)
    assert.match(text(details), locale === 'ru' ? /14 дней/ : /14 days/)
    assert.match(text(details), locale === 'ru' ? /вашего согласия/ : /requires your consent/)
    assert.match(text(details), locale === 'ru' ? /текущий прогресс/ : /current progress/)
    assert.match(text(details), locale === 'ru' ? /не меняет результаты теста/ : /does not change your test results/)
    assert.match(text(details), locale === 'ru' ? /а не диагноз/ : /not a diagnosis/)
    assert.ok(nodes.every(node => !['form', 'input', 'button', 'dialog'].includes(node.type)))
    assert.ok(nodes.every(node => !Object.keys(node.props).some(key => /^on[A-Z]/.test(key))))
  })
}

test('default and unsupported locale safely use the English route and copy', () => {
  for (const props of [{}, { locale: 'es' }, { locale: '../../admin' }, { locale: null }]) {
    const tree = FreeCourseBanner(props)
    assert.equal(elements(tree).find(node => node.type === Link).props.href, '/en/app/course?program=stress')
    assert.match(text(tree), /An optional next step/)
  }
})

test('More is independent of course loading or stage and never writes or navigates', () => {
  assert.doesNotMatch(source, /useState|useEffect|fetch\(|onClick|onToggle|localStorage|sessionStorage|course-details|resultId|definitionKey|searchParams/)
  assert.doesNotMatch(source, /target=|dangerouslySetInnerHTML|autoFocus|tabIndex|role="button"/)
  const details = elements(FreeCourseBanner({ locale: 'en' })).find(node => node.type === 'details')
  assert.equal(elements(details).filter(node => node.type === Link || node.type === 'a').length, 0)
  assert.ok(elements(details).every(node => !Object.keys(node.props).some(key => /^on[A-Z]/.test(key))))
})

test('all compact reports show exactly one optional banner after unchanged report content', () => {
  const report = read('components/app/compact-assessment-report.jsx')
  assert.equal((report.match(/<FreeCourseBanner locale=\{locale\} compact\/>/g) || []).length, 2)
  assert.ok(report.indexOf('<FreeCourseBanner') > report.indexOf('{report.rulesVersion}'))
  assert.doesNotMatch(report, /hasSkills|skillAxes/)
  assert.match(report, /getTestScaleGuide\(result\.definitionKey, locale\)/)
  assert.match(report, /<ScoreGauge dimension=\{dimension\} locale=\{locale\}/)
  assert.match(report, /data-primary-support/)
})

test('the actual report renders the optional banner without skill mappings or course state', () => {
  const reportSource = read('components/app/compact-assessment-report.jsx')
  const reportCode = ts.transpileModule(reportSource, {
    fileName: 'compact-assessment-report.jsx',
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const reportModule = { exports: {} }
  runInNewContext(reportCode, {
    exports: reportModule.exports,
    require: name => name === 'react' ? isolatedReactState
      : name === './free-course-banner' ? { FreeCourseBanner }
      : name === './assessment-gauge' ? { ScoreGauge: () => null, ScoreTrend: () => null }
        : name.endsWith('/scale-guides') ? { getTestScaleGuide: () => null }
          : name.endsWith('/dashboard-gauges') ? { gaugeModel: () => null }
            : name.endsWith('/result-overview') ? { assessmentResultOverview }
              : name.endsWith('/assessment-evidence-status') ? { assessmentEvidenceStatus }
            : name.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
              : require(name),
  })
  for (const locale of ['en', 'ru']) {
    const result = Object.freeze({ definitionKey: 'synthetic-test', dimensions: Object.freeze([]) })
    const report = Object.freeze({ sections: Object.freeze([]), rulesVersion: 'synthetic-v1', purpose: 'Purpose', note: 'Limits' })
    const tree = reportModule.exports.CompactAssessmentReport({ result, report, locale })
    const banners = elements(tree).filter(node => node.type === FreeCourseBanner)
    assert.equal(banners.length, 1)
    assert.equal(banners[0].props.locale, locale)
    assert.equal(tree.props.children.at(-1), banners[0])
    assert.match(text(tree), /synthetic-v1/)
  }
})

test('native disclosure retains keyboard semantics, visible focus and narrow-screen wrapping', () => {
  const css = read('components/app/free-course-banner.module.css')
  assert.match(source, /<details className=\{styles\.more\}>\s*<summary>/)
  assert.match(css, /\.start:focus-visible,\.more>summary:focus-visible\{outline:3px solid/)
  assert.match(css, /\.start\{[^}]*min-height:44px/)
  assert.match(css, /\.more>summary\{[^}]*min-height:44px/)
  assert.match(css, /overflow-wrap:anywhere/)
  assert.match(css, /flex-wrap:wrap/)
  assert.match(css, /@media\(max-width:530px\)/)
  assert.match(css, /@media print\{\.banner\{display:none\}\}/)
})


test('ASRS count-only EN/RU reports allow only a score-independent optional course banner', () => {
  const loadComponent = (path, imports) => {
    const compiled = ts.transpileModule(read(path), {
      fileName: path,
      compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText
    const loaded = { exports: {} }
    runInNewContext(compiled, {
      exports: loaded.exports,
      require: name => imports[name] || (name.endsWith('.module.css')
        ? { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) } : require(name)),
    })
    return loaded.exports
  }
  const gauges = loadComponent('components/app/assessment-gauge.jsx', {
    '@/lib/assessments/dashboard-gauges': { gaugeChange, gaugeModel },
    '@/lib/assessments/score-change-reading': { scoreChangeReading },
  })
  const { CompactAssessmentReport } = loadComponent('components/app/compact-assessment-report.jsx', {
    'react': isolatedReactState,
    './free-course-banner': { FreeCourseBanner }, './assessment-gauge': gauges,
    '@/lib/assessments/scale-guides': { getTestScaleGuide },
    '@/lib/assessments/dashboard-gauges': { gaugeModel },
    '@/lib/assessments/result-overview': { assessmentResultOverview },
    '@/lib/assessments/assessment-evidence-status': { assessmentEvidenceStatus },
  })
  // Exercise the exact pure boundary assertion used by the browser journey.
  const browserSource = read('scripts/verify-asrs6.mjs')
  const boundarySource = browserSource.slice(browserSource.indexOf('function assertCourseLinkBoundary('),
    browserSource.indexOf('async function assertReport('))
  const checkBoundary = runInNewContext('(' + boundarySource.trim() + ')', { assert })
  const expand = node => node == null || typeof node !== 'object' ? node
    : Array.isArray(node) ? node.map(expand)
      : typeof node.type === 'function' && node.type !== Link ? expand(node.type(node.props))
        : { ...node, props: { ...node.props, children: expand(node.props.children) } }
  const courseLinks = (node, insideBanner = false, insideScore = false) => {
    if (node == null || typeof node !== 'object') return []
    if (Array.isArray(node)) return node.flatMap(child => courseLinks(child, insideBanner, insideScore))
    const banner = insideBanner || Object.hasOwn(node.props, 'data-free-course-banner')
    const score = insideScore || node.type === 'article'
    const own = (node.type === Link || node.type === 'a') && /\/app\/course(?:[?#]|$)/.test(node.props.href || '')
      ? [{ href: node.props.href, insideBanner: banner, insideScore: score }] : []
    return [...own, ...courseLinks(node.props.children, banner, score)]
  }
  for (const locale of ['en', 'ru']) {
    let baselineBanner
    for (const count of [0, 3, 4, 6]) {
      const definition = getAssessmentDefinition('asrs-6', 'v1', locale)
      const answers = Object.fromEntries(definition.questions.map((question, index) =>
        [question.id, index < count ? (index < 3 ? 2 : 3) : 0]))
      const result = scoreAssessment(definition, answers)
      const report = buildAssessmentResultReport(result, locale)
      const tree = expand(CompactAssessmentReport({ result, report, locale }))
      const nodes = elements(tree)
      const banners = nodes.filter(node => Object.hasOwn(node.props, 'data-free-course-banner'))
      assert.equal(banners.length, 1)
      assert.equal(tree.props.children.at(-1), banners[0])
      const links = courseLinks(tree)
      checkBoundary(links, locale)
      assert.equal(nodes.filter(node => node.props['data-assessment-gauge'] === 'screening-count').length, 1)
      assert.ok(nodes.every(node => !['meter', 'svg'].includes(node.type) && node.props.role !== 'progressbar'))
      const bannerText = text(banners[0])
      if (baselineBanner === undefined) baselineBanner = bannerText
      assert.equal(bannerText, baselineBanner, 'Generic banner must not vary with screening count or threshold')
      assert.doesNotMatch(bannerText, /ASRS|ADHD|СДВГ|screening|скрининг/i)
      assert.match(bannerText, locale === 'ru' ? /по желанию/ : /optional next step/)
      assert.match(bannerText, locale === 'ru' ? /требуют вашего согласия/ : /requires your consent/)
      assert.match(bannerText, locale === 'ru' ? /а не диагноз, психотерапия или экстренная помощь/ : /not a diagnosis, psychotherapy or emergency support/)
      assert.match(bannerText, locale === 'ru' ? /Курс необязателен и не меняет результаты теста/ : /Taking the course is optional and does not change your test results/)
      // Negative controls: an extra score recommendation or a displaced banner link must fail.
      for (const suffix of ['', '?from=asrs-score', '#practice']) {
        const badScoreLink = { type: 'a', props: { href: '/' + locale + '/app/course' + suffix, children: 'Score-derived course recommendation' } }
        const injected = { ...tree, props: { ...tree.props, children: [
          ...tree.props.children, { type: 'article', props: { children: badScoreLink } },
        ] } }
        assert.throws(() => checkBoundary(courseLinks(injected), locale), /single optional banner/)
      }
      assert.throws(() => checkBoundary([{ ...links[0], insideBanner: false }], locale), /score-derived course recommendation/)
      assert.throws(() => checkBoundary([{ ...links[0], insideScore: true }], locale), /outside scored articles/)
    }
  }
})


test('ASRS browser DOM boundary ignores the outer page article and rejects inner score links', () => {
  const browserSource = read('scripts/verify-asrs6.mjs')
  const collector = browserSource.slice(browserSource.indexOf('function collectCourseLinkContext('),
    browserSource.indexOf('// A generic optional banner'))
  const boundary = browserSource.slice(browserSource.indexOf('function assertCourseLinkBoundary('),
    browserSource.indexOf('async function assertReport('))
  const collect = runInNewContext('(' + collector.trim() + ')')
  const check = runInNewContext('(' + boundary.trim() + ')', { assert })
  // Match the real account page: article > result section > score article + banner aside.
  const element = (tag, attributes = {}, parent = null) => ({
    tag, attributes, parent,
    getAttribute(name) { return this.attributes[name] ?? null },
    closest(selector) {
      const matches = selector.startsWith('[')
        ? Object.hasOwn(this.attributes, selector.slice(1, -1)) : this.tag === selector
      return matches ? this : this.parent?.closest(selector) || null
    },
    contains(child) {
      return child === this || Boolean(child?.parent && this.contains(child.parent))
    },
  })
  for (const locale of ['en', 'ru']) {
    const outer = element('article')
    const report = element('section', { 'data-personal-result-report': '' }, outer)
    const score = element('article', {}, report)
    const banner = element('aside', { 'data-free-course-banner': '' }, report)
    const link = element('a', { href: '/' + locale + '/app/course?program=stress' }, banner)
    const valid = collect([link])
    assert.equal(link.closest('article'), outer)
    assert.equal(valid[0].insideScore, false)
    check(valid, locale)
    assert.throws(() => check([{ ...valid[0], insideScore: Boolean(link.closest('article')) }], locale), /outside scored articles/)
    for (const suffix of ['', '?from=asrs-score', '#practice']) {
      const badLink = element('a', { href: '/' + locale + '/app/course' + suffix }, score)
      assert.equal(collect([badLink])[0].insideScore, true)
      assert.throws(() => check(collect([link, badLink]), locale), /single optional banner/)
    }
    const nestedBanner = element('aside', { 'data-free-course-banner': '' }, score)
    const nestedLink = element('a', { href: '/' + locale + '/app/course?program=stress' }, nestedBanner)
    assert.throws(() => check(collect([nestedLink]), locale), /outside scored articles/)
    const footerLink = element('a', { href: '/' + locale + '/app/course?program=stress' }, report)
    assert.throws(() => check(collect([footerLink]), locale), /score-derived course recommendation/)
  }
})
