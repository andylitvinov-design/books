import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PORTRAIT_SECTORS } from '../lib/assessments/portrait-sectors.js'

const css = readFileSync(new URL('../components/app/test-explorer.module.css', import.meta.url), 'utf8')
const visual = readFileSync(new URL('../components/app/test-explorer-visual.jsx', import.meta.url), 'utf8')
const reports = readFileSync(new URL('../components/app/app-workspace.jsx', import.meta.url), 'utf8')
const mobile = css.slice(css.indexOf('/* Reports portrait: make the source-backed diagram the first-screen focus.'))
const scoped = ':global(.hh-app) :global(.hh-insights-portrait) .visual:not(.visualCompact)'

test('only private Reports enlarges the coupled original photo and 360:390 SVG', () => {
  assert.ok(mobile.startsWith('/* Reports portrait:'))
  assert.match(mobile, /@media\(max-width:620px\)/)
  assert.ok(mobile.includes(scoped))
  assert.match(mobile, /width:min\(100%,clamp\(290px,43svh,390px\)\)/)
  assert.match(mobile, /aspect-ratio:360 \/ 390/)
  assert.match(mobile, /height:220%!important/)
  assert.match(mobile, /transform:translate\(-80%,-50%\)/)
  assert.ok(!mobile.includes('31.38svh'))
  assert.ok(!mobile.includes('data-summary-test-score'))
})

test('same four original sector keys now express four life directions, with compact mobile names', () => {
  assert.deepEqual(PORTRAIT_SECTORS.map(s => s.key), ['body','work','relationships','growth'])
  assert.deepEqual(PORTRAIT_SECTORS.map(s => s.label.en), [
    'Body / Health / Energy','Work / Business / Money','Relationships','Personality / Values / Growth',
  ])
  for (const sector of PORTRAIT_SECTORS) {
    for (const locale of ['en','ru','es']) {
      assert.ok(sector.label[locale])
      assert.ok(sector.shortLabel[locale])
      assert.ok(sector.radarLabel[locale])
    }
  }
  assert.match(visual, /aria-label=\{sector\.label\[locale\] \|\| sector\.label\.en\}/)
  assert.match(visual, /className=\{styles\.portraitSectorShort\} aria-hidden="true"/)
  assert.match(mobile, /\.portraitSectorShort\{display:block\}/)
  assert.match(mobile, /\.portraitSectorLong\{display:none\}/)
})

test('mobile portrait is the dominant image with tappable top filters and lower actions', () => {
  assert.match(mobile, /min-height:52px/)
  assert.match(mobile, /overflow-wrap:anywhere/)
  assert.match(mobile, /:global\(\.hh-portrait-quick-actions\)[^\n]*> :global\(button\)\{/)
  const action = mobile.slice(mobile.indexOf('> :global(button){'))
  assert.match(action, /min-height:52px/)
  assert.match(action, /flex-direction:row/)
  for (const width of [320,390,430]) {
    for (const height of [550,768,844,932]) {
      const stageWidth = Math.min(width - 24, Math.max(290, Math.min(390, .43 * height)))
      const stageHeight = stageWidth * 390 / 360
      assert.ok(stageWidth > 262, `${width}x${height}: must exceed previous shrunken image`)
      const menusAndImage = 52 + stageHeight + 52 + 18
      assert.ok(menusAndImage < Math.max(510, height - 100), `${width}x${height}: chart/menus too tall`)
    }
  }
})

test('portrait is first in Reports; personal layers and development stay below it', () => {
  const section = reports.slice(reports.indexOf('data-testid="completed-test-insights"'))
  const first = section.indexOf('data-testid="insights-psychological-portrait"')
  const program = section.indexOf('<DevelopmentProgram accountId={accountId}')
  const layers = section.indexOf('<UnifiedProfileLayers data={data} locale={locale}')
  assert.ok(first >= 0 && program > first && layers > program)
  assert.match(visual, /data-summary-test-score=\{ray\.key\}/)
})

test('desktop and public explorer retain the existing portrait geometry', () => {
  const desktop = css.slice(0, css.indexOf('/* Reports portrait:'))
  assert.match(desktop, /\.visual:not\(\.visualCompact\) \.modelStage:has\(\.portraitRadar\)\{[\s\S]*?aspect-ratio:360 \/ 390/)
  assert.match(desktop, /\.portraitSource\{/)
  assert.match(desktop, /\.visualCompact \.modelStage/)
})
