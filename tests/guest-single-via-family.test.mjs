import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { groupViaRecommendations, resolveViaProfile, isStandaloneViaKey, VIA_PROFILE_KEY } from '../lib/assessments/via-family.js'

const src = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const eligible = (key = 'hh-current-state') => ({
  key, selectable: true, startable: true, guestEligible: true, rightsStatus: 'cleared',
  definition: { key, version: 'v2', instrumentLocale: 'en' },
})

test('24 short IPIP strengths + 3 core scales are collapsed, full profile is a distinct optional card', () => {
  const standalone = Array.from({ length: 24 }, (_, i) => ({ key: 'ipip-via-r-strength-' + i + '-4' }))
    .concat(Array.from({ length: 3 }, (_, i) => ({ key: 'ipip-via-r-core-' + i + '-6' })))
  const entries = [{ key: 'phq-4' }, ...standalone, { key: VIA_PROFILE_KEY }, { key: 'mini-ipip-20' }]
  const compact = groupViaRecommendations(entries)
  assert.equal(compact.individualCount, 27)
  assert.equal(compact.collapsedCount, 27)
  assert.equal(compact.profile.key, VIA_PROFILE_KEY)
  assert.deepEqual(compact.visible.map(e => e.key), ['phq-4', 'mini-ipip-20'])
  const selected = groupViaRecommendations(entries, new Set([standalone[2].key]))
  assert.equal(selected.collapsedCount, 26)
  assert.ok(selected.visible.some(e => e.key === standalone[2].key), 'selected short form cannot disappear')
  const expanded = groupViaRecommendations(entries, [], true)
  assert.equal(expanded.collapsedCount, 0)
  assert.equal(expanded.visible.length, 29)
  assert.equal(isStandaloneViaKey(VIA_PROFILE_KEY), false)
  assert.equal(isStandaloneViaKey('ipip-via-r-core-positivity-6'), true)
  assert.equal(isStandaloneViaKey('cfpb-financial-wellbeing-5'), false)
})

