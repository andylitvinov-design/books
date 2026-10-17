import test from 'node:test'
import assert from 'node:assert/strict'
import { buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'
import { HOBBY_TEST_KEYS, testKindFor, testKindShortLabel } from '../lib/assessments/test-kinds.js'
import { assessmentMethodology } from '../lib/assessments/assessment-methodology.js'
import { MIND_BODY_MONITOR_REGISTRY } from '../data/assessments/mind-body-monitor-registry.js'

test('authored and hobby provenance takes precedence over reference storage and presentation style', () => {
  for (const key of HOBBY_TEST_KEYS) {
    assert.equal(testKindFor({ key, source: 'research' }), 'hobby', key)
  }
  for (const key of ['hh-daily-pulse', 'hh-current-state', 'hh-weekly-pulse', 'hh-monthly-profile']) {
    assert.equal(testKindFor({ key, source: 'research' }), 'monitoring', key)
    assert.equal(testKindFor({ key, catalog: { testStyle: 'professional', registrationRequired: true,
      startable: false, rightsStatus: 'cleared', sourceUrl: 'https://example.org/source' } }), 'monitoring', key)
  }
  assert.equal(testKindFor(), 'monitoring')
  assert.equal(testKindFor({ key: 'unknown-without-metadata' }), 'monitoring')
})

test('all 290 reviewed entries retain their purpose, with 145 active instruments', () => {
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'account' })
    assert.equal(entries.length, 290)
    const active = entries.filter(entry => entry.selectable)
    assert.equal(active.length, 145)
    assert.deepEqual(['monitoring', 'professional', 'hobby'].map(kind =>
      active.filter(entry => entry.testKind === kind).length), [67, 72, 6])
    for (const entry of entries) {
      const expected = HOBBY_TEST_KEYS.includes(entry.key) ? 'hobby'
        : entry.key.startsWith('hh-') || entry.key === 'functioning-review' ? 'monitoring' : 'professional'
      assert.equal(entry.testKind, expected, entry.key)
      if (entry.source === 'research') assert.equal(entry.selectable, false, entry.key)
    }
    const reference = entries.find(entry => entry.key === 'hh-daily-pulse')
    assert.equal(reference.source, 'research')
    assert.equal(reference.methodologyStatus, 'original')
    assert.equal(reference.definition, null)
    assert.equal(reference.startable, false)
    assert.equal(reference.selectable, false)
    assert.ok(testKindShortLabel(reference, locale))
    assert.ok(!filterExplorerEntries(entries, { kinds: ['professional'] }).some(entry => entry.key === reference.key))
  }
})

test('internal HH monitoring references never inherit published research evidence claims', () => {
  for (const research of MIND_BODY_MONITOR_REGISTRY.filter(row => row.category === 'hh_monitoring')) {
    for (const locale of ['en', 'ru']) {
      const about = assessmentMethodology({ key: research.key, research, locale })
      assert.equal(about.status, 'original', research.key)
      assert.equal(about.sourceUrl, null)
      assert.match(about.text, locale === 'ru' ? /Авторская шкала/ : /Original questionnaire/)
      assert.match(about.text, locale === 'ru' ? /недоступна/ : /not currently available/)
      assert.doesNotMatch(about.text, /Published psychological research|Исследовательская методика/)
    }
  }
})
