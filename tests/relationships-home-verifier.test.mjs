import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../scripts/verify-relationships-assessments.mjs', import.meta.url), 'utf8')
const start = source.indexOf('  const homePath=')
const end = source.indexOf("  await page.waitForLoadState('networkidle')", start)
assert.ok(start > 0 && end > start)
const run = new (Object.getPrototypeOf(async function () {}).constructor)('locale', 'home', 'expect', 'page', 'origin', source.slice(start, end))
async function verify(locale, href) {
  const page = { url: '' }, origin = 'http://127.0.0.1:3100'
  const home = { focused: false, async focus() { this.focused = true }, async press(key) { assert.equal(key, 'Enter'); assert.equal(this.focused, true); page.url = origin + href } }
  const expect = target => ({
    async toHaveAttribute(key, expected) { assert.equal(target, home); assert.equal(key, 'href'); assert.equal(href, expected) },
    async toHaveURL(expected, options) { assert.equal(target, page); assert.equal(options.timeout, 20000); assert.equal(page.url, expected) },
  })
  await run(locale, home, expect, page, origin)
}
test('exact verifier clicks canonical localized home and waits for its route', async () => {
  await verify('en', '/')
  await verify('ru', '/ru')
})
test('wrong locale and old query-style home routes fail', async () => {
  for (const [locale, href] of [['en', '/ru'], ['ru', '/'], ['en', '/?lang=en'], ['ru', '/?lang=ru']]) {
    await assert.rejects(verify(locale, href))
  }
})
