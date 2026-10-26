import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { capturePortraitPageErrors, freshPortraitReportPage } from '../scripts/helpers/portrait-mobile-auth-handoff.mjs'

const origin = 'http://127.0.0.1:3100'
function fixture({ interactive = true, url = origin + '/en/app/portrait' } = {}) {
  const events = []
  const context = new EventEmitter()
  const pages = []
  context.newPage = async () => {
    const page = new EventEmitter()
    page.number = pages.length
    page.context = () => context
    page.url = () => page.number === 0 ? url : 'about:blank'
    page.locator = selector => ({ page, selector })
    page.close = async () => { page.closed = true; events.push('close:' + page.number) }
    pages.push(page)
    events.push('new:' + page.number)
    context.emit('page', page)
    return page
  }
  const expect = target => ({
    async toHaveURL(pattern) {
      events.push('ready:url')
      assert.match(target.url(), pattern)
    },
    async toBeVisible() {
      events.push('ready:' + target.selector)
      assert.ok(!target.selector.includes('data-profile-interactive') || interactive,
        'the actual ProfileDomains interactive marker is not ready')
    },
  })
  return { context, pages, events, expect }
}

test('direct Reports handoff requires real landing readiness before a fresh same-context page', async () => {
  const f = fixture()
  const landingPage = await f.context.newPage()
  const reportPage = await freshPortraitReportPage({ ...f, landingPage, origin })
  assert.notEqual(reportPage, landingPage)
  assert.equal(reportPage.context(), landingPage.context())
  assert.equal(reportPage.url(), 'about:blank', 'the existing Reports goto must still run')
  assert.equal(landingPage.closed, true)
  assert.equal(reportPage.closed, undefined)
  assert.deepEqual(f.events, ['new:0', 'ready:url', 'ready:.hh-mobile-app-nav',
    'ready:[data-profile-domains][data-profile-interactive="true"]', 'new:1', 'close:0'])
})

test('an already matching URL and visible Profile shell cannot substitute for hydration', async () => {
  const f = fixture({ interactive: false })
  const landingPage = await f.context.newPage()
  await assert.rejects(freshPortraitReportPage({ ...f, landingPage, origin }), /interactive marker is not ready/)
  assert.equal(f.pages.length, 1)
  assert.equal(landingPage.closed, undefined)
})

test('an incorrect landing URL is not accepted or navigated away from', async () => {
  const f = fixture({ url: origin + '/en/app/continue' })
  const landingPage = await f.context.newPage()
  await assert.rejects(freshPortraitReportPage({ ...f, landingPage, origin }))
  assert.deepEqual(f.events, ['new:0', 'ready:url'])
  assert.equal(landingPage.closed, undefined)
})

test('non-loopback origins and a substituted auth context are refused before handoff', async () => {
  const f = fixture()
  const landingPage = await f.context.newPage()
  await assert.rejects(freshPortraitReportPage({ ...f, landingPage, origin: 'https://example.org' }), /loopback/)
  await assert.rejects(freshPortraitReportPage({ ...f, context: new EventEmitter(), landingPage, origin }), /authenticated synthetic context/)
  assert.deepEqual(f.events, ['new:0'])
})

test('errors emitted during each document lifetime remain in the existing error gate', async () => {
  const f = fixture()
  const problems = []
  capturePortraitPageErrors(f.context, problems)
  const landingPage = await f.context.newPage()
  landingPage.emit('pageerror', new Error('synthetic landing error'))
  const closeLanding = landingPage.close
  landingPage.close = async () => {
    landingPage.emit('pageerror', new Error('synthetic landing error before close'))
    await closeLanding()
  }
  const reportPage = await freshPortraitReportPage({ ...f, landingPage, origin })
  reportPage.emit('pageerror', new Error('synthetic Reports error'))
  assert.deepEqual(problems, ['synthetic landing error', 'synthetic landing error before close', 'synthetic Reports error'])
})

test('new-page and close failures propagate rather than retrying or suppressing navigation failures', async () => {
  for (const operation of ['newPage', 'close']) {
    const f = fixture()
    const landingPage = await f.context.newPage()
    if (operation === 'newPage') f.context.newPage = async () => { throw new Error('synthetic new-page failure') }
    else landingPage.close = async () => { throw new Error('synthetic close failure') }
    await assert.rejects(freshPortraitReportPage({ ...f, landingPage, origin }), /synthetic .* failure/)
  }
})

test('focused browser script retains synthetic consent, direct navigation and unchanged hard geometry/error gates', () => {
  const source = readFileSync(new URL('../scripts/verify-portrait-mobile.mjs', import.meta.url), 'utf8')
  const capture = source.indexOf('capturePortraitPageErrors(context, problems)')
  const initialPage = source.indexOf('await context.newPage()')
  assert.ok(capture > 0 && initialPage > capture, 'error capture must be registered before the first page')
  const consent = source.indexOf("await page.getByRole('button',{name:'Create my private space'}).click()")
  const handoff = source.indexOf('page = await freshPortraitReportPage({ context, landingPage: page, expect, origin })')
  const reports = source.indexOf("await open('/'+locale+'/app/portfolio')")
  assert.ok(consent > 0 && handoff > consent && reports > handoff)
  assert.match(source, /const open = path => page\.goto\(origin \+ path, \{ waitUntil: 'domcontentloaded', timeout: 90000 \}\)/)
  assert.match(source, /const maxSpan = shortViewport \? 470 : 535/)
  assert.match(source, /assert\.equal\(appProblems\.length,0,'Browser script errors:/)
  assert.doesNotMatch(source, /waitForTimeout|setTimeout/)
})
