import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (name) => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
test('public Client Cabinet includes the same interactive Test Explorer before account login', () => {
  const cabinet = read('components/app/cabinet-landing.jsx')
  const publicExplorer = read('components/app/public-test-explorer.jsx')
  const explorer = read('components/app/test-explorer.jsx')
  const styles = read('components/app/test-explorer.module.css')
  assert.match(cabinet, /<PublicTestExplorer locale=\{locale\} embedded\s*\/>/)
  assert.ok(cabinet.indexOf('<PublicTestExplorer') < cabinet.indexOf('className="cabinet-signin-strip'), 'one-click start must precede secondary account entry')
  assert.ok(cabinet.indexOf('<PublicTestExplorer') < cabinet.indexOf('<MoodCheckIn'), 'mood check-in is optional and must not block test start')
  assert.doesNotMatch(cabinet, /without signing in|можно подобрать и пройти без входа/)
  assert.match(publicExplorer, /<TestExplorer locale=\{locale\} audience="account" embedded=\{embedded\}/)
  assert.match(explorer, /embedded \? styles\.embedded/)
  assert.match(styles, /\.explorer \.battery\{position:static/)
  assert.match(styles, /\.customizer\[hidden\]\{display:none/)
  assert.match(explorer, /\[customizeOpen, setCustomizeOpen\] = useState\(false\)/)
  assert.match(explorer, /\[filtersOpen, setFiltersOpen\] = useState\(false\)/)
  assert.match(explorer, /onStart\(activeBattery\)/)
  assert.match(explorer, /aria-expanded=\{customizeOpen\}/)
  assert.match(explorer, /showAll \? visible : visible\.slice\(0, 8\)/)
  assert.match(cabinet, /<MoodCheckIn/)
})
