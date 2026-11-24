import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('My Space three accessible tabs preserve the goal console and account settings', () => {
 const s = read('components/app/profile-space-dashboard.jsx')
 const style = read('components/app/profile-space-dashboard.module.css')
 assert.match(s, /useState\('clarity'\)/)
 for (const id of ['clarity', 'goals', 'business']) assert.ok(s.includes("id: '" + id + "'"))
 assert.match(s, /data-goal-profile-tabs/)
 assert.match(s, /aria-pressed=\{section === id\}/)
 assert.match(s, /data-profile-settings-link/)
 assert.match(s, /<ProfileSpaceFocus locale=\{selected\} root=\{root\} accountId=\{accountId\} \/>/)
 for (const id of ['state', 'courses', 'reports', 'sessions']) assert.ok(s.includes("id: '" + id + "'"))
 assert.match(s, /my-coaching-plan/)
 assert.match(style, /GOAL_CONTROL_THREE_TABS_20261123/)
 assert.match(style, /PROFILE_THREE_DESTINATIONS_20261124/)
})
test('Stage zero uses existing real diagnostics routes and never invents test results', () => {
 const s = read('components/app/profile-space-dashboard.jsx')
 for(const id of ['life','meaning','situation','wuxing']) assert.ok(s.includes("id: '" + id + "'"))
 assert.match(s, /development-vectors/)
 assert.match(s, /data-clarity-stage/)
})
test('Each goal has eight accessible navigation rows; owner-only fetch; no demo progress', () => {
 const s = read('components/app/profile-goal-console.jsx')
 assert.match(s, /if \(!accountId\) return undefined/)
 assert.match(s, /VALID_GOALS\.has\(goal\.status\)/)
 assert.match(s, /const selected = goals\[0\] \|\| null/)
 assert.match(s, /data-profile-goal-link=\{goal.id\}/)
 assert.match(s, /data-profile-goal-summary/)
 assert.match(s, /STEPS\.map\(\(\{ id, icon: Icon \}, index\)/)
 assert.match(s, /progressPercent/)
 assert.match(s, /guideGoalProgress\(courseView.entries, goalId\)/)
 assert.match(s, /data-goal-step-status/)
 assert.doesNotMatch(s, /43%|68%|localStorage|sessionStorage/)
})
