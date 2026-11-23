import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')

test('Guest and empty goal state shows all seven practice entry points without bogus progress', () => {
  const src = read('components/app/profile-goal-console.jsx')
  assert.match(src, /const records = STEPS\.map/)
  assert.match(src, /data-goal-empty-state/)
  assert.match(src, /<h2 className=\{css\.stepsTitle\}>\{t\.plan\}<\/h2>/)
  assert.match(src, /STEPS\.map\(\(\{ id, icon: Icon, href \}, index\)/)
  assert.match(src, /data-goal-step-status=\{selected && records\[index\]\?\.status \|\| 'explore'\}/)
  assert.match(src, /\{selected && value !== null && <span className=\{css\.progressTrack\}>/)
  assert.match(src, /if \(!accountId\) return undefined/)
  assert.doesNotMatch(src, /43%|68%|localStorage|sessionStorage/)
})
test('Compact scoped profile style preserves legible primary text and bottom-dock clearance', () => {
  const js = read('components/app/profile-space-dashboard.jsx')
  const css = read('components/app/profile-space-dashboard.module.css')
  const stepsCss = read('components/app/profile-goal-console.module.css')
  assert.match(js, /data-profile-space-section=\{section\}/)
  assert.match(css, /OWNER_MOBILE_PROFILE_COMPACT_20261123/)
  assert.match(css, /padding-bottom:calc\(128px \+ env\(safe-area-inset-bottom, 0px\)\)/)
  assert.match(css, /\.profileTabs small\{display:none\}/)
  assert.match(css, /\.scenic:has\(\.focusRow\)/)
  assert.match(css, /min-height:109px/)
  assert.match(stepsCss, /OWNER_MOBILE_GOAL_COMPACT_20261123/)
  assert.match(stepsCss, /\.step\{min-height:66px/)
})
test('Existing support routes, diagnostics and settings remain discoverable', () => {
 const src = read('components/app/profile-space-dashboard.jsx')
 assert.match(src, /data-profile-settings-gear/)
 assert.match(src, /data-goal-profile-tabs/)
 for (const route of ['portrait?space=path','portrait?space=reports','portrait?space=sessions','development-vectors'])
   assert.ok(src.includes(route), route)
 for(const tab of ['support', 'tests', 'goals'])assert.ok(src.includes("id: '"+tab+"'"))
})
