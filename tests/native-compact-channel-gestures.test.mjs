import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { extractCompactChannelGestureEffect, nativeCompactChannelFixture, nativePublicCollectionFixture } from '../scripts/helpers/native-compact-channel-gestures.mjs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('native acceptance extracts the actual current typed component effect and fails closed', () => {
  const component = read('components/mobile-bottom-navigation.tsx')
  const effect = extractCompactChannelGestureEffect(component)
  assert.match(effect, /element.style.setProperty\('pointer-events', 'none'\)/)
  assert.match(effect, /window.setTimeout\(/)
  assert.doesNotMatch(effect, /useEffect|HTMLButtonElement|PointerEvent|number \| null/)
  assert.throws(() => extractCompactChannelGestureEffect(''))
  assert.throws(() => extractCompactChannelGestureEffect(component + component))
  assert.throws(() => extractCompactChannelGestureEffect(component.replaceAll('}, [hidden, locale]);', '}, []);')))
})
test('native fixture uses real mouse/touch/keyboard input and blocks all network without changing existing app acceptance', () => {
  const helper = read('scripts/helpers/native-compact-channel-gestures.mjs')
  assert.match(helper, /assertDaoVerifierBoundary\(origin\)/)
  assert.match(helper, /hasTouch: true/)
  assert.match(helper, /isMobile: true, serviceWorkers: 'block'/)
  assert.match(helper, /context.route\('\*\*\/\*', async route => \{ blockedRequests\+\+; await route.abort\('blockedbyclient'\) \}\)/)
  assert.match(helper, /page.touchscreen.tap\(112, 795\)/)
  assert.match(helper, /page.mouse.down\(\)/)
  assert.match(helper, /page.mouse.up\(\)/)
  assert.match(helper, /page.keyboard.press\('Space'\)/)
  assert.match(helper, /event.isTrusted/)
  assert.match(helper, /'disable-on-release', 'detach-on-release'/)
  assert.ok(helper.indexOf("' releases inline dock hold'") < helper.indexOf('Only after proving'))
  assert.match(helper, /assert.equal\(blockedRequests, 0/)
  assert.match(helper, /finally \{ await context.close\(\) \}/)
  assert.doesNotMatch(helper, /dispatchEvent|\.click\(|\.blur\(|force:\s*true|waitForTimeout|test.skip|fetch\(/)
  assert.doesNotMatch(nativeCompactChannelFixture, /https?:|src=|href=|<script/)
  assert.match(nativeCompactChannelFixture, /top:770.9px;width:157px;height:49px/)
  assert.match(nativeCompactChannelFixture, /bottom:0;height:69px/)
  const app = read('scripts/verify-app-r1.mjs')
  const mainStart = app.indexOf('\ntry {\n')
  const servicesStart = app.indexOf(' await verifyPublicServiceConversionJourneys()', mainStart)
  assert.ok(mainStart >= 0 && servicesStart > mainStart)
  assert.equal(app.slice(mainStart, servicesStart), "\ntry {\n coreStageEvidence.mark('gestures')\n await assertNativeCompactChannelGestures(browser,expect,{origin})\n passed('native compact channel mouse/touch gestures and navigation restoration without network')\n // Preserve the anonymous OPORA deep link, explicit consent boundary, and\n // all seven-skill/14-day checks through its real full-programme link.\n coreStageEvidence.mark('opora')\n await verifyOporaPublicEntry(page,expect,{origin,screenshotEvidence,output,diagnosticSink:coreStageEvidence.opora})\n coreStageEvidence.mark('opora-viewport-reset')\n await page.setViewportSize({width:390,height:844})\n passed('anonymous EN/RU OPORA invitation and linked programme expose seven skills and all 14 days without account access')\n\n coreStageEvidence.mark('services')\n")
  assert.match(app, /await assertDaoFreeEntryCapture\(servicePage,expect,\{origin,locale,/)
})

test('native final counts are checked after restoration, optional Tab, effect cleanup and final CSS checks', () => {
  const helper = read('scripts/helpers/native-compact-channel-gestures.mjs')
  const restored = helper.indexOf("' releases inline dock hold'")
  const tab = helper.indexOf("await page.keyboard.press('Tab')", restored)
  const cleanup = helper.indexOf('await page.evaluate(() => { window.__nativeDockCleanup(); delete window.__nativeDockCleanup })')
  const visible = helper.indexOf("await expect(page.locator('nav')).toBeVisible()", cleanup)
  const visibility = helper.indexOf("await expect(page.locator('nav')).toHaveCSS('visibility', 'visible')", visible)
  const pointerEvents = helper.indexOf("await expect(page.locator('nav')).toHaveCSS('pointer-events', 'auto')", visibility)
  const finalCounts = helper.indexOf('assert.deepEqual(await page.evaluate(() => window.__nativeDockCounts),')
  const close = helper.indexOf('await page.close()', finalCounts)
  assert.ok(restored >= 0 && tab > restored && cleanup > tab && visible > cleanup
    && visibility > visible && pointerEvents > visibility && finalCounts > pointerEvents && close > finalCounts)
  assert.match(helper, /assert\.deepEqual\(await page\.evaluate\(\(\) => window\.__nativeDockCounts\),\s*\{ clicks: wanted, trustedClicks: wanted \}, kind \+ ' final native activation count after cleanup'\)/)
  assert.doesNotMatch(helper, /waitForTimeout|setTimeout|dispatchEvent|\.click\(|\.blur\(|force:\s*true/)
})


function publicNativeContract(helper) {
  const start = helper.indexOf('async function assertNativePublicCollectionGestures(')
  assert.ok(start > 0)
  const body = helper.slice(start)
  const fill = body.indexOf("await search.fill('amor')")
  const focused = body.indexOf('await expect(search).toBeFocused()', fill)
  const hit = body.indexOf('document.elementFromPoint(106.75, 791.5)', focused)
  const gesture = body.indexOf("if (kind.startsWith('touch'))", hit)
  const restored = body.indexOf("' public collection releases inline dock hold'", gesture)
  const tab = body.indexOf("await page.keyboard.press('Tab')", restored)
  const cleanup = body.indexOf('window.__nativePickerDockCleanup(); delete window.__nativePickerDockCleanup', tab)
  const css = body.indexOf("toHaveCSS('pointer-events', 'auto')", cleanup)
  const countStart = body.indexOf('        assert.deepEqual(await page.evaluate(() => window.__nativePickerDockCounts),', css)
  const countEndMarker = "kind + ' final public collection native activation count after cleanup')"
  const countEnd = body.indexOf(countEndMarker, countStart)
  const close = body.indexOf('await page.close()', countEnd)
  assert.ok(fill > 0 && focused > fill && hit > focused && gesture > hit && restored > gesture && tab > restored && cleanup > tab && css > cleanup && countStart > css && countEnd > countStart && close > countEnd)
  const countBlock = body.slice(countStart, countEnd + countEndMarker.length)
  assert.match(countBlock, /\{ clicks: wanted, trustedClicks: wanted \}/)
  return { body, countBlock }
}

test('public collection native regression uses actual picker selectors, measured overlap and real input after prior seventeen cases', () => {
  const helper = read('scripts/helpers/native-compact-channel-gestures.mjs')
  const { body } = publicNativeContract(helper)
  assert.ok(helper.indexOf('await assertNativeCompactConsentLayout(browser, expect, { origin })') < helper.indexOf('await assertNativePublicCollectionGestures(browser, expect, effect)'))
  assert.match(body, /isMobile: false, serviceWorkers: 'block'/)
  assert.match(body, /context.route\('\*\*\/\*', async route => \{ blockedRequests\+\+; await route.abort\('blockedbyclient'\) \}\)/)
  for (const control of ['page.touchscreen.tap(106.75, 791.5)', 'page.mouse.down()', 'page.mouse.up()', "page.keyboard.press('Space')", 'event.isTrusted', 'assert.deepEqual(errors, []', 'assert.equal(blockedRequests, 0']) assert.ok(body.includes(control), control)
  for (const kind of ['mouse', 'touch', 'mouse-outside', 'keyboard', 'cleanup-during-press', 'disable-on-release', 'detach-on-release', 'touch-disable-on-release', 'touch-detach-on-release']) assert.ok(body.includes("'" + kind + "'"))
  assert.doesNotMatch(body, /force:\s*true|dispatchEvent|\.click\(|\.focus\(|\.blur\(|scrollTo|scrollIntoView|waitForTimeout|\.value\s*=|test.skip|fetch\(/)
  assert.doesNotMatch(nativePublicCollectionFixture, /https?:|src=|href=|<script/)
  assert.match(nativePublicCollectionFixture, /left:22px;top:763.5px;width:169.5px;height:56px/)
  assert.match(nativePublicCollectionFixture, /bottom:0;height:69px/)
  assert.ok(nativePublicCollectionFixture.indexOf('</form>') < nativePublicCollectionFixture.indexOf('<button'))
  const picker = read('components/app/simple-test-picker.jsx')
  assert.match(picker, /data-prelogin-test-picker data-public-test-picker=\{!authenticated \? 'true' : undefined\}/)
  assert.match(picker, /<input id="hh-test-hero-search"[^>]*type="search"/)
  assert.match(picker, /<button key=\{collection.id\} type="button"[^>]*[\s\S]*?data-test-collection=\{collection.id\}/)
})

test('public native final-count contract rejects removed or prematurely moved assertions', () => {
  const helper = read('scripts/helpers/native-compact-channel-gestures.mjs'), { countBlock } = publicNativeContract(helper)
  assert.throws(() => publicNativeContract(helper.replace(countBlock, '')), { code: 'ERR_ASSERTION' })
  const early = helper.replace(countBlock, '').replace("        await page.evaluate(() => { window.__nativePickerDockCleanup();", countBlock + "\n        await page.evaluate(() => { window.__nativePickerDockCleanup();")
  assert.notEqual(early, helper)
  assert.throws(() => publicNativeContract(early), { code: 'ERR_ASSERTION' })
})

test('actual public native final assertion rejects missing, duplicate and untrusted activations after teardown', async () => {
  const { countBlock } = publicNativeContract(read('scripts/helpers/native-compact-channel-gestures.mjs'))
  const execute = async (counts, wanted = 1) => {
    const page = { evaluate: async fn => JSON.parse(JSON.stringify(runInNewContext('(' + fn.toString() + ')()', { window: { __nativePickerDockCounts: counts } }))) }
    return new Function('assert', 'page', 'wanted', 'kind', 'return(async()=>{' + countBlock + '})()')(assert, page, wanted, 'synthetic-public-native-count')
  }
  await execute({ clicks: 1, trustedClicks: 1 }); await execute({ clicks: 0, trustedClicks: 0 }, 0)
  for (const counts of [{ clicks: 0, trustedClicks: 0 }, { clicks: 2, trustedClicks: 2 }, { clicks: 1, trustedClicks: 0 }]) await assert.rejects(execute(counts), { code: 'ERR_ASSERTION' })
  await assert.rejects(execute({ clicks: 1, trustedClicks: 1 }, 0), { code: 'ERR_ASSERTION' })
})
