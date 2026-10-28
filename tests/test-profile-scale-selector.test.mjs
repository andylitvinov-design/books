import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { LIFE_TEST_PROFILES, findLifeTestProfile, selectedLifeProfileAxes, profileAxisSelection } from '../lib/profile/life-test-profiles.js'
import { TEST_EXPLORER_AXES, buildExplorerEntries, filterExplorerEntries } from '../lib/assessments/test-explorer.js'

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('four canonical life profiles have unique keys, localized labels and only real catalog scales', () => {
  assert.deepEqual(LIFE_TEST_PROFILES.map(({ key }) => key), ['wellbeing', 'relationships', 'work', 'identity'])
  for (const profile of LIFE_TEST_PROFILES) {
    assert.strictEqual(findLifeTestProfile(profile.key), profile)
    assert.ok(profile.axes.length >= 4)
    assert.equal(new Set(profile.axes).size, profile.axes.length)
    assert.ok(profile.axes.every((axis) => TEST_EXPLORER_AXES.includes(axis)))
    for (const locale of ['en', 'ru', 'es']) {
      assert.ok(profile.label[locale]?.length > 6)
      assert.ok(profile.detail[locale]?.length > 10)
    }
  }
  assert.equal(findLifeTestProfile('not-a-profile'), null)
})

test('user can check zero, one or ALL of a profile\'s scales; unknown/stale scales never leak', () => {
  const profile = LIFE_TEST_PROFILES[0]
  assert.deepEqual(selectedLifeProfileAxes(profile.key, []), profile.axes)
  assert.deepEqual(profileAxisSelection(profile.key, [profile.axes[0], profile.axes[0], 'salary', 'personality']), [profile.axes[0]])
  const checked = [...profile.axes]
  assert.deepEqual(selectedLifeProfileAxes(profile.key, checked), checked)
  assert.deepEqual(selectedLifeProfileAxes('work', checked), findLifeTestProfile('work').axes)
  assert.deepEqual(selectedLifeProfileAxes('invalid', ['stress']), [])
  assert.deepEqual(profileAxisSelection('invalid', ['stress']), [])
})

test('several selected scales use OR inside the existing rights-filtered catalog, not AND', () => {
  const entries = buildExplorerEntries({ locale: 'en', audience: 'guest' })
  const profile = findLifeTestProfile('wellbeing')
  const axisA = filterExplorerEntries(entries, { availability: 'available', axes: [profile.axes[0]] })
  const axisB = filterExplorerEntries(entries, { availability: 'available', axes: [profile.axes[1]] })
  const either = filterExplorerEntries(entries, { availability: 'available', axes: [profile.axes[0], profile.axes[1]] })
  assert.ok(axisA.length > 0 && axisB.length > 0)
  for (const item of [...axisA, ...axisB]) assert.ok(either.some((entry) => entry.key === item.key))
  assert.ok(either.every((entry) => entry.selectable === true))
  const constrained = filterExplorerEntries(entries, { availability: 'available', axes: selectedLifeProfileAxes(profile.key, []) })
  assert.ok(constrained.length >= either.length)
  assert.ok(constrained.length < filterExplorerEntries(entries, { availability: 'available' }).length)
})

test('the guest and signed-in filters show profile first, scale second and existing eligible tests afterward', () => {
  const picker = source('components/app/simple-test-picker.jsx')
  const explorer = source('components/app/test-explorer.jsx')
  const profileIndex = picker.indexOf('data-test-profile-filter')
  const scalesIndex = picker.indexOf('data-profile-scale-filter')
  const testsIndex = picker.indexOf('id="hh-simple-recommendations"')
  assert.ok(profileIndex > 0 && scalesIndex > profileIndex && testsIndex > scalesIndex)
  assert.match(picker, /LIFE_TEST_PROFILES\.map/)
  assert.match(picker, /currentProfile\.axes\.map/)
  assert.match(picker, /aria-pressed=\{selectedScales\.includes\(key\)\}/)
  assert.match(picker, /onSetScales\?\.\(\[\.\.\.currentProfile\.axes\]\)/)
  assert.match(explorer, /const profileScales = useMemo/)
  assert.match(explorer, /axes: profileScales/)
  assert.match(explorer, /setSelectedKeys\(\[\]\)/)
  assert.match(explorer, /onToggleScale=\{toggleProfileScale\}/)
  assert.match(explorer, /data-test-profile-filter/)
  assert.match(explorer, /data-profile-scale-filter/)
  assert.match(explorer, /activeProfile\?\.axes \|\| TEST_EXPLORER_AXES/)
  assert.match(explorer, /const selected = entries\.filter\(\(entry\) => selectedKeys\.includes\(entry\.key\) && entry\.selectable\)/)
})

test('the responsive scale controls stay tappable on narrow phones', () => {
  const css = source('components/app/simple-test-picker.module.css')
  const fullCss = source('components/app/test-explorer.module.css')
  assert.match(css, /\.lifeProfileGrid\{display:grid/)
  assert.match(css, /@media\(max-width:560px\)\{\.lifeProfileGrid\{grid-template-columns:1fr/)
  assert.match(css, /\.lifeScaleChip\{[^}]*min-height:44px/)
  assert.match(fullCss, /@media\(max-width:560px\)\{\.lifeProfileOptions\{grid-template-columns:1fr/)
})
