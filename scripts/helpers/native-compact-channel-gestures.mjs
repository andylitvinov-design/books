import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { assertDaoVerifierBoundary } from './dao-free-entry-verifier.mjs'
import { assertNativeCompactConsentLayout } from './native-compact-consent-layout.mjs'

// Execute exactly the current component's self-contained gesture effect, not a
// separately maintained implementation. Fail closed if its extraction changes.
export function extractCompactChannelGestureEffect(source) {
  const marker = '  useEffect(() => {\n    // Keep the fixed dock from taking the release half'
  assert.equal(source.split(marker).length, 2, 'Exactly one native dock gesture effect')
  const start = source.indexOf(marker) + '  useEffect(() => {'.length
  const end = source.indexOf('\n  }, [hidden, locale]);', start)
  assert.ok(end > start, 'Native dock gesture effect has an explicit cleanup boundary')
  return stripTypeScriptTypes('(function(nav) {' + source.slice(start, end) + '\n})')
}

// No application, network, storage, DB or provider fixtures. The overlapping
// rectangles and focus-driven dock are the verified DAO failure geometry.
export const nativeCompactChannelFixture = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;width:100%;height:844px;font-family:sans-serif}
form{margin:0}input{position:absolute;left:34px;top:630px;width:280px;height:45px;font-size:16px}
button{position:absolute;left:34px;top:770.9px;width:157px;height:49px}
.mobile-bottom-navigation{position:fixed;z-index:20;left:0;right:0;bottom:0;height:69px;background:#eee}
body:has(input:focus) .mobile-bottom-navigation{display:none}
</style></head><body><form data-compact-lead-form>
<input name="contact" aria-label="Synthetic contact"><button type="button" data-compact-channel="whatsapp">Native channel</button>
</form><nav class="mobile-bottom-navigation" aria-label="Synthetic navigation"></nav></body></html>`

export async function assertNativeCompactChannelGestures(browser, expect, { origin }) {
  assertDaoVerifierBoundary(origin)
  const source = await readFile(new URL('../../components/mobile-bottom-navigation.tsx', import.meta.url), 'utf8')
  const effect = extractCompactChannelGestureEffect(source)
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true,
    isMobile: true, serviceWorkers: 'block' })
  let blockedRequests = 0
  await context.route('**/*', async route => { blockedRequests++; await route.abort('blockedbyclient') })
  const errors = []
  try {
    for (const kind of ['mouse', 'touch', 'mouse-outside', 'keyboard', 'cleanup-during-press', 'disable-on-release', 'detach-on-release', 'touch-disable-on-release', 'touch-detach-on-release']) {
      const page = await context.newPage()
      page.on('pageerror', () => errors.push(kind))
      try {
        await page.setContent(nativeCompactChannelFixture)
        await page.evaluate(effectSource => {
          const nav = document.querySelector('.mobile-bottom-navigation')
          const install = (0, eval)(effectSource)
          window.__nativeDockCleanup = install({ current: nav })
          window.__nativeDockCounts = { clicks: 0, trustedClicks: 0 }
          document.querySelector('button').addEventListener('click', event => {
            window.__nativeDockCounts.clicks++
            if (event.isTrusted) window.__nativeDockCounts.trustedClicks++
          })
        }, effect)
        if (kind.includes('disable-on-release') || kind.includes('detach-on-release')) await page.evaluate(mode => {
          const button = document.querySelector('button')
          // A real pointerup target/bubble handler can invalidate the action
          // after the guard's capture listener, suppressing later native events.
          button.addEventListener('pointerup', () => {
            if (mode.includes('disable-on-release')) button.disabled = true
            else button.remove()
          }, { once: true })
        }, kind)
        await page.getByLabel('Synthetic contact', { exact: true }).fill('synthetic-only')
        await expect(page.locator('nav')).toBeHidden()
        // Real Playwright input sources only; never dispatch/call a click or blur.
        if (kind.startsWith('touch')) await page.touchscreen.tap(112, 795)
        else if (kind === 'keyboard') {
          await page.keyboard.press('Tab')
          await expect(page.getByRole('button', { name: 'Native channel', exact: true })).toBeFocused()
          await page.keyboard.press('Space')
        } else {
          await page.mouse.move(112, 795)
          await page.mouse.down()
          if (kind === 'mouse-outside' || kind === 'cleanup-during-press') {
            if (kind === 'cleanup-during-press') await page.evaluate(() => window.__nativeDockCleanup())
            await page.mouse.move(300, 600)
          }
          await page.mouse.up()
        }
        const wanted = ['mouse', 'touch', 'keyboard'].includes(kind) ? 1 : 0
        await expect.poll(() => page.evaluate(() => window.__nativeDockCounts), { message: kind + ' native activation count' })
          .toEqual({ clicks: wanted, trustedClicks: wanted })
        // Establish cleanup BEFORE any new input can accidentally rescue a
        // stuck hold, including late disabled/detached no-click cases.
        await expect.poll(() => page.locator('nav').evaluate(node => ({
          visibility: node.style.getPropertyValue('visibility'), pointerEvents: node.style.getPropertyValue('pointer-events'),
        })), { message: kind + ' releases inline dock hold' }).toEqual({ visibility: '', pointerEvents: '' })
        // Some WebKit touch interactions keep input focus. Only after proving
        // cleanup, use a real Tab to leave editing and verify CSS restores the dock.
        if (await page.getByLabel('Synthetic contact', { exact: true }).evaluate(node => node === document.activeElement))
          await page.keyboard.press('Tab')
        await page.evaluate(() => { window.__nativeDockCleanup(); delete window.__nativeDockCleanup })
        await expect(page.locator('nav')).toBeVisible()
        await expect(page.locator('nav')).toHaveCSS('visibility', 'visible')
        await expect(page.locator('nav')).toHaveCSS('pointer-events', 'auto')
        // Recheck after restoration and effect teardown: the earlier poll can
        // observe a transient count before later native events are delivered.
        assert.deepEqual(await page.evaluate(() => window.__nativeDockCounts),
          { clicks: wanted, trustedClicks: wanted }, kind + ' final native activation count after cleanup')
        assert.equal(blockedRequests, 0, 'Native compact fixture must not attempt any network request')
      } finally {
        await page.evaluate(() => { window.__nativeDockCleanup?.(); delete window.__nativeDockCleanup }).catch(() => {})
        await page.close()
      }
    }
    assert.deepEqual(errors, [], 'Native compact fixture has no browser errors')
    assert.equal(blockedRequests, 0, 'Native compact fixture remains offline')
  } finally { await context.close() }
  await assertNativeCompactConsentLayout(browser, expect, { origin })
  await assertNativePublicCollectionGestures(browser, expect, effect)
}

// Independent synthetic CSS reproduces the measured ES picker overlap. The
// collection is outside the search form but inside the same public picker.
export const nativePublicCollectionFixture = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;width:100%;min-height:844px;font-family:sans-serif}
body{padding-bottom:69px}input{position:absolute;left:22px;top:630px;width:280px;height:45px;font-size:16px}
button{position:absolute;box-sizing:border-box;left:22px;top:763.5px;width:169.5px;height:56px}
.mobile-bottom-navigation{position:fixed;z-index:20;left:0;right:0;bottom:0;height:69px;background:#eee}
body:has(input[type=search]:focus){padding-bottom:0}
body:has(input[type=search]:focus) .mobile-bottom-navigation{display:none}
</style></head><body><section data-prelogin-test-picker data-public-test-picker="true">
<form role="search"><input id="hh-test-hero-search" type="search" aria-label="Synthetic picker search"></form>
<section data-test-topic-collections><button type="button" data-test-collection="sexuality">Synthetic collection</button></section>
</section><nav class="mobile-bottom-navigation" aria-label="Synthetic navigation"></nav></body></html>`

async function assertNativePublicCollectionGestures(browser, expect, effect) {
  // Match the real guest-picker's desktop-mobile-width context; touch is an
  // additional physical input source, not an application event substitute.
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true,
    isMobile: false, serviceWorkers: 'block' })
  let blockedRequests = 0
  await context.route('**/*', async route => { blockedRequests++; await route.abort('blockedbyclient') })
  const errors = []
  try {
    for (const kind of ['mouse', 'touch', 'mouse-outside', 'keyboard', 'cleanup-during-press', 'disable-on-release', 'detach-on-release', 'touch-disable-on-release', 'touch-detach-on-release']) {
      const page = await context.newPage()
      page.on('pageerror', () => errors.push(kind))
      try {
        await page.setContent(nativePublicCollectionFixture)
        await page.evaluate(effectSource => {
          window.__nativePickerDockCleanup = (0, eval)(effectSource)({ current: document.querySelector('nav') })
          window.__nativePickerDockCounts = { clicks: 0, trustedClicks: 0 }
          document.querySelector('button[data-test-collection]').addEventListener('click', event => {
            window.__nativePickerDockCounts.clicks++
            if (event.isTrusted) window.__nativePickerDockCounts.trustedClicks++
          })
        }, effect)
        if (kind.includes('disable-on-release') || kind.includes('detach-on-release')) await page.evaluate(mode => {
          const button = document.querySelector('button[data-test-collection]')
          button.addEventListener('pointerup', () => {
            if (mode.includes('disable-on-release')) button.disabled = true
            else button.remove()
          }, { once: true })
        }, kind)
        const search = page.getByLabel('Synthetic picker search', { exact: true })
        await search.fill('amor')
        await expect(search).toBeFocused()
        await expect(page.locator('nav')).toBeHidden()
        assert.equal(await page.locator('button[data-test-collection]').evaluate(node => node.contains(document.elementFromPoint(106.75, 791.5))), true,
          'Public collection receives the measured ES press coordinate before search blur')
        if (kind.startsWith('touch')) await page.touchscreen.tap(106.75, 791.5)
        else if (kind === 'keyboard') {
          await page.keyboard.press('Tab')
          await expect(page.getByRole('button', { name: 'Synthetic collection', exact: true })).toBeFocused()
          await page.keyboard.press('Space')
        } else {
          await page.mouse.move(106.75, 791.5)
          await page.mouse.down()
          if (kind === 'mouse-outside' || kind === 'cleanup-during-press') {
            if (kind === 'cleanup-during-press') await page.evaluate(() => window.__nativePickerDockCleanup())
            await page.mouse.move(300, 600)
          }
          await page.mouse.up()
        }
        const wanted = ['mouse', 'touch', 'keyboard'].includes(kind) ? 1 : 0
        await expect.poll(() => page.evaluate(() => window.__nativePickerDockCounts), { message: kind + ' public collection native activation count' })
          .toEqual({ clicks: wanted, trustedClicks: wanted })
        await expect.poll(() => page.locator('nav').evaluate(node => ({
          visibility: node.style.getPropertyValue('visibility'), pointerEvents: node.style.getPropertyValue('pointer-events'),
        })), { message: kind + ' public collection releases inline dock hold' }).toEqual({ visibility: '', pointerEvents: '' })
        if (await search.evaluate(node => node === document.activeElement)) await page.keyboard.press('Tab')
        await page.evaluate(() => { window.__nativePickerDockCleanup(); delete window.__nativePickerDockCleanup })
        await expect(page.locator('nav')).toBeVisible()
        await expect(page.locator('nav')).toHaveCSS('visibility', 'visible')
        await expect(page.locator('nav')).toHaveCSS('pointer-events', 'auto')
        assert.deepEqual(await page.evaluate(() => window.__nativePickerDockCounts),
          { clicks: wanted, trustedClicks: wanted }, kind + ' final public collection native activation count after cleanup')
        assert.equal(blockedRequests, 0, 'Native public collection fixture must not attempt any network request')
      } finally {
        await page.evaluate(() => { window.__nativePickerDockCleanup?.(); delete window.__nativePickerDockCleanup }).catch(() => {})
        await page.close()
      }
    }
    assert.deepEqual(errors, [], 'Native public collection fixture has no browser errors')
    assert.equal(blockedRequests, 0, 'Native public collection fixture remains offline')
  } finally { await context.close() }
}
