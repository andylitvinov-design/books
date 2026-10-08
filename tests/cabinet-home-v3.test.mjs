import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = async (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')

test('Cabinet home uses live account records, actionable test paths and no browser-local health data', async () => {
  const file = await source('components/app/cabinet-home.jsx')
  for (const expected of [
    'data.results', 'data.activeTestPlan', 'data.moodCheckins', 'data.savedReports',
    'onStartDefinition(definition)', 'onResumePlan(activePlan)', "'/tests'",
    "'/history'", "'/consultations'", "'/tools'", 'role="progressbar"',
    'rankAssessmentDefinitions', 'matchedFocus.length', 'matched.length',
  ]) assert.ok(file.includes(expected), expected)
  assert.doesNotMatch(file, /localStorage|sessionStorage|service_role|dangerouslySetInnerHTML/)
})

test('Cabinet home is the signed-in landing, practitioner tools are a separate authorized route', async () => {
  const app = await source('components/app/app-workspace.jsx')
  const route = await source('app/[locale]/app/[[...path]]/page.jsx')
  assert.match(app, /<CabinetHome[\s\S]*onStartDefinition={startCabinetDefinition}/)
  assert.match(app, /page === 'tools' && data\.practitioner/)
  assert.match(app, /<OwnerTools locale={locale} \/>/)
  assert.match(app, /\['tools', ru \? .*'\/tools'\]/)
  assert.match(route, /'tools'/)
  assert.match(app, /appFetch\('mood'/)
  assert.match(app, /if \(!fresh\?\.account \|\| !Array\.isArray\(fresh\.results\)\)/)
  assert.match(app, /state === 'ready' && !data\?\.account/)
    assert.match(app, /appFetch\('runs'/)
})

test('Test explorer restores Cabinet query and topic; count follows visible matching rows', async () => {
  const file = await source('components/app/test-explorer.jsx')
  assert.match(file, /useSearchParams/)
  assert.match(file, /params\.get\('focus'\)/)
  assert.match(file, /params\.get\('q'\)/)
  assert.match(file, /filterExplorerEntries\(entries, \{ availability, focus/)
  assert.match(file, /matchCount/)
  assert.match(file, /visible\.length/)
  assert.match(file, /setSelectedKeys/)
  assert.match(file, /onStart\(selected\)/)
})

test('Responsive Cabinet styling preserves focus and accessible action sizes', async () => {
  const scoped = await source('components/app/cabinet-home.module.css')
  const global = await source('app/[locale]/app/[[...path]]/workspace.css')
  assert.match(scoped, /@media\(max-width:600px\)/)
  assert.match(scoped, /\.search:focus-within/)
  assert.match(global, /:focus-visible/)
  assert.match(global, /@media\(max-width:650px\)/)
})
