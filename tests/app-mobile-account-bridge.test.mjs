import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
test('public Support and Mandala expose private account settings without removing video export controls', () => {
  const mobile = read('components/holistic-support-mobile.tsx')
  const mandala = read('components/holistic-support-mandala-dock.tsx')
  const css = read('components/holistic-support-mobile.module.css')
  for (const [source, marker] of [[mobile,'data-support-mobile-account-settings'],[mandala,'data-mandala-account-settings']]) {
    assert.match(source, new RegExp(marker))
    assert.match(source, /locale === "es" \? "en" : locale/)
    assert.match(source, /\/app\/settings/)
  }
  assert.match(mandala, /data-video-export-menu-settings/)
  assert.match(mobile, /data-support-mobile-progress-link/)
  assert.match(css, /\.accountSettingsLink/)
})
test('onboarding submits visible name and selected goal through existing account-owned endpoint', () => {
  const app = read('components/app/app-workspace.jsx')
  const repo = read('lib/app/repository.js')
  assert.match(app, /displayName: values\.displayName \|\| ''/)
  assert.match(app, /goal: values\.goal/)
  assert.match(app, /page === 'settings' \? \{ continueTo: 'settings' \}/)
  assert.match(repo, /async onboarding\(actor, input\)/)
  assert.match(repo, /'displayName'/)
  assert.match(repo, /'goal'/)
})
test('protected OAuth settings continuation remains explicit and scope-limited', () => {
  const api = read('app/api/app/[...path]/route.js')
  assert.match(api, /'progress','settings','my-practice'/)
  assert.match(api, /continueTo === 'settings'/)
  assert.match(api, /\$\{origin\}\/\$\{locale\}\/app\/settings/)
})

test('Mandala progress opens the canonical private account; goal saves stay explicit', () => {
  const mandala = read('components/holistic-support-mandala-dock.tsx')
  const mobile = read('components/holistic-support-mobile.tsx')
  const app = read('components/app/app-workspace.jsx')
  assert.match(mandala, /data-mandala-account-progress/)
  assert.match(mandala, /\(locale === "es" \? "en" : locale\) \+ "\/app\/progress"/)
  assert.doesNotMatch(mandala, /#support-progress/)
  assert.match(mobile, /onSaveToCabinet=\{saveGoalProfileToCabinet\}/)
  assert.match(mobile, /data-support-account-video-mark/)
  assert.match(mobile, /separate explicit save actions/)
  assert.match(app, /<SupportGoalCabinet key=\{'support-goals:'\+data\.account\.id\}/)
})
