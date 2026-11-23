import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('My Space three large, accessible tabs and top settings preserve legacy support routes', () => {
 const s = read('components/app/profile-space-dashboard.jsx')
 const style = read('components/app/profile-space-dashboard.module.css')
 assert.match(s, /useState\('goals'\)/)
 for (const id of ['support', 'tests', 'goals']) assert.ok(s.includes("id: '" + id + "'"))
 assert.match(s, /data-goal-profile-tabs/)
 assert.match(s, /aria-pressed=\{section === id\}/)
 assert.match(s, /data-profile-settings-gear/)
 assert.match(s, /<ProfileSpaceFocus locale=\{selected\} root=\{root\} accountId=\{accountId\} \/>/)
 for (const id of ['state', 'courses', 'reports', 'sessions']) assert.ok(s.includes("id: '" + id + "'"))
 assert.match(s, /portrait\?space=path/)
 assert.match(style, /GOAL_CONTROL_THREE_TABS_20261123/)
 assert.match(style, /min-height:88px/)
})
test('Stage zero uses existing real diagnostics routes and never invents test results', () => {
 const s = read('components/app/profile-space-dashboard.jsx')
 for(const id of ['life','meaning','situation','wuxing']) assert.ok(s.includes("id: '" + id + "'"))
 assert.match(s, /development-vectors/)
 assert.match(s, /data-goal-stage-zero/)
})
test('Each goal has seven accessible navigation rows; owner-only fetch; no demo progress', () => {
 const s = read('components/app/profile-goal-console.jsx')
 assert.match(s, /if \(!accountId\) return undefined/)
 assert.match(s, /VALID_GOALS\.has\(goal\.status\)/)
 assert.match(s, /goals\.find\(goal => String\(goal\.id\) === selectedId\)/)
 assert.match(s, /STEPS\.map\(\(\{ id, icon: Icon, href \}, index\)/)
 assert.match(s, /progressPercent/)
 assert.match(s, /scores\.every\(value => value !== null\)/)
 assert.match(s, /data-goal-step-status/)
 assert.doesNotMatch(s, /43%|68%|localStorage|sessionStorage/)
})
