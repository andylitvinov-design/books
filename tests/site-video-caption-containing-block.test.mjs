import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildAboutCaptionFixture, readAboutCaptionFixtureSources, verifyAboutVideoCaptionLayout } from '../scripts/verify-about-video-caption-layout.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const sources = readAboutCaptionFixtureSources()
const fixture = buildAboutCaptionFixture(sources)
const expectedNames = ['Anonymous clip 01', 'Anonymous clip 02', 'Anonymous clip 03', 'Anonymous clip 04', 'Anonymous clip 05',
  'Anonymous clip 06', 'Anonymous clip 07', 'Anonymous clip 08', 'Anonymous clip 09', 'Anonymous clip 10']
const unwrap = css => css.replace(/:global\(([^()]*)\)/g, '$1')

test('only the minimal caption receives a containing block; the absolute accessible title and normal-flow rules stay intact', () => {
  const rule = sources.minimal.match(/\.minimal :global\(\.site-video-caption\) \{([^}]*)\}/)?.[1]
  assert.ok(rule)
  assert.equal((rule.match(/position\s*:\s*relative\s*;/g) ?? []).length, 1)
  assert.match(rule, /display:\s*grid;/)
  assert.match(rule, /grid-template-columns:\s*minmax\(0, 1fr\) auto;/)
  assert.match(rule, /padding:\s*0 2px;/)
  assert.ok(!/overflow|width\s*:|transform|contain\s*:|z-index|inset|display:\s*none/.test(rule))
  const titleRule = sources.minimal.match(/\.accessibleTitle \{([^}]*)\}/)?.[1]
  assert.match(titleRule, /position:\s*absolute;/)
  assert.match(titleRule, /width:\s*1px;/); assert.match(titleRule, /height:\s*1px;/)
  assert.match(titleRule, /clip:\s*rect\(0, 0, 0, 0\);/)
  assert.match(titleRule, /clip-path:\s*inset\(50%\);/)
  assert.ok(!/display:\s*none|visibility:\s*hidden/.test(titleRule))
  const frame = sources.shared.match(/\.site-video-frame \{([^}]*)\}/)?.[1]
  assert.match(frame, /position:\s*relative;/)
  const component = read('components/site-video-player.tsx')
  assert.match(component, /<figure[^\n]+aria-labelledby=\{titleId\}/)
  assert.match(component, /<div className="site-video-frame">/)
  const minimalBranch = component.slice(component.indexOf('{minimal ? ('), component.indexOf(') : (', component.indexOf('{minimal ? (')))
  assert.match(minimalBranch, /<figcaption className="site-video-caption">\s*<span className=\{styles\.accessibleTitle\} id=\{titleId\} lang=\{textLanguage\}>\{video\.title\}<\/span>/)
  assert.ok(!minimalBranch.includes('className="site-video-frame"'), 'The existing relative frame is a sibling, never the title ancestor')
})

