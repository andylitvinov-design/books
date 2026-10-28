import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const css = read('app/[locale]/holistic-support/holistic-support.module.css')
const chooser = read('components/holistic-support-choices.tsx')
const browser = read('scripts/verify-holistic-support-browser.mjs')

function assertCompactContract(source) {
  const marker = '@media(max-width:350px) and (max-height:600px){'
  const start = source.indexOf(marker)
  assert.ok(start >= 0, 'Scope only the short narrow viewport')
  let depth = 1, end = start + marker.length
  for (; end < source.length && depth; end++) {
    if (source[end] === '{') depth++
    if (source[end] === '}') depth--
  }
  const compact = source.slice(start + marker.length, end - 1)
  assert.match(compact, /\.journeyChoice\{[^}]*min-height:80px;[^}]*padding:6px/)
  assert.match(compact, /\.journeyChoicePhoto\{width:66px;height:66px\}/)
  assert.equal(66 + 2 * 6 + 2, 80, 'Intrinsic photo, padding and border fit the preserved minimum')
  assert.match(compact, /\.journeyChoiceIcon\{position:absolute;/, 'Decorative icon no longer adds a stacked text row')
  assert.match(compact, /\.journeyLead\{order:1;margin:8px 0 0\}/, 'Explanation is retained after the controls')
  assert.match(compact, /\.journeyContent\{display:flex;flex-direction:column;/)
  assert.doesNotMatch(compact, /display:none|visibility:hidden|overflow:hidden|line-clamp|max-height:/, 'Do not hide or clip content')
  assert.doesNotMatch(compact, /journeyChoiceText (?:strong|small)\{[^}]*font-size/, 'Keep current readable option fonts')
}

test('short-viewport sizing fixes intrinsic card height without deleting content', () => {
  assertCompactContract(css)
  for (const choice of ['meditations', 'energy', 'dao']) {
    assert.equal((chooser.match(new RegExp('data-holistic-choose="' + choice + '"', 'g')) || []).length, 1)
  }
  assert.match(chooser, /<p className=\{styles\.journeyLead\}>\{t\.lead\}<\/p>/)
  assert.match(chooser, /className=\{styles\.journeyChoicePhoto\}/)
  assert.match(css, /\.journeyChoice:focus-visible\{outline:3px solid/)
})

test('negative controls reject lowering targets, hiding lead, or removing narrow-height scope', () => {
  for (const changed of [
    css.replace('min-height:80px;padding:6px', 'min-height:79px;padding:6px'),
    css.replace('.journeyLead{order:1;margin:8px 0 0}', '.journeyLead{display:none}'),
    css.replace('@media(max-width:350px) and (max-height:600px){', '@media(max-width:700px){'),
    css.replace('.journeyChoicePhoto{width:66px;height:66px}', '.journeyChoicePhoto{width:66px;height:76px}'),
  ]) assert.throws(() => assertCompactContract(changed))
})

test('browser acceptance retains thresholds and adds all short-viewport locales plus overlap diagnostics', () => {
  assert.match(browser, /bounds\.width > 200 && bounds\.height >= 80/)
  assert.match(browser, /last\.y \+ last\.height < height - 40/)
  assert.match(browser, /last\.y \+ last\.height <= bottomNavigation\.y - 2/)
  assert.match(browser, /for \(const locale of \["en", "ru", "es"\]\) await check\(webkit, locale, 320, 568\)/)
  assert.match(browser, /label \+ "-first-screen\.json"/)
})
