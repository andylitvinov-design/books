import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium, webkit, expect } from '@playwright/test'
import { lessonFor } from '../lib/inner-growth/lesson-library.js'
import { COURSE_ANTISTRESS_SKILLS_V7 } from '../lib/inner-growth/anti-stress-skills-v7.js'
import { oporaExperienceGuide, OPORA_EXPERIENCE_DESIGN_VERSION } from '../lib/inner-growth/opora-as56-experience-guides.js'
import { buildOporaBrowserFixture, oporaFixtureOrigin as origin, oporaFixturePath,
  oporaFixtureBundlePath, oporaFixtureDocument, requireHostedOporaBrowser } from './opora-as56-browser-fixture.mjs'

requireHostedOporaBrowser(process.env)
const engineName = process.env.HH_TEST_BROWSER
assert.ok(['chromium', 'webkit'].includes(engineName), 'Explicit supported browser required')
const output = `artifacts/opora-as56-mobile/${engineName}`
await mkdir(output, { recursive: true })
const fixture = await buildOporaBrowserFixture()
const evidence = { scope: 'ACTUAL_HYDRATED_AS56_PLAYER_SYNTHETIC_DAY5_REAL_CSS_NO_AUTH_NO_API',
  engine: engineName, sourceProof: fixture.sourceProof, cases: [] }
