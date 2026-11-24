import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const jsx = readFileSync(new URL('../components/app/psi-monitoring.jsx', import.meta.url), 'utf8')
const css = readFileSync(new URL('../components/app/psi-monitoring.css', import.meta.url), 'utf8')
const hub = readFileSync(new URL('../components/app/profile-hub-tabs.jsx', import.meta.url), 'utf8')

test('My State mobile uses real monitoring axis counts, not invented health ratings', () => {
  assert.match(jsx, /data-mobile-state-dashboard/)
  assert.match(jsx, /axisMarkers = axes.map/)
  assert.match(jsx, /data-measured=\{measured > 0\}/)
  assert.match(jsx, /value=\{completedCount\}/)
  assert.match(jsx, /not health percentages or diagnoses/)
  assert.doesNotMatch(jsx, /balanceScore|healthPercent|fakeBalance/)
})

test('One branded state header, big mobile controls, existing navigation and real actions', () => {
  assert.match(hub, /data-profile-state-life/)
  assert.match(hub, /data-profile-state-work/)
  assert.match(css, /min-height:62px/)
  assert.match(css, /@media\(max-width:360px\)/)
  assert.match(jsx, /'\/\' \+ locale \+ '\/app\/tests'/)
  assert.match(jsx, /'\/\' \+ locale \+ '\/app\/progress'/)
  assert.match(jsx, /onQuickCheckin=\{startStateAnalysis\}/)
  assert.match(jsx, /id=\{"psi-axis-" \+ axis\}/)
})
