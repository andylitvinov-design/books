import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import postcss from 'postcss'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const globalCss = read('app/globals.css')
const mobileCss = read('app/ia-v2.css')
const navigation = read('components/mobile-bottom-navigation.tsx')
function declaration(css, selector, property, media) {
  const found = []
  postcss.parse(css).walkRules(rule => {
    if (rule.selector !== selector || rule.parent.type !== 'atrule' || rule.parent.name !== 'media' || rule.parent.params !== media) return
    rule.walkDecls(property, value => found.push(value.value))
  })
  return found
}
function checkStyles(globalSource, mobileSource) {
  assert.deepEqual(declaration(globalSource, 'html', 'scroll-behavior', '(prefers-reduced-motion: reduce)'), ['auto'])
  assert.deepEqual(declaration(mobileSource, 'html:has(.ia222-bottom-navigation)', 'scroll-padding-bottom', '(max-width: 767px)'), ['var(--ia222-bottom-height, calc(76px + env(safe-area-inset-bottom)))'])
  assert.match(mobileSource, /body:has\(\.ia222-bottom-navigation\)\s*\{\s*padding-bottom: var\(--ia222-bottom-height,76px\) !important;/)
  assert.match(globalSource, /html\s*\{\s*@apply scroll-smooth;/, 'Normal-motion behavior remains unchanged')
}
function measure(source, height) {
  const body = new Map(), root = new Map()
  const match = source.match(/const measureHeight = \(\) => \{([\s\S]*?)\n    \};/)
  assert.ok(match, 'Actual nav measurement callback remains present')
  runInNewContext(match[1], { element: {getBoundingClientRect: () => ({height})}, document: {
    body: {style: {setProperty: (key, value) => body.set(key, value)}},
    documentElement: {style: {setProperty: (key, value) => root.set(key, value)}},
  }})
  assert.equal(body.get('--ia222-bottom-height'), height + 'px')
  assert.equal(root.get('--ia222-bottom-height'), height + 'px')
}
test('root scroller respects reduced motion and the measured safe-area navigation clearance', () => checkStyles(globalCss, mobileCss))
test('actual measurement shares every live nav height with root and keeps body space reservation', () => {
  for (const height of [0, 63, 97, 63.5]) measure(navigation, height)
  assert.equal((navigation.match(/document\.documentElement\.style\.removeProperty\('--ia222-bottom-height'\)/g) || []).length, 2)
  assert.equal((navigation.match(/document\.body\.style\.removeProperty\('--ia222-bottom-height'\)/g) || []).length, 2)
  assert.match(navigation, /observer\.observe\(element\)/)
  assert.match(navigation, /observer\.disconnect\(\)/)
})
for (const [name, globalSource, mobileSource] of [
  ['root preference ignored', globalCss.replace('html { scroll-behavior: auto; }', '.page { scroll-behavior: auto; }'), mobileCss],
  ['safe area removed', globalCss, mobileCss.replace('calc(76px + env(safe-area-inset-bottom))', '76px')],
  ['unmeasured padding', globalCss, mobileCss.replace('var(--ia222-bottom-height, calc(76px + env(safe-area-inset-bottom)))', '76px')],
  ['desktop rule leaked', globalCss, mobileCss.replace('(max-width: 767px) {\n  /* Reserve', '(max-width: 1200px) {\n  /* Reserve')],
]) test('scroll contract rejects ' + name, () => assert.throws(() => checkStyles(globalSource, mobileSource)))
test('measurement contract rejects missing root propagation', () => {
  assert.throws(() => measure(navigation.replace("document.documentElement.style.setProperty('--ia222-bottom-height', height);", ''), 97))
})
