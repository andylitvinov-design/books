// Start the local app, then run node tests/reiki-daybook-progress.browser.mjs.
// REIKI_QA_ORIGIN, PLAYWRIGHT_PACKAGE and CHROMIUM_EXECUTABLE_PATH are optional.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { test } from 'node:test'
import { energyworkSequence, ENERGYWORK_VERSION } from '../data/academy/energywork-ai-schema.js'
import { energyworkCreateFirstLessonHandoff, ENERGYWORK_FIRST_LESSON_STORAGE_KEY } from '../data/academy/energywork-first-lesson.js'
import { writeReikiInitiationRequest } from '../data/academy/reiki-initiation-request.js'

const origin = new URL(process.env.REIKI_QA_ORIGIN || 'http://127.0.0.1:3137').origin
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(origin).hostname))
const require = createRequire(import.meta.url)
const playwright = require(process.env.PLAYWRIGHT_PACKAGE || 'playwright')
const chromium = [process.env.CHROMIUM_EXECUTABLE_PATH, playwright.chromium.executablePath(), '/usr/bin/chromium'].find(path => path && existsSync(path))
const sequence = energyworkSequence()
const courseUrl = origin + '/en/academy/principles-of-energywork/daybook'
const owner = '5feffc14-a08d-4ffa-9155-1246b17c179c'
const review = 'I could follow the practice at my own pace and noticed a quiet moment.'
const preview = { 'welcome-02': 'beginner', 'flight-04': review }

const snapshot = (overrides = {}) => ({
  accountId: owner, enrolled: true, courseVersion: ENERGYWORK_VERSION, slideId: 'welcome-01',
  status: 'active', revision: 1, answers: {}, sharingWithTeacher: false, ...overrides,
})

async function scenario(t, progress, handle, handoff) {
  const args = ['--no-sandbox', '--disable-dev-shm-usage']
  if (process.env.REIKI_QA_SINGLE_PROCESS === '1') args.push('--no-zygote', '--single-process', '--disable-gpu')
  const browser = await playwright.chromium.launch({ executablePath: chromium, args })
  t.after(() => browser.close())
  const context = await browser.newContext({ viewport: { width: 412, height: 900 }, reducedMotion: 'reduce' })
  if (handoff) await context.addInitScript(({ key, value }) => sessionStorage.setItem(key, value),
    { key: ENERGYWORK_FIRST_LESSON_STORAGE_KEY, value: handoff })
  const page = await context.newPage()
  const writes = [], errors = []
  page.on('pageerror', error => errors.push(error.message))
  t.after(() => assert.deepEqual(errors, []))
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url())
    if (url.origin !== origin) return route.abort()
    if (!url.pathname.startsWith('/api/app/')) return route.continue()
    const path = url.pathname.slice('/api/app/'.length)
    const reply = (body, status = 200) => route.fulfill({ status, json: body })
    const body = request.method() === 'POST' ? request.postDataJSON() : undefined
    if (body) writes.push({ path, body, owner: request.headers()['x-hh-account-id'] })
    if (handle && await handle({ request, path, body, reply, progress })) return
    if (path === 'academy-energywork' && !body) {
      return progress ? reply(progress) : reply({ error: 'ACCOUNT_REQUIRED' }, 401)
    }
    if (path === 'bootstrap' && !progress) return reply({ error: 'ACCOUNT_REQUIRED' }, 401)
    if (body) errors.push('Unexpected write to ' + path + ' (' + body.action + ')')
    return reply({ error: 'NOT_FOUND' }, 404)
  })
  return { page, writes }
}

const slide = (page, id) => page.locator('[data-energywork-slide-id="' + id + '"]').waitFor()
async function step(page, offset) {
  const list = page.locator('details').filter({ has: page.locator('ol button[aria-current="step"]') })
  if (!await list.evaluate(element => element.open)) await list.locator('summary').click()
  await list.locator('ol button').nth(offset).click()
}

test('cancelled sign-in preserves reached steps and the guest draft across both formats', async t => {
  const pending = energyworkCreateFirstLessonHandoff(preview, 'en')
  const { page, writes } = await scenario(t, null, undefined, pending)
  await page.goto(courseUrl + '?auth=cancelled')
  await slide(page, 'flight-done')
  const gate = page.locator('[data-reiki-first-lesson-google-save]')
  assert.equal(await gate.isDisabled(), true)
  assert.equal(await page.locator('[data-reiki-first-lesson-consent]').isChecked(), false)
  assert.equal(await page.getByRole('button', { name: /^Week 2\./ }).isDisabled(), true)
  await step(page, sequence.indexOf('flight-04'))
  await slide(page, 'flight-04')
  assert.equal(await page.locator('textarea').inputValue(), review)
  assert.equal(await page.locator('#energywork-slide-title').evaluate(el => el === document.activeElement), true)
  const edited = review + ' I added this private sentence.'
  await page.locator('textarea').fill(edited)
  await page.getByRole('button', { name: 'Classic format' }).click()
  await page.locator('main[data-energywork-ai-learner]').waitFor()
  assert.equal(await page.locator('textarea').inputValue(), edited)
  await page.getByRole('button', { name: 'Back to Daybook' }).click()
  await page.locator('main[data-reiki-daybook]').waitFor()
  assert.equal(await page.locator('textarea').inputValue(), edited)
  await step(page, sequence.indexOf('flight-done'))
  await slide(page, 'flight-done')
  assert.equal(await gate.isDisabled(), true)
  assert.deepEqual(writes, [])
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), ENERGYWORK_FIRST_LESSON_STORAGE_KEY), null)
})

