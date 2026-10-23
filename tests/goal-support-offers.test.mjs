import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = read('components/goal-support-offers.tsx')
const css = read('components/goal-support-offers.module.css')
const page = read('app/[locale]/explore/[theme]/page.tsx')
const jsx = (type, props) => ({ type, props: props || {} })
const nodes = tree => !tree || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
const modules = {
  'react/jsx-runtime': { jsx, jsxs: jsx },
  'next/link': { __esModule: true, default: 'Link' },
  'next/image': { __esModule: true, default: 'Image' },
  'lucide-react': new Proxy({}, { get: (_, name) => String(name) }),
  './goal-support-offers.module.css': { __esModule: true, default: new Proxy({}, { get: (_, name) => String(name) }) },
}
const transpiled = ts.transpileModule(source, {
  fileName: 'goal-support-offers.tsx',
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText
const exports = {}
runInNewContext(transpiled, { exports, require: name => {
  assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`)
  return modules[name]
} })

test('all three directions have two visible localized goal-support cards linked to existing services', () => {
  for (const locale of ['en','ru','es']) {
    for (const direction of ['energy','love','business']) {
      const tree = exports.GoalSupportOffers({ locale, direction })
      const section = nodes(tree).find(node => node.type === 'section' && node.props['data-goal-support-offers'])
      assert.equal(section.props['data-goal-support-theme'], direction)
      assert.ok(nodes(tree).some(node => node.type === 'h2'))
      const cards = nodes(tree).filter(node => node.type === 'article' && node.props['data-goal-support-card'])
      assert.deepEqual(cards.map(card => card.props['data-goal-support-card']), ['energy','alchemy'])
      const actions = nodes(tree).filter(node => node.props['data-goal-support-action'])
      assert.deepEqual(actions.map(action => action.props.href), [
        `/${locale}/services/remote-energy-support`,
        `/${locale}/services/alchemy-of-soul`,
      ])
      assert.ok(actions.every(action => action.props.prefetch === false))
      assert.ok(actions.every(action => nodes(action).some(node => node.type === 'ArrowRight')))
      assert.ok(cards.every(card => nodes(card).some(node => node.type === 'Image' && node.props.alt === '')))
      assert.ok(cards.every(card => nodes(card).some(node => node.type === 'h3')))
    }
  }
})

test('cards sit at the bottom of Energy, Love and Business; not on unrelated pages', () => {
  assert.match(page, /\['energy','love','business'\]\.includes\(theme\)/)
  assert.match(page, /<DirectionOffers[^>]+\/>\s*<GoalSupportOffers[^>]+\/>\s*<DirectionExtras/)
  assert.match(page, /import \{ GoalSupportOffers \} from '@\/components\/goal-support-offers'/)
  assert.match(read('app/[locale]/services/remote-energy-support/page.tsx'), /RemoteEnergySupportBooking/)
  assert.match(read('app/[locale]/services/alchemy-of-soul/page.tsx'), /AlchemySoulLanding/)
  assert.doesNotMatch(source, /fetch\(|sendBeacon|localStorage|sessionStorage|https?:\/\//)
})

test('image-left cards are responsive to narrow phones and CTAs remain accessible', () => {
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(css, /@media\(max-width:350px\)/)
  assert.match(css, /grid-template-columns:78px minmax\(0,1fr\)/)
  assert.match(css, /min-height:44px/)
  assert.match(css, /:focus-visible/)
  assert.match(source, /fill loading="lazy"/)
})

test('goal copy has explicit non-guarantee and homeopathy evidence limits', () => {
  assert.match(source, /not guaranteed/)
  assert.match(source, /не гарантированы/)
  assert.match(source, /no reliable evidence/)
  assert.match(source, /без доказанной лечебной эффективности/)
})
