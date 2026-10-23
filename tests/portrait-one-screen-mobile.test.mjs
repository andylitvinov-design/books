import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../components/app/test-explorer.module.css', import.meta.url), 'utf8')
const mobile = css.slice(css.indexOf('/* Reports portrait: keep both green menus on one short iPhone screen.'))
const scoped = ':global(.hh-app) :global(.hh-insights-portrait) .visual:not(.visualCompact)'

test('only private Reports compresses the portrait between both green menus', () => {
  assert.ok(mobile.startsWith('/* Reports portrait:'))
  assert.match(mobile, /@media\(max-width:620px\)/)
  assert.ok(mobile.includes(scoped))
  assert.ok(mobile.includes('.modelStage:has(.portraitRadar)'))
  assert.match(mobile, /height:clamp\(248px,34svh,284px\)/)
  assert.match(mobile, /aspect-ratio:auto/)
  assert.match(mobile, /height:220%!important/)
  assert.match(mobile, /transform:translate\(-80%,-50%\)/)
  // Scoring, source values and links are not replaced by layout fixtures.
  assert.ok(!mobile.includes('data-summary-test-score'))
})

test('320–430px phones have touch-sized upper and lower menus on short screens', () => {
  const picker = mobile.slice(mobile.indexOf('.portraitSectorChip,'))
  assert.match(picker, /min-height:44px/)
  assert.match(picker, /overflow-wrap:anywhere/)
  assert.match(mobile, /:global\(\.hh-portrait-quick-actions\)[^\n]*> :global\(button\)\{/)
  const button = mobile.slice(mobile.indexOf('> :global(button){'))
  assert.match(button, /min-height:44px/)
  assert.match(button, /flex-direction:row/)
  for (const height of [550, 667, 768, 844, 932]) {
    const stage = Math.max(248, Math.min(.34 * height, 284))
    const estimatedMenusAndStage = 44 + stage + 44 + 19 // picker padding/gaps
    assert.ok(estimatedMenusAndStage <= 395,
      `portrait controls exceed compact mobile budget at ${height}px: ${estimatedMenusAndStage}`)
  }
})

test('desktop and other explorer views retain the original proportional portrait', () => {
  const desktop = css.slice(0, css.indexOf('/* Reports portrait:'))
  assert.match(desktop, /\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\)\{[\s\S]*?aspect-ratio:360 \/ 390/)
  assert.match(desktop, /\.portraitSource\{/)
  assert.match(desktop, /\.visualCompact \.modelStage/)
  assert.ok(mobile.indexOf(scoped) >= 0)
})