const words = {
  ru: { next: 'Продолжить', previous: 'Назад', help: 'Показать мягкую подсказку',
    original: 'Показать мягкую подсказку', pause: 'Пауза', neutral: 'Вернуться с нейтральной опорой',
    back: 'Вернуться', end: 'Закончить без сохранения', anchor: 'Если хочется, посмотрите на один обычный предмет вокруг.' },
  es: { next: 'Continuar', previous: 'Atrás', help: 'Ver una pista suave',
    original: 'Ver una pista suave', pause: 'Pausa', neutral: 'Volver con una referencia neutra',
    back: 'Volver', end: 'Salir sin guardar', anchor: 'Si quieres, mira un objeto neutro a tu alrededor.' },
  en: { next: 'Continue', previous: 'Back', help: 'Show gentle guidance',
    original: 'Show gentle guidance', pause: 'Pause', neutral: 'Return with a neutral anchor',
    back: 'Go back', end: 'End without saving', anchor: 'If you wish, look at one ordinary object around you.' },
}
const assets = new Map(await Promise.all(['course-start-heron.webp', 'course-focus-mountain-boy.webp',
  'reiki-practitioner-sunrise.webp', 'report-lighthouse-coast.webp'].map(async name => [
  '/images/holistic-house/' + name, await readFile(new URL('../public/images/holistic-house/' + name, import.meta.url)),
])))
const owlPath = '/images/holistic-house/gentle-owl.svg'
assets.set(owlPath,await readFile(new URL('../public/images/holistic-house/gentle-owl.svg',import.meta.url)))
const browser = await (engineName === 'webkit' ? webkit : chromium).launch()
try {
  for (const locale of ['ru', 'en', 'es']) for (const width of [320, 360, 390]) for (const priorHelp of [false, true]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' })
    context.setDefaultTimeout(15000)
    const page = await context.newPage(), errors = [], unexpectedRequests = []
    const t = words[locale], brief = oporaExperienceGuide(5, locale)
    const data = { cycle: { id: '00000000-0000-4000-8000-000000001056', day: 5, durationDays: 14 },
      programme: { id: 'stress' }, currentSession: null,
      lesson: lessonFor('calm_regulation', 5, locale, 'standard', COURSE_ANTISTRESS_SKILLS_V7) }
    const detail = locale === 'es' ? 'Si te incomoda, mira un objeto neutro.' : data.lesson.antiStress.neutralText
    const html = oporaFixtureDocument(locale, data, fixture.css)
    page.on('pageerror', error => errors.push(error.message))
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url())
      if (request.method() === 'GET' && url.origin === origin && !url.search) {
        if (url.pathname === oporaFixturePath(locale)) return route.fulfill({ status: 200, contentType: 'text/html', body: html })
        if (url.pathname === oporaFixtureBundlePath) return route.fulfill({ status: 200, contentType: 'text/javascript', body: fixture.bundle })
        if (assets.has(url.pathname)) return route.fulfill({ status: 200, contentType: url.pathname === owlPath ? 'image/svg+xml' : 'image/webp', body: assets.get(url.pathname) })
      }
      // Never continue a request: no server, real account or API is reachable.
      unexpectedRequests.push({ method: request.method(), origin: url.origin, path: url.pathname })
      return route.abort('blockedbyclient')
    })
    const button = label => page.getByRole('button', { name: label, exact: true })
    const click = async label => { await button(label).click() }
    const assertBounds = async state => {
      const bounds = await page.evaluate(() => ({ width: innerWidth, height: innerHeight,
        document: document.documentElement.scrollWidth,
        fixed: [...document.querySelectorAll('[data-opora-experience-first] header, [data-opora-experience-first] footer')].map(node => {
          const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
        }),
        stage: (() => { const node = document.querySelector('[data-opora-experience-first] main');
          return { client: node.clientWidth, scroll: node.scrollWidth } })(),
      }))
      assert.ok(bounds.document <= width + 1, `${locale}/${width}/${state}: document overflows`)
      assert.ok(bounds.stage.scroll <= bounds.stage.client + 1, `${locale}/${width}/${state}: stage overflows horizontally`)
      for (const r of bounds.fixed) assert.ok(r.left >= -1 && r.right <= width + 1 && r.top >= -1 && r.bottom <= bounds.height + 1,
        `${locale}/${width}/${state}: header/footer clipped`)
      await expect(button(t.pause)).toBeVisible()
      await expect(button(t.next)).toBeVisible()
    }
    const assertNeutral = async () => {
      await expect(page.getByRole('alertdialog')).toHaveCount(0)
      await expect(page.locator('[data-opora-neutral-anchor]')).toContainText(t.anchor)
      await expect(page.locator('[data-opora-optional-guidance]')).toHaveCount(0)
      await expect(page.getByText(brief, { exact: true })).toHaveCount(0)
      await expect(page.getByText(detail, { exact: true })).toHaveCount(0)
      await expect(button(t.original)).toHaveAttribute('aria-expanded', 'false')
      await expect(page.locator('[data-opora-experience-first] [inert]')).toHaveCount(0)
      await assertBounds('neutral')
    }
    try {
      await page.goto(origin + oporaFixturePath(locale))
      await expect(page.locator('[data-opora-experience-first="as-5.6"]')).toBeVisible()
      await expect(page.locator('[data-course-visual-theme]')).toHaveAttribute('data-course-visual-theme', OPORA_EXPERIENCE_DESIGN_VERSION)
      await click(t.next)
      await expect(page.getByText(brief, { exact: true })).toBeVisible()
      assert.ok((brief.replace(/…/gu, '').match(/[.!?]/gu) || []).length <= 1)
      assert.ok(brief.length <= 140 && brief.split(/\s+/u).length <= 20)
      await expect(page.getByText(detail, { exact: true })).toHaveCount(0)
      await assertBounds('brief')
      if (!priorHelp) await page.screenshot({ path: `${output}/${locale}-${width}-brief.png` })
      // Repeated voluntary expansion/collapse is exercised before each pause.
      for (let i = 0; i < 2; i++) {
        await click(t.help)
        await expect(page.getByText(detail, { exact: true })).toBeVisible()
        await expect(button(t.help)).toHaveAttribute('aria-expanded', 'true')
        await assertBounds('expanded')
        await click(t.help)
        await expect(page.getByText(detail, { exact: true })).toHaveCount(0)
      }
      if (priorHelp) await click(t.help)
      await click(t.pause)
      await expect(button(t.neutral)).toBeFocused()
      await page.keyboard.press('Shift+Tab')
      await expect(button(t.end)).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(button(t.neutral)).toBeFocused()
      await click(t.neutral)
      await expect(button(t.pause)).toBeFocused()
      await assertNeutral()
      if (!priorHelp) await page.screenshot({ path: `${output}/${locale}-${width}-neutral.png` })
      await click(t.original)
      await expect(page.getByText(detail, { exact: true })).toBeVisible()
      await click(t.next) // Feel; navigation closes optional original guidance.
      await expect(page.locator('[data-opora-optional-guidance]')).toHaveCount(0)
      await click(t.pause); await click(t.neutral)
      await click(t.previous) // Feel -> Back must not resurrect day-five guidance.
      await assertNeutral()
      await click(t.original)
      await click(t.pause); await click(t.back)
      await expect(page.getByText(detail, { exact: true })).toBeVisible()
      await click(t.pause); await page.keyboard.press('Escape')
      await expect(button(t.pause)).toBeFocused()
      await click(t.pause); await click(t.neutral)
      await assertNeutral()
      await click(t.pause); await click(t.end)
      const state = await page.evaluate(() => ({ ...window.__oporaBrowser,
        finalData: JSON.stringify(window.__oporaBrowserData) }))
      assert.equal(state.saves, 0, 'No callback may record an accidental save')
      assert.equal(state.closes, 1); assert.equal(state.finishes, 0)
      assert.equal(state.finalData, state.initialData, 'Synthetic input must remain unchanged')
      assert.deepEqual(unexpectedRequests, [], 'Every request must be an explicitly fulfilled fixture asset')
      assert.deepEqual(errors, [], 'No browser page errors')
      evidence.cases.push({ locale, width, priorHelp, brief: true, repeatedHelp: true,
        neutralReturn: true, feelBack: true, focusTrap: true, bounds: true, accidentalSaves: 0, unexpectedRequests: 0 })
    } catch (error) {
      await page.screenshot({ path: `${output}/failure-${locale}-${width}-${priorHelp}.png` }).catch(() => {})
      evidence.failure = { locale, width, priorHelp, message: error.message, errors, unexpectedRequests }
      throw error
    } finally { await context.close() }
  }
  assert.equal(evidence.cases.length, 18)
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  await writeFile(`${output}/summary.json`, JSON.stringify(evidence, null, 2) + '\n')
  await browser.close()
}
