import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import postcss from 'postcss'
import selectorParser from 'postcss-selector-parser'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { getAssessmentDefinition } from '../../lib/assessments/definitions.js'
import { scoreAssessment } from '../../lib/assessments/scoring.js'
import { buildAssessmentResultReport } from '../../lib/assessments/result-report.js'
import { getTestScaleGuide } from '../../lib/assessments/scale-guides.js'

export const bachFixtureOrigin = 'http://127.0.0.1:3100'
export const bachFixturePrefix = '/__hh-test__/bach-personal-report/'
export const bachViewports = Object.freeze([320, 390, 1280])
const root = new URL('../../', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')
const componentPath = 'components/app/personal-result-report.jsx'
const modulePath = 'components/app/personal-result-report.module.css'
const routePath = 'app/[locale]/app/[[...path]]/page.jsx'
export const bachFixtureScope = 'ACTUAL_PERSONAL_RESULT_REPORT_SSR_WITH_PRODUCTION_CSS_AND_STATIC_WRAPPERS_NOT_AUTHENTICATED_CABINET'

export function bachFixturePath({ version, instrumentLocale, locale, pattern }) {
  assert.ok(['v1', 'v2'].includes(version), 'Unsupported Bach version')
  assert.ok(['en', 'ru'].includes(instrumentLocale), 'Unsupported instrument locale')
  assert.ok(['en', 'ru'].includes(locale), 'Unsupported display locale')
  assert.ok(['zero', 'maximum', 'mixed'].includes(pattern), 'Unsupported synthetic pattern')
  return `${bachFixturePrefix}${version}/${instrumentLocale}/${locale}/${pattern}`
}

export function createBachFixtures() {
  return ['v1', 'v2'].flatMap(version => ['en', 'ru'].flatMap(instrumentLocale => {
    const definition = getAssessmentDefinition('hh-bach-flower-profile', version, instrumentLocale)
    return ['en', 'ru'].flatMap(locale => ['zero', 'maximum', 'mixed'].map(pattern => {
      // Only fresh deterministic synthetic answers; no saved/client records.
      const answers = Object.fromEntries(definition.questions.map((question, index) => [question.id,
        pattern === 'zero' ? 0 : pattern === 'maximum' ? 5 : index % 6]))
      const result = scoreAssessment(definition, answers)
      const report = buildAssessmentResultReport(result, locale)
      assert.equal(report.verified, true)
      assert.equal(report.sections.length, 38)
      assert.equal(report.highlightedCount, pattern === 'zero' ? 0 : 7)
      const fixture = { version, instrumentLocale, locale, pattern, result, report }
      return { ...fixture, path: bachFixturePath(fixture) }
    }))
  }))
}

export function scopeBachCss(css) {
  const styles = Object.create(null)
  const parsed = postcss.parse(css, { from: modulePath })
  parsed.walkRules(rule => {
    rule.selector = selectorParser(selectors => selectors.walkClasses(node => {
      const name = node.value
      node.value = styles[name] = `bach_fixture_${name}`
    })).processSync(rule.selector)
  })
  return { css: parsed.toString(), styles }
}

function loadReport(source, styles) {
  const compiled = ts.transpileModule(source, {
    fileName: componentPath,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    reportDiagnostics: true,
  })
  assert.deepEqual(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error), [])
  const unused = () => { throw new Error('Bach fixture entered a non-Bach renderer') }
  const dependencies = {
    'react/jsx-runtime': jsxRuntime,
    'next/link': unused,
    '@/lib/assessments/result-report': { buildAssessmentResultReport },
    '@/lib/assessments/scale-guides': { getTestScaleGuide },
    './personal-result-report.module.css': styles,
    './compact-assessment-report': { CompactAssessmentReport: unused },
  }
  const loaded = { exports: {} }
  runInNewContext(compiled.outputText, { exports: loaded.exports, require: name => {
    assert.ok(Object.hasOwn(dependencies, name), 'Unexpected report dependency: ' + name)
    return dependencies[name]
  } })
  return loaded.exports.PersonalResultReport
}

// Same SSR-component fixture approach as tests/course-banner/browser.mjs.
// No installed app route, server, auth, API, credentials, or client data.
export async function buildBachPersonalReportFixture() {
  const sourceProof = []
  const source = async path => {
    const bytes = await read(path)
    sourceProof.push({ path, sha256: createHash('sha256').update(bytes).digest('hex') })
    return bytes
  }
  const component = await source(componentPath)
  const scopedModule = scopeBachCss(await source(modulePath))
  const Report = loadReport(component, scopedModule.styles)
  // Use actual global and route styles in import order. The two static wrapper
  // classes reproduce inherited typography, wrapping and available width only.
  // Navigation, auth, hydration and the full ResultView are not simulated.
  const rootLayout = await source('app/layout.tsx')
  const route = await source(routePath)
  const rootStyles = [...rootLayout.matchAll(/import\s+["']\.\/([^"']+\.css)["']/g)].map(match => 'app/' + match[1])
  const routeStyles = [...route.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map(match =>
    match[1].startsWith('@/') ? match[1].slice(2) : 'app/[locale]/app/[[...path]]/' + match[1].replace(/^\.\//, ''))
  assert.ok(rootStyles.includes('app/globals.css'))
  assert.ok(routeStyles.includes('app/[locale]/app/[[...path]]/workspace.css'))
  const stylesheets = []
  for (const path of [...rootStyles, ...routeStyles]) {
    const css = await source(path)
    if (path === 'app/globals.css') {
      const compiled = await postcss([
        tailwindcss({ config: fileURLToPath(new URL('tailwind.config.ts', root)) }), autoprefixer(),
      ]).process(css, { from: fileURLToPath(new URL(path, root)) })
      assert.deepEqual(compiled.warnings().map(warning => warning.toString()), [])
      stylesheets.push(compiled.css)
    } else stylesheets.push(css)
  }
  for (const path of [
    'tailwind.config.ts', 'lib/assessments/bach-guidance.js', 'lib/assessments/bach-profile.js',
    'lib/assessments/result-report.js', 'lib/assessments/interpretation-context.js',
    'lib/assessments/definitions.js', 'lib/assessments/scoring.js',
    'data/assessments/bach-flower-v1.js', 'data/assessments/bach-flower-v2.js',
  ]) await source(path)
  stylesheets.push(scopedModule.css)
  const css = stylesheets.join('\n').replace(/<\/style/gi, '<\\/style')
  return {
    sourceProof, scope: bachFixtureScope,
    document(fixture) {
      bachFixturePath(fixture)
      const before = JSON.stringify(fixture.result)
      const markup = renderToStaticMarkup(React.createElement(Report, { result: fixture.result, locale: fixture.locale }))
      assert.equal(JSON.stringify(fixture.result), before, 'Rendering changed the synthetic saved dimensions')
      return `<!doctype html><html lang="${fixture.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="data:,"><title>Synthetic Bach report acceptance</title><style>${css}</style></head><body><main class="hh-app"><article class="hh-result-page">${markup}</article></main></body></html>`
    },
  }
}

export function assertHostedBachAcceptance(env) {
  assert.equal(env.CI, 'true', 'Bach browser acceptance is hosted CI only')
  assert.equal(env.GITHUB_ACTIONS, 'true', 'Bach browser acceptance requires GitHub Actions')
  assert.equal(env.RUNNER_ENVIRONMENT, 'github-hosted', 'Bach browser acceptance requires a hosted runner')
  assert.equal(env.HH_APP_TEST_RUNTIME, 'isolated', 'Isolated runtime required')
  assert.ok(!env.VERCEL, 'Never run Bach acceptance on a deployed site')
}
