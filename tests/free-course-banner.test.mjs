import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { URL } from 'node:url'
import test from 'node:test'
import ts from 'typescript'

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
    assert.equal(links[0].props.href, '/' + locale + '/app/course')
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
    assert.equal(elements(tree).find(node => node.type === Link).props.href, '/en/app/course')
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
  assert.equal((report.match(/<FreeCourseBanner locale=\{locale\}\/>/g) || []).length, 1)
  assert.ok(report.indexOf('<FreeCourseBanner') > report.indexOf('{report.rulesVersion}'))
  assert.doesNotMatch(report, /hasSkills|skillAxes/)
  assert.match(report, /getTestScaleGuide\(result\.definitionKey, locale\)/)
  assert.match(report, /<ScoreGauge dimension=\{dimension\} locale=\{locale\}/)
  assert.match(report, /section\.steps\.slice\(0, 2\)/)
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
    require: name => name === './free-course-banner' ? { FreeCourseBanner }
      : name === './assessment-gauge' ? { ScoreGauge: () => null, ScoreTrend: () => null }
        : name.endsWith('/scale-guides') ? { getTestScaleGuide: () => null }
          : name.endsWith('/dashboard-gauges') ? { gaugeModel: () => null }
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