test('complete VIA 96 is available even when short-form ranking omits it, but never ignores filters', () => {
  const shortForms = Array.from({length: 27}, (_, i) => ({ key: 'ipip-via-r-strength-' + i + '-4' }))
  const group = groupViaRecommendations(shortForms)
  const full = { key: VIA_PROFILE_KEY, selectable: true, startable: true, rightsStatus: 'cleared', durationMinutes: 18, questionCount: 96 }
  assert.equal(group.profile, null)
  assert.equal(group.individualCount, 27)
  assert.equal(resolveViaProfile(group, full), full)
  assert.equal(resolveViaProfile(group, full, [], {maxMinutes: 5}), null)
  assert.equal(resolveViaProfile(group, full, [], {testKinds: ['monitoring']}), null)
  assert.equal(resolveViaProfile(group, full, [VIA_PROFILE_KEY], {maxMinutes:5}), full, 'manual selection stays visible')
  assert.equal(resolveViaProfile(group, {...full, rightsStatus:'review_required'}), null)
  assert.equal(resolveViaProfile(group, {...full, selectable:false}), null)
  assert.equal(resolveViaProfile(groupViaRecommendations([]), full), null)
  const picker=src('components/app/simple-test-picker.jsx')
  const explorer=src('components/app/test-explorer.jsx')
  assert.match(picker, /resolveViaProfile\(via, viaProfileEntry, selectedKeys/)
  assert.match(picker, /onStartSingle\?\.\(fullVia\)/)
  assert.match(explorer, /viaProfileEntry=\{entries\.find\(\(entry\) => entry\.key === 'ipip-via-r-strengths-96'/)
})

function publicHarness({ withGuestCallback = true, guestHandler = async () => {} } = {}) {
  const navigation = [], guest = []
  const exported = {}
  const jsx = (type, props) => ({ type, props })
  const compiled = ts.transpileModule(src('components/app/public-test-explorer.jsx'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(compiled, {
    exports: exported,
    require: (name) => {
      if (name === 'react') return { useState(initial) { return [initial, () => {}] } }
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' }
      if (name === 'next/navigation') return { useRouter() { return { push(route) { navigation.push(route) } } } }
      if (name === './test-explorer') return { TestExplorer: 'TestExplorer' }
      if (name === '@/lib/inner-growth/course-entry-intent') return {
        COURSE_ENTRY_INTENT_KEY: 'course',
        makeCourseEntryIntent() { return 'draft' },
      }
      throw new Error('Unexpected dependency: ' + name)
    },
    window: { sessionStorage: { setItem() { throw new Error('Test-start must not write to browser storage') } } },
  })
  const props = { locale: 'en', embedded: true }
  if (withGuestCallback) props.onGuestStart = async entries => {
    guest.push(entries.map(entry => entry.key))
    await guestHandler(entries)
  }
  const node = exported.PublicTestExplorer(props)
  const find = (n) => {
    if (!n || typeof n !== 'object') return null
    if (n.type === 'TestExplorer') return n
    const children = n.props?.children
    if (Array.isArray(children)) return children.map(find).find(Boolean) || null
    return children ? find(children) : null
  }
  const explorer = find(node)
  assert.ok(explorer?.props?.onStart)
  return { navigation, guest, onStart: explorer.props.onStart }
}

test('one eligible anonymous test opens existing guest runner, without OAuth', async () => {
  const h = publicHarness()
  await h.onStart([eligible()], { focus: ['stress'] })
  assert.deepEqual(h.guest, [['hh-current-state']])
  assert.deepEqual(h.navigation, [])
})

test('a full selection of eligible tests starts guest runner without Google', async () => {
  const h = publicHarness()
  await h.onStart([eligible(), eligible('mini-ipip-20')], { focus: ['mood'] })
  assert.deepEqual(h.guest, [['hh-current-state', 'mini-ipip-20']])
  assert.deepEqual(h.navigation, [])
})

test('guest-ineligible or unlicensed tests fail closed', async () => {
  for (const list of [
    [{ ...eligible('phq-9'), guestEligible: false }],
    [{ ...eligible('restricted-test'), rightsStatus: 'review_required' }],
    Array.from({ length: 13 }, (_, i) => eligible('test-' + i)),
    [],
  ]) {
    const h = publicHarness()
    await assert.rejects(h.onStart(list), /GUEST_TEST_UNAVAILABLE/)
    assert.deepEqual(h.guest, [])
    assert.deepEqual(h.navigation, [])
  }
})

test('dedicated public explorer joins the existing guest runner with public keys only', async () => {
  const h = publicHarness({ withGuestCallback: false })
  await h.onStart([eligible(), eligible('mini-ipip-20')])
  assert.deepEqual(h.navigation, ['/en/client?startTests=hh-current-state%2Cmini-ipip-20'])
})

test('guest entry starts on a single CTA, with a visible privacy notice and protected catalog', () => {
  const cabinet = src('components/app/cabinet-landing.jsx')
  const publicFlow = src('components/app/public-test-explorer.jsx')
  const picker = src('components/app/simple-test-picker.jsx')
  const css = src('components/app/simple-test-picker.module.css')
  assert.match(cabinet, /onGuestStart=\{beginGuestBattery\}/)
  assert.doesNotMatch(cabinet, /setPhase\('consent'\)|Before you start|checked=\{adult\}|checked=\{necessary\}/)
  assert.match(cabinet, /await bootstrapForStartedTest\(\)/)
  assert.match(cabinet, /item\.rightsStatus !== 'cleared'/)
  assert.match(cabinet, /item\.rightsStatus === 'cleared'/)
  assert.match(cabinet, /guestFetch\('guest\/session'/)
  assert.match(cabinet, /guestFetch\('guest\/test-plans'/)
  assert.match(cabinet, /sourceKind: 'guest_result'/)
  assert.match(cabinet, /await startRun\(next, plan.id\)/)
  assert.match(picker, /data-guest-start-notice/)
  assert.match(src('components/app/test-explorer.jsx'), /data-guest-start-notice/)
  assert.match(src('components/app/mood-checkin.jsx'), /data-guest-start-notice/)
  assert.match(publicFlow, /entry\?\.rightsStatus === 'cleared'/)
  assert.match(publicFlow, /entry\?\.guestEligible === true/)
  assert.match(picker, /data-via-family/)
  assert.match(picker, /aria-expanded=\{showIndividualVia\}/)
  assert.match(picker, /groupViaRecommendations\(recommendations, selectedKeys, showIndividualVia\)/)
  assert.match(css, /\.shell \.viaFamilyActions \.takeTest/)
  assert.match(picker, /наборы проходятся без регистрации/)
})