test('an authenticated learner can enable private saving after starting the preview', async t => {
  const progress = snapshot({ enrolled: false })
  const { page, writes } = await scenario(t, progress, async ({ path, body, reply }) => {
    if (path !== 'academy-energywork' || !body) return false
    if (body.action === 'start') progress.enrolled = true
    else if (body.action === 'save') {
      assert.equal(body.expectedRevision, progress.revision)
      if (body.answer) progress.answers[body.slideId] = body.answer
      progress.slideId = body.nextSlideId
      progress.revision++
    } else return false
    await reply(progress)
    return true
  })
  await page.goto(courseUrl)
  await page.locator('[data-energywork-next]').click()
  await slide(page, 'welcome-02')
  await page.locator('input[value="beginner"]').check()
  await page.locator('[data-energywork-next]').click()
  await slide(page, sequence[2])
  await page.getByText('Save your learning privately', { exact: true }).click()
  const enable = page.getByRole('button', { name: 'Start & save my course' })
  assert.equal(await enable.isDisabled(), true)
  assert.deepEqual(writes, [])
  await page.locator('[data-reiki-private-save-status] input[type="checkbox"]').check()
  await enable.click()
  await page.locator('[data-reiki-private-save-status] a').waitFor()
  await slide(page, sequence[2])
  assert.equal(progress.answers['welcome-02'], 'beginner')
  assert.equal(progress.slideId, sequence[2])
  assert.deepEqual(writes.map(write => write.body.action), ['start', 'save', 'save'])
  assert.equal(writes[0].body.teacherConsent, false)
  assert.ok(writes.every(write => write.owner === owner))
  await step(page, 1)
  assert.equal(await page.locator('input[value="beginner"]').isChecked(), true)
})

test('sharing on the last slide retains the private photo and ignores an earlier entry link', async t => {
  const answers = Object.fromEntries(sequence.map(id => [id, review]))
  answers['end-01'] = writeReikiInitiationRequest({ firstName: 'Test', lastName: 'User',
    location: 'Test City', timezone: 'UTC', preferredTime: 'Evening', freeInitiation: 'tantra',
    personalSession: 'none', motivation: review })
  const progress = snapshot({ slideId: 'end-02', status: 'completed', answers })
  const { page, writes } = await scenario(t, progress, async ({ path, body, reply }) => {
    if (path === 'academy-energywork/photo') { await reply({ exists: true }); return true }
    if (path !== 'academy-energywork' || body?.action !== 'share') return false
    assert.equal(body.teacherConsent, true)
    progress.sharingWithTeacher = true
    await reply(progress)
    return true
  })
  await page.goto(courseUrl + '?slide=init-photo-01')
  await slide(page, 'init-photo-01')
  const progressBar = page.getByRole('progressbar', { name: 'Course progress' })
  assert.equal(Number(await progressBar.getAttribute('value')), sequence.length)
  await page.locator('[data-energywork-next]').click()
  await slide(page, 'end-02')
  const sharing = page.locator('[data-reiki-final-share-consent]')
  assert.equal(await sharing.getByRole('button').isDisabled(), true)
  assert.deepEqual(writes, [])
  await sharing.getByRole('checkbox').check()
  await sharing.getByRole('button').click()
  await slide(page, 'end-02')
  const apply = page.getByRole('button', { name: 'Send my initiation request' })
  await apply.waitFor()
  assert.equal(await apply.isDisabled(), true)
  assert.equal(await page.locator('[data-reiki-photo-required]').count(), 0)
  assert.equal(Number(await progressBar.getAttribute('value')), sequence.length)
  assert.deepEqual(writes.map(write => write.body.action), ['share'])
})

test('a consented OAuth return saves the private handoff once and opens lesson two', async t => {
  const result = snapshot({ slideId: 'tan-01', answers: preview })
  const pending = energyworkCreateFirstLessonHandoff(preview, 'en')
  const { page, writes } = await scenario(t, result, async ({ path, body, reply }) => {
    if (path === 'bootstrap') {
      await reply({ account: { id: owner, onboardingState: 'active' },
        results: [], runs: [], requests: [], consents: [], services: [] })
      return true
    }
    if (path !== 'academy-energywork' || body?.action !== 'start') return false
    await reply(result)
    return true
  }, pending)
  await page.goto(courseUrl)
  await slide(page, 'tan-01')
  assert.equal(writes.length, 1)
  assert.equal(writes[0].owner, owner)
  assert.equal(writes[0].body.consent, true)
  assert.equal(writes[0].body.teacherConsent, false)
  assert.deepEqual(writes[0].body.firstLesson.answers, preview)
  assert.equal(await page.evaluate(key => sessionStorage.getItem(key), ENERGYWORK_FIRST_LESSON_STORAGE_KEY), null)
})

