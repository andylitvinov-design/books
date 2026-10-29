import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { PROFILE_RESEARCH_AXES, rankProfileAxisTests, recommendProfileTopThreeTests } from '../lib/profile/profile-scale-selection.js'

const builder = readFileSync(new URL('../components/personality-profiles-builder.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../components/personality-profiles-builder.module.css', import.meta.url), 'utf8')
const section = builder.slice(builder.indexOf('{step === 3 && <section'), builder.indexOf('{step === 4 && <section'))

test('the three wellbeing headings and hints are distinct in EN/RU/ES; source axes remain intact', () => {
  const expected = {
    en: ['Emotions & stress', 'Energy & rest', 'Body sensations'],
    ru: ['Эмоции и стресс', 'Энергия и отдых', 'Телесные ощущения'],
    es: ['Emociones y estrés', 'Energía y descanso', 'Sensaciones corporales'],
  }
  for (const [locale, headings] of Object.entries(expected)) {
    const part = builder.slice(builder.indexOf('  ' + locale + ': {'), builder.indexOf('  ' + locale + ': {') + 10000)
    assert.ok(headings.every(title => part.includes('"' + title + '"')), locale + ': all headings present')
    assert.equal(new Set(headings.map(x => x.toLocaleLowerCase(locale))).size, 3)
  }
  const body = PROFILE_RESEARCH_AXES.body.find(axis => axis.id === 'body_energy')
  assert.equal(body.sourceAxis, 'energy', 'unchanged source-defined scorer dimension')
  assert.deepEqual(body.label, {
    en: 'Body comfort (self-report)', ru: 'Телесный комфорт (самоотчёт)',
    es: 'Confort corporal (autoinforme)',
  })
  assert.deepEqual(PROFILE_RESEARCH_AXES.recovery.map(x => x.sourceAxis), ['sleep', 'energy'])
  assert.deepEqual(PROFILE_RESEARCH_AXES.body.map(x => x.sourceAxis), ['embodiment', 'energy'])
})

test('compact All / Scales / Professional appears after the top three and before other tests', () => {
  const recommended = section.indexOf('data-profile-recommended-tests')
  const filter = section.indexOf('data-profile-additional-kind-filter')
  const other = section.indexOf('data-profile-five-more-tests')
  assert.ok(recommended !== -1 && filter > recommended && other > filter)
  assert.ok(!section.includes('<fieldset className={styles.batteryModes}'))
  assert.ok(section.includes('(["all", "questionnaires", "pro"] as const)'))
  assert.ok(section.includes('aria-pressed={batteryMode === mode}'))
  for (const option of ['Все', 'Шкалы', 'Профессиональные', 'All', 'Scales', 'Professional',
    'Todas', 'Escalas', 'Profesionales']) assert.ok(builder.includes('"' + option + '"'), option)
  assert.ok(styles.includes('.batteryModeChoices button{display:inline-flex'))
  assert.match(styles, /\.batteryModeChoices button\{[^}]*min-height:44px/)
  assert.ok(styles.includes('.batteryModeChoices button:focus-visible'))
  assert.ok(section.includes('checked={selectedKeys.includes(test.key)}'))
  assert.ok(builder.includes('const [selectedKeys, setSelectedKeys] = useState<string[]>([]);'))
  assert.ok(!builder.includes('selectedByMode'), 'there is one plan, not separate hidden selections')
})

test('all eligible source types are discoverable, but blocked/hobby/paid tests stay excluded', () => {
  const tests = [
    { key: 'quick', testKind: 'monitoring', free: true, rightsStatus: 'cleared', selectable: true },
    { key: 'pro', testKind: 'professional', free: true, rightsStatus: 'cleared', selectable: true },
    { key: 'restricted', testKind: 'professional', rightsStatus: 'restricted' },
    { key: 'paid', testKind: 'monitoring', free: false },
    { key: 'hobby', testKind: 'hobby', free: true },
    { key: 'optin', testKind: 'professional', explicitOptIn: true },
  ]
  const groups = [{ area: 'recovery', scales: tests.map(test =>
    ({ id: test.key + '::energy', testKey: test.key, researchAxisId: 'recovery::energy' })) }]
  const selected = ['quick::energy']
  assert.deepEqual(rankProfileAxisTests(tests, groups, selected, 'all').map(x => x.key), ['quick', 'pro'])
  assert.deepEqual(rankProfileAxisTests(tests, groups, selected, 'questionnaires').map(x => x.key), ['quick'])
  assert.deepEqual(rankProfileAxisTests(tests, groups, selected, 'pro').map(x => x.key), ['pro'])
  assert.deepEqual(recommendProfileTopThreeTests(tests, groups, selected, 'all'), ['quick', 'pro'])
  assert.deepEqual(rankProfileAxisTests(tests, groups, selected, 'invalid'), [])
})
