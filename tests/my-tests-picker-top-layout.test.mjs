import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const dashboard = read('components/app/my-tests-dashboard.jsx')
const battery = read('components/app/account-test-battery.jsx')
const dashboardCss = read('components/app/my-tests-dashboard.module.css')
const batteryCss = read('components/app/account-test-battery.module.css')

test('My Tests shows the expandable matching-test picker before the title, progress and saved list', () => {
  const render = dashboard.slice(dashboard.indexOf('return <section'))
  const toggle = render.indexOf('id="my-tests-picker-toggle"')
  const picker = render.indexOf('{explorer}')
  const title = render.indexOf('className={styles.header}')
  const stats = render.indexOf('className={styles.stats}')
  const list = render.indexOf('{hasList && children}')

  assert.ok(toggle >= 0 && toggle < picker && picker < title && title < stats && stats < list)
  assert.match(render, /aria-controls="my-test-explorer" aria-expanded=\{filtersOpen\}/)
  assert.match(render, /filtersOpen \? c\.close : hasNewSelection \? c\.review : c\.choose/)
  assert.match(dashboard, /choose: 'Подобрать тесты'/)
  assert.match(dashboard, /choose: 'Choose matching tests'/)
  assert.match(dashboardCss, /\.filterButton\[aria-expanded=true\] \.filterChevron/)
  assert.match(dashboardCss, /@media \(max-width:760px\)/)
})

test('The account picker expands inline and retains its hidden draft without moving below the list', () => {
  assert.match(battery, /const explorerVisible = exploring/)
  assert.match(battery, /const explorerPanel = \(/)
  assert.match(battery, /\{\(explorerVisible \|\| explorerMounted\) && <>/)
  assert.match(battery, /<section id="my-test-explorer"/)
  assert.match(battery, /hidden=\{!explorerVisible\}/)
  assert.match(battery, /explorer=\{explorerPanel\}/)
  assert.equal((battery.match(/id="my-test-explorer"/g) || []).length, 1)
  assert.ok(battery.indexOf('const explorerPanel') < battery.indexOf('return <>'))
  assert.match(battery, /document\.getElementById\('my-tests-picker-toggle'\)/)
})

test('Saved test evidence spans the card width without squeezing its title and start action', () => {
  const row = battery.slice(battery.indexOf('<article key={row.definition.id}'), battery.indexOf('</article>'))
  assert.ok(row.includes('className={styles.rowActions}'))
  assert.ok(row.indexOf('className={styles.aboutTest}') > row.indexOf('className={styles.rowActions}'))
  assert.match(batteryCss, /\.aboutTest\{grid-column:1\/-1;/)
  assert.match(batteryCss, /\.row\{display:grid;/)
  assert.match(batteryCss, /\.explorerSection\{scroll-margin-top:92px;/)
})
