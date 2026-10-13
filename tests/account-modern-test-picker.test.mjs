import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('My tests reuses the current public picker and adds only explicitly chosen tests', () => {
  const battery = read('components/app/account-test-battery.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const picker = read('components/app/simple-test-picker.jsx')
  assert.match(battery, /audience="account" embedded simpleMode accountPicker explicitSelectionOnly/)
  assert.match(battery, /appendActive: !replaceActive/)
  assert.match(battery, /await create\(entriesToStart\.map\(\(entry\) => entry\.key\), false, selectionPreferences\)/)
  assert.match(explorer, /const activeBattery = explicitSelectionOnly \? selected/)
  assert.match(explorer, /!explicitSelectionOnly && !simpleSelectionChanged && !current\.length/)
  assert.match(picker, /Add selected tests/)
  assert.match(picker, /Добавить выбранные тесты/)
  assert.match(picker, /data-modern-test-picker/)
})

test('account filters, category invitations, Back and pending checkbox state survive view changes', () => {
  const battery = read('components/app/account-test-battery.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  assert.match(battery, /initialPreferences=\{explorerPreferences\}/)
  assert.match(battery, /focus: categoryFocus, areas: insightsCategory === 'wu-xing'/)
  assert.match(battery, /showExplorer \|\| explorerHasOpened/)
  assert.match(battery, /hidden=\{!showExplorer\}/)
  assert.match(battery, /onBack=\{backToMyTests\}/)
  assert.match(explorer, /const \[axes, setAxes\] = useState\(\(\) => initialPreferences\?\.axes \?\? \[\]\)/)
  assert.doesNotMatch(explorer, /setAxes\(\[\]\); setBrowseFull\(false\)/)
  assert.match(explorer, /onResetFilters=\{resetFilters\}/)
  const reset = explorer.match(/const resetFilters = \(\) => \{([^\n]+)\}/)?.[1]
  assert.ok(reset)
  assert.doesNotMatch(reset, /setSelectedKeys/)
  assert.match(battery, /const fromCourse = searchParams\.get\('course'\) === '1'/)
  assert.match(battery, /router\.replace\(fromCourse \? root \+ '\/course'/)
})