test('an account change discards the former account draft before retrying', async t => {
  const progress = snapshot({ slideId: 'flight-04', answers: preview })
  const { page, writes } = await scenario(t, progress, async ({ path, body, reply }) => {
    if (path !== 'academy-energywork' || !body) return false
    Object.assign(progress, snapshot({ enrolled: false, accountId: '7c2b8e67-ea58-464d-a7ef-67f6a599e67f' }))
    await reply({ error: 'ACCOUNT_CHANGED' }, 409)
    return true
  })
  await page.goto(courseUrl)
  await slide(page, 'flight-04')
  await page.locator('textarea').fill('Synthetic unsaved text belonging only to the former account.')
  await slide(page, 'welcome-01')
  assert.equal(await page.locator('textarea').count(), 0)
  await page.locator('[data-reiki-private-save-status]').getByRole('button').first().click()
  await page.getByText('Save your learning privately', { exact: true }).waitFor()
  assert.equal(Number(await page.getByRole('progressbar', { name: 'Course progress' }).getAttribute('value')), 0)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].owner, owner)
})

test('typing during a slow Next save keeps the latest draft on screen until confirmed', { timeout: 90_000 }, async t => {
  const progress = snapshot({ slideId: 'flight-04', answers: { ...preview } })
  let acknowledge, announce
  const delayed = new Promise(resolve => { acknowledge = resolve })
  const started = new Promise(resolve => { announce = resolve })
  const { page } = await scenario(t, progress, async ({ path, body, reply }) => {
    if (path !== 'academy-energywork' || body?.action !== 'save') return false
    if (body.nextSlideId !== body.slideId) {
      announce()
      await delayed
      progress.slideId = body.nextSlideId
    }
    progress.revision++
    progress.answers[body.slideId] = body.answer
    await reply(progress)
    return true
  })
  await page.goto(courseUrl)
  await slide(page, 'flight-04')
  const field = page.locator('textarea')
  await field.fill(review + ' First edit.')
  await page.locator('[data-energywork-next]').click()
  await started
  const latest = review + ' Last edit while saving.'
  await field.fill(latest)
  acknowledge()
  await page.getByText('Saved privately', { exact: true }).waitFor()
  await slide(page, 'flight-04')
  assert.equal(await field.inputValue(), latest)
  assert.equal(progress.answers['flight-04'], latest)
  assert.equal(await page.evaluate(() => window.dispatchEvent(new Event('beforeunload', { cancelable: true }))), true)
  await page.locator('[data-energywork-next]').click()
  await slide(page, sequence[sequence.indexOf('flight-04') + 1])
})

test('a mapped final bookmark can explicitly complete the course after a failed save', async t => {
  const progress = snapshot({ slideId: 'end-02' })
  let attempts = 0
  const { page, writes } = await scenario(t, progress, async ({ path, body, reply }) => {
    if (path === 'academy-energywork/photo') { await reply({ exists: false, url: null }); return true }
    if (path !== 'academy-energywork' || body?.action !== 'save') return false
    attempts++
    if (attempts === 1) await reply({ error: 'SERVICE_UNAVAILABLE' }, 503)
    else {
      progress.status = 'completed'
      progress.revision++
      await reply(progress)
    }
    return true
  })
  await page.goto(courseUrl.replace('/en/', '/ru/'))
  await slide(page, 'end-02')
  const confirm = page.getByRole('button', { name: 'Подтвердить завершение курса' })
  const bar = page.getByRole('progressbar', { name: 'Прогресс курса' })
  assert.equal(Number(await bar.getAttribute('value')), sequence.length - 1)
  assert.deepEqual(writes, [])
  await confirm.click()
  await page.locator('footer [role="alert"]').waitFor()
  assert.equal(Number(await bar.getAttribute('value')), sequence.length - 1)
  await confirm.click()
  await confirm.waitFor({ state: 'detached' })
  assert.equal(Number(await bar.getAttribute('value')), sequence.length)
  assert.ok(writes.every(write => write.owner === owner))
  assert.equal(writes.length, 2)
  for (const { body } of writes) {
    assert.deepEqual(body, { action: 'save', version: ENERGYWORK_VERSION,
      slideId: 'end-02', nextSlideId: 'end-02', expectedRevision: 1 })
  }
  await page.reload()
  await slide(page, 'end-02')
  assert.equal(await confirm.count(), 0)
  assert.equal(Number(await bar.getAttribute('value')), sequence.length)
})
