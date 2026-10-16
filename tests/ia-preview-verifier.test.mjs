import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../scripts/verify-ia-v2.mjs', import.meta.url), 'utf8')
const start = source.indexOf('  const openReport =')
const end = source.indexOf('  await openReport.click()', start)
assert.ok(start > 0 && end > start)
const check = new (Object.getPrototypeOf(async function () {}).constructor)('admin', 'expect', 'assert', 'origin', 'previewId', source.slice(start, end))
const expect = locator => ({
  async toBeVisible() { assert.equal(locator.visible, true) },
  async toHaveAttribute(key, value) { assert.equal(locator[key], value) },
})
const previewId = 'synthetic-document'
const origin = 'http://127.0.0.1:3100'
function fixture(patch = {}) {
  const links = {
    'Предпросмотр / открыть': { visible: true, href: `/admin/documents/${previewId}/session-preview?locale=ru` },
    'Просмотреть PDF крупно': { visible: true, href: `/admin/api/documents/${previewId}/pdf?locale=ru&preview=1` },
    ...patch.links,
  }
  return {
    getByRole(role, options) {
      assert.equal(role, 'link'); assert.equal(options.exact, true)
      return { ...links[options.name], async getAttribute(key) { return this[key] } }
    },
    request: { async get(url) {
      assert.equal(url, origin + `/admin/api/documents/${previewId}/pdf?locale=ru&preview=1`)
      return { status: () => patch.status ?? 200, headers: () => ({ 'content-type': patch.mime ?? 'application/pdf' }), body: async () => Buffer.from(patch.body ?? '%PDF-1.7 synthetic') }
    } },
  }
}
test('exact IA verifier accepts localized full-page preview and separate genuine PDF', async () => {
  await check(fixture(), expect, assert, origin, previewId)
})
test('exact IA verifier rejects missing localized action, wrong page route and fake PDF', async () => {
  for (const patch of [
    { links: { 'Предпросмотр / открыть': { visible: false } } },
    { links: { 'Предпросмотр / открыть': { visible: true, href: `/admin/documents/${previewId}/view?locale=ru` } } },
    { links: { 'Просмотреть PDF крупно': { visible: true, href: '/admin/clients' } } },
    { status: 404 }, { mime: 'text/html' }, { body: '<html>not a PDF</html>' },
  ]) await assert.rejects(check(fixture(patch), expect, assert, origin, previewId))
})
test('private-note exclusion remains executable and rejects a leaked practitioner note', async () => {
  const statement = source.match(/assert\.ok\(!\(await admin\.content\(\)\)\.includes\('DO NOT DISPLAY — PRIVATE SYNTHETIC'\)\)/)?.[0]
  assert.ok(statement)
  const privacy = new (Object.getPrototypeOf(async function () {}).constructor)('admin', 'assert', statement)
  await privacy({ content: async () => 'Synthetic client-visible report' }, assert)
  await assert.rejects(privacy({ content: async () => 'DO NOT DISPLAY — PRIVATE SYNTHETIC PRACTITIONER NOTE' }, assert))
})
