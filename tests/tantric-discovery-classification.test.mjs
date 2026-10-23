import test from 'node:test'
import assert from 'node:assert/strict'
import { TANTRIC_REFLECTION_CATALOG, TANTRIC_REFLECTION_DEFINITIONS } from '../data/assessments/tantric-reflections-v1.js'
import { buildExplorerEntries } from '../lib/assessments/test-explorer.js'
import { testKindFor } from '../lib/assessments/test-kinds.js'

test('only the traditional symbolic Chakra construct is Hobby; five behavioral reflections remain Check-in', () => {
  const expected = {
    'hh-tantric-energy-sensitivity': 'monitoring',
    'hh-tantric-intimacy-connection': 'monitoring',
    'hh-sexual-freedom-inhibition': 'monitoring',
    'hh-chakra-kundalini-profile': 'hobby',
    'hh-tantra-development-levels': 'monitoring',
    'hh-tantric-personality-portrait': 'monitoring',
  }
  assert.deepEqual(TANTRIC_REFLECTION_CATALOG.map(row => row.key).sort(), Object.keys(expected).sort())
  for (const definition of TANTRIC_REFLECTION_DEFINITIONS) {
    const catalog = TANTRIC_REFLECTION_CATALOG.find(row => row.key === definition.key)
    assert.equal(testKindFor({ key: definition.key, definition, catalog }), expected[definition.key])
    assert.equal(testKindFor({ key: definition.key, source: 'research', definition, catalog }), expected[definition.key])
    assert.equal(definition.timeframe, 'past-30-days')
    assert.equal(definition.suggestedRepeatDays, 30)
  }
  for (const locale of ['en', 'ru']) {
    const active = buildExplorerEntries({ locale, audience: 'guest' }).filter(row => row.startable)
    assert.equal(active.length, 150)
    assert.deepEqual(['monitoring', 'professional', 'hobby'].map(kind => active.filter(row => row.testKind === kind).length), [67, 77, 6])
    for (const [key, kind] of Object.entries(expected)) assert.equal(active.find(row => row.key === key).testKind, kind)
  }
})
