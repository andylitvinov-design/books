import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { suggestedAvailableKeys } from '../lib/assessments/available-alternatives.js'

test('copyright-gated originals remain non-startable while topic-related cleared tests can be chosen', () => {
  for (const locale of ['en', 'ru']) {
    const entries = buildExplorerEntries({ locale, audience: 'account' })
    const byKey = new Map(entries.map((entry) => [entry.key, entry]))
    for (const key of ['who-5', 'wemwbs-14', 'bdi-ii', 'bai-21', 'iip-32', 'pss-10']) {
      const reference = byKey.get(key)
      assert.ok(reference, key)
      assert.equal(reference.selectable, false, key + ' must stay rights-gated')
      assert.equal(reference.definition, null, key + ' must have no protected questionnaire form')
      assert.ok(reference.relatedAvailable?.length > 0, key + ' should offer an independently available topic option')
      for (const related of reference.relatedAvailable) {
        assert.notEqual(related.key, reference.key)
        const target = byKey.get(related.key)
        assert.ok(target?.selectable, related.key + ' is actually startable')
        assert.equal(target.title, related.title)
      }
    }
    assert.ok(byKey.get('bdi-ii').relatedAvailable.some((x) => x.key === 'phq-8'))
    assert.ok(byKey.get('who-5').relatedAvailable.some((x) => x.key === 'mhc-sf'))
    assert.ok(byKey.get('iip-32').relatedAvailable.some((x) => x.key === 'hh-relationship-balance'))
  }
})

test('never suggest a casual replacement for clinician-only, safety-managed, trauma or substance assessment', () => {
  const entries = buildExplorerEntries({ locale:'ru', audience:'account' })
  const byKey = new Map(entries.map((entry) => [entry.key, entry]))
  for (const key of ['mmpi-3', 'pai', 'c-ssrs-screener', 'ace-10', 'ctq-sf-28']) {
    const entry = byKey.get(key)
    assert.ok(entry, key)
    assert.equal(entry.selectable, false)
    assert.deepEqual(entry.relatedAvailable, [], key)
  }
  assert.deepEqual(suggestedAvailableKeys({key:'any',area:'substances',access:'account',rightsStatus:'rights_review'}), [])
  assert.deepEqual(suggestedAvailableKeys({key:'any',area:'mood',access:'clinician',rightsStatus:'rights_review'}), [])
})

test('guest never receives a suggested substitute which their current access cannot start', () => {
  const entries = buildExplorerEntries({ locale:'en', audience:'guest' })
  const byKey = new Map(entries.map((entry) => [entry.key, entry]))
  for (const entry of entries) for (const related of entry.relatedAvailable || []) {
    assert.equal(byKey.get(related.key)?.selectable, true, related.key)
  }
})

test('public catalogue explicitly explains difference and requires a click before selecting a related test', async () => {
  const source = await readFile(new URL('../components/app/test-explorer.jsx', import.meta.url), 'utf8')
  assert.match(source, /relatedAvailable/)
  assert.match(source, /not copies, translations or psychometric equivalents/)
  assert.match(source, /onClick=\{\(\) => chooseRelatedAlternative\(alternative\.key\)\}/)
  assert.match(source, /entries\.some\(\(entry\) => entry\.key === key && entry\.selectable\)/)
})
