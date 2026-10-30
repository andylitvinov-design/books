import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/direction-extras.tsx')
const css = read('components/direction-offers.module.css')
const route = read('app/[locale]/explore/[theme]/page.tsx')
const jsx = (type, props) => ({ type, props: props || {} })
const nodes = tree => !tree || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const modules = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { __esModule: true, default: 'Link' },
  '@/components/business-consultation-finder': { BusinessConsultationFinder: 'BusinessConsultationFinder' },
  '@/components/business-service-browser': { BusinessServiceBrowser: 'BusinessServiceBrowser' },
  'lucide-react': new Proxy({}, { get: (_, name) => String(name) }),
  './direction-offers.module.css': { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) },
}
const code = ts.transpileModule(source, {
  fileName: 'direction-extras.tsx',
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const exports = {}
runInNewContext(code, {
  exports, require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name] },
})

test('Energy, Love, Business disclose exactly two unique useful actions in each language', () => {
  for (const locale of ['en', 'ru', 'es']) {
    for (const direction of ['energy', 'love', 'business']) {
      const tree = exports.DirectionExtras({ locale, direction })
      const disclosures = nodes(tree).filter(node => node.type === 'details' && node.props['data-direction-more'])
      assert.equal(disclosures.length, 1)
      assert.equal(disclosures[0].props['data-direction-extra-for'], direction)
      const finder = nodes(tree).filter(node => node.type === 'BusinessConsultationFinder')
      const browser = nodes(tree).filter(node => node.type === 'BusinessServiceBrowser')
      assert.equal(finder.length, direction === 'business' ? 1 : 0)
      assert.equal(browser.length, direction === 'business' ? 1 : 0)
      if (direction === 'business') {
        assert.equal(finder[0].props.requestOnServicePage, true)
        assert.equal(browser[0].props.requestOnServicePage, true)
      }
      const summaries = nodes(tree).filter(node => node.type === 'summary')
      assert.equal(summaries.length, 1)
      assert.ok(typeof summaries[0].props.children[0] === 'string')
      const links = nodes(tree).filter(node => node.props?.['data-direction-extra'])
      assert.deepEqual(links.map(link => link.props['data-direction-extra']),
        ['written-review', direction === 'energy' ? 'remote-reiki' : direction === 'love' ? 'imagery' : 'mentoring'])
      assert.equal(links.length, 2)
      assert.equal(new Set(links.map(link => link.props.href)).size, 2)
      for (const link of links) {
        assert.ok(link.props.href.startsWith('/' + locale + '/services/'))
        assert.equal(link.props.prefetch, false)
        assert.doesNotMatch(link.props.href, /client\/tests|courses\/antistress|\/app\/business/)
        assert.ok(nodes(link).some(n => n.type === 'strong'), 'clear link title')
        assert.ok(nodes(link).some(n => n.type === 'small'), 'one-line guidance')
      }
    }
  }
})

test('alternative actions lead to existing consented journeys, not to new booking or CRM endpoints', () => {
  for (const locale of ['en','ru','es']) {
    const energy = nodes(exports.DirectionExtras({ locale, direction: 'energy' })).filter(n => n.props?.['data-direction-extra'])
    const love = nodes(exports.DirectionExtras({ locale, direction: 'love' })).filter(n => n.props?.['data-direction-extra'])
    const business = nodes(exports.DirectionExtras({ locale, direction: 'business' })).filter(n => n.props?.['data-direction-extra'])
    assert.equal(energy[1].props.href, '/' + locale + '/services/remote-energy-support')
    assert.equal(love[1].props.href, '/' + locale + '/services/imagery-therapy')
    assert.equal(business[0].props.href, '/' + locale + '/services/free-situation-review?topic=business')
    assert.equal(business[1].props.href, '/' + locale + '/services/business-consulting?businessFormat=mentoring#business-direct-request')
    assert.ok(energy[0].props.href.endsWith('/services/free-situation-review'))
    assert.ok(love[0].props.href.endsWith('/services/free-situation-review'))
  }
  assert.doesNotMatch(source, /fetch\(|sendBeacon|localStorage|sessionStorage|BusinessWebsiteEnquiry|TopicJourneySelector/)
  assert.match(route, /<DirectionExtras locale=\{locale as PublicLocale\}/)
  assert.doesNotMatch(route, /<details className=\{directionStyles\.disclosure\}/)
  assert.match(route, /: <>\s*<TopicJourneySelector/, 'legacy non-directional pages remain available')
})

test('mobile disclosure is compact, keyboard accessible and does not overflow 320px screens', () => {
  assert.match(css, /\.disclosure>summary:focus-visible/)
  assert.match(css, /\.extraLink:focus-visible/)
  assert.match(css, /\.extraGrid\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css, /@media\(max-width:600px\)\{[\s\S]*?\.extraGrid\{grid-template-columns:1fr/)
  assert.match(css, /\.disclosure>summary\{[^}]*min-height:42px/)
  assert.match(css, /\.extraLink\{[^}]*min-width:0/)
  assert.match(css, /prefers-reduced-motion:reduce/)
  assert.doesNotMatch(source, /<img|<Image|new table|autoPlay/)
})
