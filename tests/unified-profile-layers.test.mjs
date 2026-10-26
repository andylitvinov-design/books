import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import {
  UNIFIED_PROFILE_LAYER_IDS, UNIFIED_STATE_AXES, UNIFIED_LIFE_AXES,
  unifiedPortraitEvidence, unifiedFoundationEvidence, buildUnifiedProfileLayers,
} from '../lib/profile/unified-profile.js'

const require = createRequire(import.meta.url)
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('four layers are stable; missing measurements have no invented values or health percent', () => {
  assert.deepEqual(UNIFIED_PROFILE_LAYER_IDS, ['foundation', 'state', 'life', 'development'])
  const model = buildUnifiedProfileLayers({ results: [] }, 'ru', { now: Date.parse('2026-10-24T12:00:00Z') })
  assert.deepEqual(model.layers.map(layer => layer.id), UNIFIED_PROFILE_LAYER_IDS)
  assert.equal(model.totalEvidenceCount, 0)
  for (const layer of model.layers) {
    assert.deepEqual(layer.rows, [])
    assert.ok(layer.notAssessedCount > 0)
  }
  assert.equal(new Set(UNIFIED_STATE_AXES).size, UNIFIED_STATE_AXES.length)
  assert.equal(new Set(UNIFIED_LIFE_AXES).size, UNIFIED_LIFE_AXES.length)
  assert.ok(!UNIFIED_STATE_AXES.includes('sexual_wellbeing'))
  assert.ok(!UNIFIED_LIFE_AXES.includes('intimacy'))
})

test('profile distinguishes source-linked raw scale readings, stale and unmeasured axes', () => {
  const verified = {
    axis:'energy', mode:'directional', rawValue:2, min:0, max:4,
    percent:50, resultId:'private-result-id', definitionKey:'hh-weekly-pulse',
    definitionVersion:'v1', instrumentLocale:'ru', unit:'points',
    sourceTitle:'Weekly pulse', measuredAt:'2026-10-24T12:00:00Z',
  }
  const output = unifiedPortraitEvidence({
    axes: { energy: verified, stress:null },
    staleAxes: { stress:{...verified, axis:'stress'} },
  }, ['energy','stress','mood'], 'ru')
  assert.equal(output.rows.length, 1)
  assert.equal(output.rows[0].value, 2)
  assert.equal(output.rows[0].min, 0)
  assert.equal(output.rows[0].max, 4)
  assert.equal(output.rows[0].definitionKey, 'hh-weekly-pulse')
  assert.equal(output.rows[0].resultId, 'private-result-id')
  assert.equal(Object.hasOwn(output.rows[0], 'percent'), false)
  assert.equal(output.staleCount, 1)
  assert.equal(output.notAssessedCount, 1)
  assert.deepEqual(unifiedPortraitEvidence({ axes:{ energy:{...verified,rawValue:99} } },['energy']).rows, [])
})

test('unverified self-described personality traits cannot enter the verified foundation', () => {
  const forged = [{
    id:'unverified', definitionKey:'mini-ipip-20', definitionVersion:'v1',
    measurementAt:'2026-10-24T12:00:00Z',
    dimensions:[{key:'trait.conscientiousness',dimensionClass:'trait',value:5,min:0,max:10}],
  }]
  assert.deepEqual(unifiedFoundationEvidence(forged, 'en', {now:Date.parse('2026-10-24T13:00:00Z')}), [])
})

test('client profile and Insights reuse one owner-scoped source model', () => {
  const workspace = source('components/app/app-workspace.jsx')
  const component = source('components/app/unified-profile-layers.jsx')
  const style = source('components/app/unified-profile-layers.module.css')
  assert.equal(workspace.split('<UnifiedProfileLayers data={data} locale={locale} />').length-1, 2)
  for (const area of ['foundation','state','life','development'])
    assert.ok(component.includes('data-profile-layer={layer.id}'), area)
  assert.match(component, /data-not-assessed/)
  assert.match(component, /data-profile-goals-status/)
  assert.match(component, /appFetch\('development-goals', undefined, 'GET'/)
  assert.match(component, /response\.revision > 0/)
  assert.match(component, /portfolio#hh-development-program/)
  assert.match(component, /<Link href=\{root \+ '\/course'\}/)
  assert.match(component, /encodeURIComponent\(row\.resultId\)/)
  assert.doesNotMatch(component, /localStorage|analytics|pixel|fetch\('\/api\/crm'/)
  assert.match(style, /@media\(max-width:350px\)/)
  assert.match(style, /focus-visible/)
})

test('optional fifth Ready slide offers Google handoff without silent guest import', () => {
  const builder = source('components/personality-profiles-builder.tsx')
  const css = source('components/personality-profiles-builder.module.css')
  const page = source('app/[locale]/personality-profiles/page.tsx')
  assert.ok(builder.indexOf('data-profile-google-cabinet-offer') > builder.indexOf('data-profile-test-review-slide'))
  assert.ok(builder.includes('data-profile-google-signin'))
  assert.ok(builder.includes('data-profile-review-tests'))
  assert.ok(builder.includes('makeTestSelectionIntent(selectedKeys)'))
  assert.ok(builder.includes('PENDING_TEST_SELECTION_KEY'))
  assert.ok(builder.includes('window.sessionStorage.setItem'))
  assert.ok(builder.includes('auth/contact-profile'))
  assert.ok(builder.includes('continueTo: "tests"'))
  assert.ok(builder.includes('/app/tests?selection=pending'))
  for (const locale of ['en','ru','es']) assert.ok(builder.includes(locale + ': {'))
  assert.ok(builder.includes('No guest answers or guest results are imported into the Google account.'))
  assert.doesNotMatch(builder, /guestAnswers|results\/import/)
  assert.ok(css.includes('.accountOffer'))
  assert.ok(!page.includes('business, wellbeing or comprehensive profile'))
  const ts = require('typescript')
  const parsed = ts.transpileModule(builder, {
    fileName:'personality-profiles-builder.tsx',
    reportDiagnostics:true, compilerOptions:{ module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX },
  })
  const errors = parsed.diagnostics.filter(x => x.category === ts.DiagnosticCategory.Error)
  assert.deepEqual(errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText, '\n')), [])
})
