// Synthetic, read-only browser regression: a native disclosure opened before
// hydration must retain that choice and render the original videos afterwards.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chromium, webkit, expect } from '@playwright/test'

const existing = process.env.HH_TEST_LOCAL_ORIGIN
const origin = existing || 'http://127.0.0.1:3202'
assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/, 'Only an isolated loopback server is allowed')
let app
try {
  if (!existing) {
    assert.equal(process.env.CI, 'true', 'The production build is launched only in CI')
    app = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3202', '-H', '127.0.0.1'], {
      env: { ...process.env, PRESCRIPTIONS_KV_REST_API_URL: '', PRESCRIPTIONS_KV_REST_API_TOKEN: '', PRESCRIPTIONS_ADMIN_TOKEN: '', PRESCRIPTIONS_ADMIN_PIN: '' },
      stdio: 'ignore',
    })
    for (let attempt = 0; ; attempt++) {
      try { if ((await fetch(origin + '/es')).ok) break } catch { /* starting */ }
      assert.ok(attempt < 90 && app.exitCode === null, 'Isolated application did not start')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  for (const [name, driver] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await driver.launch({ headless: true })
    let release
    const javascriptGate = new Promise(resolve => { release = resolve })
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })
      const page = await context.newPage(), pageErrors = [], writes = []
      page.on('pageerror', error => pageErrors.push(error.message))
      await page.route('**/*', async route => {
        const request = route.request(), url = new URL(request.url())
        if (url.origin !== origin || request.method() !== 'GET') {
          if (url.origin === origin && request.method() !== 'GET' && !(existing && url.pathname === '/__nextjs_original-stack-frames')) writes.push(request.method() + ' ' + url.pathname)
          return route.abort('blockedbyclient')
        }
        if (url.pathname.startsWith('/_next/static/') && url.pathname.endsWith('.js')) await javascriptGate
        return route.continue()
      })
      await page.goto(origin + '/es', { waitUntil: 'commit', timeout: 90000 })
      const disclosure = page.locator('[data-home-testimonial-disclosure]')
      await expect(disclosure.locator('summary')).toBeVisible({ timeout: 60000 })
      await disclosure.locator('summary').click()
      await expect(disclosure).toHaveAttribute('open', '')
      await expect(disclosure.locator('a[href="/es/about#testimonials-title"]')).toBeVisible()
      await expect(disclosure.locator('[data-testimonial-video-id]')).toHaveCount(0)
      release()
      await expect(disclosure.locator('[data-testimonial-video-id]')).toHaveCount(8, { timeout: 60000 })
      await expect(disclosure).toHaveAttribute('open', '')
      await expect(disclosure.locator('iframe')).toHaveCount(0)
      const russian = disclosure.locator('[data-testimonial-video-id="MIVLm1GUTtM"]')
      await expect(russian).toContainText('Ruso · RU')
      assert.doesNotMatch(await russian.innerText(), /[\u0400-\u04ff]/)
      assert.deepEqual(pageErrors, [])
      assert.deepEqual(writes, [], 'Opening the archive must not submit data')
      console.log('PASS ' + name + ': early open survives hydration; eight videos remain opt-in')
      await context.close()
    } finally {
      release()
      await browser.close()
    }
  }
} finally {
  if (app) app.kill('SIGTERM')
}