test('anonymous counterfactual uses complete actual allowed CSS with just module-selector unwrapping and one declaration removed', () => {
  assert.deepEqual(Object.keys(sources).sort(), ['gallery', 'minimal', 'shared'])
  assert.equal(sources.minimal, read('components/site-video-minimal.module.css'))
  assert.equal(sources.gallery, read('components/personal-testimonials.module.css'))
  assert.equal(sources.shared, read('app/site-videos.css'))
  assert.equal(fixture.baselineMinimal, sources.minimal.replace('.minimal :global(.site-video-caption) {\n  position: relative;\n', '.minimal :global(.site-video-caption) {\n'))
  assert.notEqual(fixture.baselineMinimal, sources.minimal)
  assert.equal(fixture.finalCSS.replace(unwrap(sources.minimal), unwrap(fixture.baselineMinimal)), fixture.baselineCSS)
  for (const css of [fixture.baselineCSS, fixture.finalCSS]) {
    assert.ok(css.includes(unwrap(sources.gallery))); assert.ok(css.includes(unwrap(sources.shared)))
    assert.ok(!css.includes(':global(')); assert.ok(!/url\s*\(|@import|@font-face/i.test(css))
    assert.ok(css.startsWith('html,body{margin:0;padding:0}*,*::before,*::after{box-sizing:border-box}\n'))
  }
  assert.match(sources.gallery, /data-personal-testimonials="about"[\s\S]*?\.videoGrid\{[\s\S]*?overflow-x:auto/)
  assert.match(sources.gallery, /\.videoItem \{ min-width: 0; \}/)
})

test('fixture has ten unique synthetic accessible-name bindings and no images, scripts, navigation, clients or media', () => {
  assert.deepEqual(fixture.names, expectedNames)
  assert.equal((fixture.html.match(/data-anonymous-card/g) ?? []).length, 10)
  assert.equal((fixture.html.match(/<figure /g) ?? []).length, 10)
  assert.equal((fixture.html.match(/<button /g) ?? []).length, 10)
  const ids = [...fixture.html.matchAll(/id="(anonymous-title-\d+)"/g)].map(match => match[1])
  const labels = [...fixture.html.matchAll(/aria-labelledby="(anonymous-title-\d+)"/g)].map(match => match[1])
  assert.deepEqual(ids, Array.from({ length: 10 }, (_, index) => `anonymous-title-${index + 1}`))
  assert.deepEqual(labels, ids); assert.equal(new Set(ids).size, 10)
  for (const [index, name] of expectedNames.entries()) {
    assert.ok(fixture.html.includes(`aria-label="Play ${name}"`))
    assert.ok(fixture.html.includes(`id="anonymous-title-${index + 1}" lang="${index < 6 ? 'en' : 'ru'}">${name}</span>`))
  }
  assert.ok(!/<(?:iframe|video|audio|img|source|script|link|a)\b|\b(?:src|href)=|https?:/i.test(fixture.html))
  for (const directive of ["default-src 'none'", "connect-src 'none'", "img-src 'none'", "font-src 'none'", "frame-src 'none'", "script-src 'none'"]) assert.ok(fixture.html.includes(directive))
})

test('fixture refuses missing/duplicate fixes, extra baseline position rules, remote CSS and unsupported module syntax', () => {
  assert.throws(() => buildAboutCaptionFixture({ ...sources, minimal: fixture.baselineMinimal }))
  assert.throws(() => buildAboutCaptionFixture({ ...sources, minimal: sources.minimal + sources.minimal }))
  assert.throws(() => buildAboutCaptionFixture({ ...sources, minimal: sources.minimal.replace('  position: relative;\n  display: grid;', '  position: relative;\n  position: absolute;\n  display: grid;') }))
  for (const suffix of ['\n.x{background:url(https://synthetic.invalid/a)}', '\n@import "synthetic.css";', '\n@font-face{font-family:x}', '\n:global(:is(.a,.b)){color:red}']) {
    assert.throws(() => buildAboutCaptionFixture({ ...sources, gallery: sources.gallery + suffix }))
  }
})

// This is a driver/oracle model, NOT a browser layout or accessibility proof.
function driverModel(fault) {
  let width = 1365, contained = false, handler, closed = 0, contexts = 0, assets = 0, styles = 0, names = 0
  const locator = selector => {
    if (selector === 'iframe,video,audio,img,source,script,link,a') return { count: async () => assets }
    assert.equal(selector, 'figure.site-video-player')
    return { count: async () => 10, nth(index) { return { index, button: false, locator(selector) { assert.equal(selector, 'button'); return { index, button: true } } } } }
  }
  const context = {
    async route(pattern, value) { assert.equal(pattern, '**/*'); handler = value },
    async newPage() { return {
      async setViewportSize(value) { assert.equal(value.height, 900); width = value.width },
      async setContent(html, options) { assert.equal(html, fixture.html); assert.equal(options.waitUntil, 'domcontentloaded') },
      async addStyleTag({ content }) {
        styles++; assert.ok(content === fixture.baselineCSS || content === fixture.finalCSS)
        contained = content === fixture.finalCSS
        if (fault === 'request') await handler({ abort: async () => {} })
      }, locator,
      async evaluate(fn) {
        assert.equal(typeof fn, 'function')
        const failContained = contained && fault === 'title-ancestor'
        return { viewport: width,
          document: contained ? (fault === 'still-overflow' ? width + 500 : width) : fault === 'baseline-does-not-reproduce' ? width : width + 1700,
          rowClient: width - 100 + (contained && fault === 'sizing-change' ? 10 : 0), rowScroll: 3500, rowOverflow: 'auto',
          normalFlow: Array.from({ length: 10 }, (_, index) => [index, 20, contained && fault === 'flow-change' ? 310 : 300, 200]),
          titleContainedByCaption: Array(10).fill(contained && !failContained),
          captionPositions: Array(10).fill(contained ? 'relative' : 'static'), framePositions: Array(10).fill('relative'),
          cardPositions: Array(10).fill(fault === 'broad-card-fix' ? 'relative' : 'static') }
      },
    } },
    async close() { closed++ },
  }
  const browser = { async newContext(options) {
    contexts++; assert.deepEqual(options, { viewport: { width: 1365, height: 900 }, serviceWorkers: 'block' }); return context
  } }
  const expect = target => ({ async toHaveAccessibleName(name) {
    names++; assert.equal(name, (target.button ? 'Play ' : '') + expectedNames[target.index])
    if (fault === 'accessible-name') throw new Error('Synthetic accessible-name failure')
  } })
  return { browser, expect, get counters() { return { closed, contexts, styles, names } } }
}

test('native driver model requires both counterfactuals, exact names and unchanged normal flow at both widths', async () => {
  const model = driverModel()
  const modeled = []
  await verifyAboutVideoCaptionLayout(model.browser, model.expect, value => modeled.push(value))
  assert.deepEqual(model.counters, { closed: 1, contexts: 1, styles: 4, names: 80 })
  assert.deepEqual(modeled.map(value => value.width), [1365, 390])
})

test('native driver model fails closed on nonreproduction, continued overflow, renamed content, reflow, sizing changes or any request', async () => {
  for (const fault of ['baseline-does-not-reproduce', 'still-overflow', 'title-ancestor', 'flow-change', 'sizing-change', 'broad-card-fix', 'accessible-name', 'request']) {
    const model = driverModel(fault)
    await assert.rejects(verifyAboutVideoCaptionLayout(model.browser, model.expect, () => {}))
    assert.equal(model.counters.closed, 1)
  }
})

test('hosted integration reuses the already-created engine and leaves the actual About overflow gate unchanged', () => {
  const verifier = read('scripts/verify-site-video-browser.mjs')
  const helper = read('scripts/verify-about-video-caption-layout.mjs')
  assert.ok(verifier.includes("import { verifyAboutVideoCaptionLayout } from './verify-about-video-caption-layout.mjs'"))
  assert.equal(verifier.split('await verifyAboutVideoCaptionLayout(browser, expect)').length - 1, 1)
  assert.ok(verifier.indexOf('await verifyAboutVideoCaptionLayout(browser, expect)') > verifier.indexOf('browser = await chromium.launch({ headless: true })'))
  assert.equal(verifier.split('assert.ok(sizes.document <= sizes.viewport + 2, `Overflow on ${path}: ${JSON.stringify(sizes)}`)').length - 1, 1)
  assert.ok(verifier.includes('for (const width of [1365, 390]) {\n    await page.setViewportSize({ width, height: 900 })\n    for (const path of paths) {\n      await navigate(path)'))
  assert.ok(helper.includes("context.route('**/*', route => { requests++; return route.abort() })"))
  assert.ok(!/\.launch\(|\.goto\(|\.click\(|\.play\(|--no-sandbox|disable-web-security|child_process|fetch\(/.test(helper))
  assert.equal((helper.match(/readFileSync\(new URL\(/g) ?? []).length, 3)
})
