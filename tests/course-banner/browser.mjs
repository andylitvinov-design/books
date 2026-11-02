import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { URL } from 'node:url'
import { runInNewContext } from 'node:vm'
import { chromium, webkit, expect } from '@playwright/test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { assessmentResultOverview } from '../../lib/assessments/result-overview.js'
import { assessmentEvidenceStatus } from '../../lib/assessments/assessment-evidence-status.js'

// Synthetic rendered-component acceptance only: no account, API, navigation or writes.
const require = createRequire(import.meta.url)
const read = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8')
const styles = prefix => ({ __esModule: true, default: new Proxy({}, { get: (_, key) => prefix + key }) })
function loadComponent(path, dependencies) {
  const compiled = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const loaded = { exports: {} }
  runInNewContext(compiled, { exports: loaded.exports, require: name => dependencies[name] || require(name) })
  return loaded.exports
}
const { FreeCourseBanner } = loadComponent('components/app/free-course-banner.jsx', {
  'next/link': props => { const anchor = { ...props }; delete anchor.prefetch; return React.createElement('a', anchor) },
  './free-course-banner.module.css': styles('banner_'),
})
const { CompactAssessmentReport } = loadComponent('components/app/compact-assessment-report.jsx', {
  './free-course-banner': { FreeCourseBanner },
  './assessment-gauge': { ScoreGauge: () => null, ScoreTrend: () => null },
  '@/lib/assessments/scale-guides': { getTestScaleGuide: () => null },
  '@/lib/assessments/dashboard-gauges': { gaugeModel: () => null },
  '@/lib/assessments/result-overview': { assessmentResultOverview },
  '@/lib/assessments/assessment-evidence-status': { assessmentEvidenceStatus },
  './compact-assessment-report.module.css': styles('report_'),
})
// These two local stylesheets use plain class selectors; prefix them just as CSS modules do.
const scopedCss = (path, prefix) => read(path).replace(/\.([a-zA-Z][\w-]*)/g, '.' + prefix + '$1')
const css = read('app/[locale]/app/[[...path]]/workspace.css') + '\n'
  + scopedCss('components/app/compact-assessment-report.module.css', 'report_') + '\n'
  + scopedCss('components/app/free-course-banner.module.css', 'banner_')
function fixture(locale) {
  const report = {
    sections: [], rulesVersion: 'synthetic-v1',
    purpose: locale === 'ru' ? 'Синтетический пример отчёта' : 'Synthetic report fixture',
    note: locale === 'ru' ? 'Без персональных данных' : 'No personal data',
  }
  const markup = renderToStaticMarkup(React.createElement(CompactAssessmentReport, {
    result: { definitionKey: 'synthetic-test', dimensions: [] }, report, locale,
  }))
  return '<!doctype html><html lang="' + locale + '"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>Synthetic course banner</title><style>body{margin:0}' + css + '</style></head>'
    + '<body><main class="hh-app">' + markup + '</main></body></html>'
}

const engineName = process.env.HH_TEST_BROWSER || 'chromium'
assert.ok(['chromium', 'webkit'].includes(engineName), 'Unsupported browser')
const engine = engineName === 'webkit' ? webkit : chromium
const evidence = { engine: engineName, synthetic: true, cases: [] }
const directory = 'artifacts/course-banner/' + engineName
mkdirSync(directory, { recursive: true })
const browser = await engine.launch()
try {
  for (const locale of ['en', 'ru']) {
    for (const width of [320, 390, 1280]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
      const requests = []
      await context.route('**/*', route => { requests.push(route.request().url()); return route.abort() })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      try {
        await page.setContent(fixture(locale))
        const banner = page.locator('[data-free-course-banner]')
        await expect(banner).toHaveCount(1)
        const start = banner.getByRole('link', { name: locale === 'ru' ? 'Начать курс бесплатно' : 'Start course for free', exact: true })
        const summary = banner.locator('summary')
        const details = banner.locator('details')
        await expect(summary).toHaveText(locale === 'ru' ? 'Подробнее о курсе' : 'More about the course')
        await expect(start).toHaveAttribute('href', '/' + locale + '/app/course?program=stress')
        await expect(details).not.toHaveAttribute('open')
        await expect(details.locator('div')).toBeHidden()
        const assertBounds = async state => {
          const bounds = await page.evaluate(() => ({
            viewport: innerWidth, document: document.documentElement.scrollWidth,
            actions: [...document.querySelectorAll('[data-free-course-banner] a, [data-free-course-banner] summary')].map(node => {
              const rect = node.getBoundingClientRect()
              return { left: rect.left, right: rect.right, width: rect.width, height: rect.height }
            }),
          }))
          assert.ok(bounds.document <= bounds.viewport, locale + '/' + width + '/' + state + ': document overflow')
          for (const action of bounds.actions) {
            assert.ok(action.left >= 0 && action.right <= bounds.viewport, 'Action is clipped')
            assert.ok(action.height >= 44 && action.width >= 44, 'Action is smaller than 44px')
          }
        }
        await assertBounds('collapsed')
        await start.focus()
        await page.keyboard.press('Tab')
        await expect(summary).toBeFocused()
        await page.keyboard.press('Shift+Tab')
        await expect(start).toBeFocused()
        const startFocus = await start.evaluate(node => {
          const style = getComputedStyle(node)
          return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }
        })
        assert.ok(startFocus.width >= 2 && startFocus.style !== 'none', 'Start keyboard focus is not visible')
        await page.keyboard.press('Tab')
        await expect(summary).toBeFocused()
        const focus = await summary.evaluate(node => {
          const style = getComputedStyle(node)
          return { width: parseFloat(style.outlineWidth), style: style.outlineStyle }
        })
        assert.ok(focus.width >= 2 && focus.style !== 'none', 'Keyboard focus is not visible')
        await page.keyboard.press('Enter')
        await expect(details).toHaveAttribute('open', '')
        await expect(details.locator('div')).toBeVisible()
        await expect(summary).toBeFocused()
        await assertBounds('expanded')
        await expect(details).toContainText(locale === 'ru' ? 'вашего согласия' : 'requires your consent')
        await page.keyboard.press('Space')
        await expect(details).not.toHaveAttribute('open')
        await expect(details.locator('div')).toBeHidden()
        await expect(summary).toBeFocused()
        await page.keyboard.press('Space')
        await expect(details).toHaveAttribute('open', '')
        await assertBounds('reopened')
        await page.keyboard.press('Enter')
        await expect(details).not.toHaveAttribute('open')
        assert.deepEqual(requests, [], 'Fixture attempted a network request')
        assert.deepEqual(errors, [], 'Browser page error')
        evidence.cases.push({ locale, width, collapsed: true, keyboard: true, repeatedToggle: true, focus: true, bounds: true, networkRequests: 0 })
      } finally { await context.close() }
    }
  }
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  writeFileSync(directory + '/summary.json', JSON.stringify(evidence, null, 2) + '\n')
  await browser.close()
}
