import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')

test('My Space keeps four functional photo cards and separate page/settings controls', () => {
  const dashboard=read('components/app/profile-life-dashboard.jsx')
  const hub=read('components/app/profile-hub-tabs.jsx')
  const styles=read('components/app/profile-life-dashboard.module.css')
  for (const name of ['state','courses','reports','sessions']) {
    assert.match(dashboard, new RegExp("id: '"+name+"'"))
    assert.match(styles, new RegExp('data-photo="'+name+'"'))
  }
  assert.match(dashboard,/data-profile-primary-path/)
  assert.match(dashboard,/data-profile-my-page/)
  assert.match(dashboard,/data-profile-settings-link/)
  assert.match(dashboard,/wide \/>/)
  assert.match(hub,/state: root \+ '\/portfolio'/)
  assert.match(hub,/sessions: root \+ '\/portrait\?space=sessions'/)
  assert.match(hub,/current === 'today' && <ProfileLifeDashboard/)
  assert.ok(existsSync(new URL('../public/images/holistic-house/my-space-cards.webp',import.meta.url)))
})

test('Sessions uses the existing private saved-consultations source without fabricated appointments',()=>{
  const workspace=read('components/app/app-workspace.jsx')
  const switcher=read('components/master-mode-switch.tsx')
  assert.match(workspace,/data-profile-sessions/)
  assert.match(workspace,/SavedSessionsPanel items=\{data\.savedSessions \|\| \[\]\}/)
  assert.match(workspace,/data-profile-extra-actions/)
  assert.match(switcher,/wide\?: boolean/)
  assert.match(switcher,/wide \? t\.life : 'Live'/)
})
