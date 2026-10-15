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

function publicHarness({ signedIn = false, guestHandler = async () => {} } = {}) {
  const requests = [], storage = [], redirects = [], navigation = [], guest = []
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
      if (name === '@/lib/app/test-selection-intent') return {
        PENDING_TEST_SELECTION_KEY: 'pending-test-selection',
        makeTestSelectionIntent(keys) { return JSON.stringify(keys) },
      }
      if (name === '@/lib/inner-growth/course-entry-intent') return {
        COURSE_ENTRY_INTENT_KEY: 'course',
        makeCourseEntryIntent() { return 'draft' },
      }
      throw new Error('Unexpected dependency: ' + name)
    },
    fetch: async (url, options = {}) => {
      requests.push({ url, method: options.method || 'GET', body: options.body || null })
      if (url === '/api/app/bootstrap') return {
        ok: signedIn, status: signedIn ? 200 : 401,
        json: async () => signedIn ? { account: { id: 'synthetic-owner' } } : { error: 'ACCOUNT_REQUIRED' },
      }
      if (url === '/api/app/test-plans') return { ok: true, status: 200, json: async () => ({ id: 'synthetic-plan' }) }
      if (url === '/api/app/auth/start') return { ok: true, status: 200, json: async () => ({ redirectUrl: 'https://example.invalid/oauth' }) }
      throw new Error('Unexpected HTTP call ' + url)
    },
    window: {
      sessionStorage: { setItem(key, value) { storage.push({ key, value }) } },
      location: { assign(url) { redirects.push(url) } },
    },
    crypto: { randomUUID() { return '00000000-0000-4000-8000-000000000000' } },
  })
  const node = exported.PublicTestExplorer({
    locale: 'en', embedded: true, onGuestStartSingle: async (entry) => {
      guest.push(entry.key)
      await guestHandler(entry)
    },
  })
  const find = (n) => {
    if (!n || typeof n !== 'object') return null
    if (n.type === 'TestExplorer') return n
    const children = n.props?.children
    if (Array.isArray(children)) return children.map(find).find(Boolean) || null
    return children ? find(children) : null
  }
  const explorer = find(node)
  assert.ok(explorer?.props?.onStart)
  return { requests, storage, redirects, navigation, guest, onStart: explorer.props.onStart }
}

test('one eligible anonymous test goes straight to existing guest consent flow, not OAuth or storage', async () => {
  const h = publicHarness()
  await h.onStart([eligible()], { focus: ['stress'] })
  assert.deepEqual(h.guest, ['hh-current-state'])
  assert.deepEqual(h.requests.map(r => r.url), ['/api/app/bootstrap'])
  assert.equal(h.storage.length, 0)
  assert.equal(h.redirects.length, 0)
  assert.equal(h.navigation.length, 0)
})

test('multiple anonymous tests or guest-ineligible tests still require Google and never start a guest run', async () => {
  for (const list of [[eligible(),eligible('mini-ipip-20')], [{ ...eligible('phq-9'),guestEligible: false }]]) {
    const h = publicHarness()
    await h.onStart(list, { focus: ['mood'] })
    assert.deepEqual(h.guest, [])
    assert.deepEqual(h.requests.map(r => r.url), ['/api/app/bootstrap', '/api/app/auth/start'])
    assert.equal(h.storage.length, 1)
    assert.equal(h.redirects.length, 1)
  }
})

test('signed-in single test remains account-owned plan without guest run or Google reauthentication', async () => {
  const h = publicHarness({signedIn: true})
  await h.onStart([eligible()], { focus: ['stress'] })
  assert.deepEqual(h.guest, [])
  assert.deepEqual(h.requests.map(r => r.url), ['/api/app/bootstrap', '/api/app/test-plans'])
  assert.deepEqual(h.navigation, ['/en/app/tests?plan=synthetic-plan'])
  assert.equal(h.storage.length, 0)
  assert.equal(h.redirects.length, 0)
})

test('client entry uses the existing server-backed consent-first guest runner and never bypasses eligibility', () => {
  const cabinet = src('components/app/cabinet-landing.jsx')
  const publicFlow = src('components/app/public-test-explorer.jsx')
  const picker = src('components/app/simple-test-picker.jsx')
  const css = src('components/app/simple-test-picker.module.css')
  assert.match(cabinet, /onGuestStartSingle=\{\(entry\) => begin\(entry\.key, null\)\}/)
  assert.match(cabinet, /setPhase\('consent'\)/)
  assert.match(cabinet, /item\.rightsStatus !== 'cleared'/)
  assert.match(cabinet, /item\.rightsStatus === 'cleared'/)
  assert.match(cabinet, /guestFetch\('guest\/session'/)
  assert.match(cabinet, /await startRun\(definition\)/)
  assert.match(publicFlow, /candidate\?\.rightsStatus === 'cleared'/)
  assert.match(publicFlow, /candidate\?\.guestEligible === true/)
  assert.match(picker, /data-via-family/)
  assert.match(picker, /aria-expanded=\{showIndividualVia\}/)
  assert.match(picker, /groupViaRecommendations\(recommendations, selectedKeys, showIndividualVia\)/)
  assert.match(css, /\.shell \.viaFamilyActions \.takeTest/)
  assert.match(picker, /создания и сохранения набора|составления и сохранения набора/)
})
