import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clientMessagePushPayload} from '../lib/app/notification-contract.js'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('standard RFC4122 consultation IDs survive the push sender, unlike the broken truncated pattern',()=>{
  const id='11111111-1111-4111-8111-111111111111'
  assert.deepEqual(clientMessagePushPayload('ru',id),
    {kind:'client-message',locale:'ru',requestId:id})
  assert.throws(()=>clientMessagePushPayload('en','11111111-1111-4111-8111111111111'))
  assert.throws(()=>clientMessagePushPayload('en','https://example.invalid/private'))
  assert.throws(()=>clientMessagePushPayload('en','../outside'))
})
test('a new user must independently opt into message alerts, not inherit course push consent',()=>{
  const settings=read('components/app/notification-settings.jsx')
  const repo=read('lib/app/notification-repository.js')
  assert.match(settings,/\[messages,setMessages\]=useState\(false\)/)
  assert.match(settings,/setMessages\(Boolean\(value.messageAlerts\)\)/)
  assert.doesNotMatch(settings,/setMessages\(value.enabled\?Boolean\(value.messageAlerts\):true\)/)
  assert.match(settings,/checked=\{messages\}/)
  assert.match(repo,/messageAlerts:prefs\?\.message_alerts\?\?false/)
  assert.match(settings,/hh-phone-notifications/)
})
test('installation instructions and native install prompt are visible in Cabinet settings and consultations',()=>{
  const prompt=read('components/app/install-holistic-house.jsx')
  const cabinet=read('components/app/app-workspace.jsx')
  assert.match(prompt,/beforeinstallprompt/)
  assert.match(prompt,/appinstalled/)
  assert.match(prompt,/onPwaInstallPrompt\(/)
  assert.match(prompt,/requestPwaInstallation\(\)/)
  assert.doesNotMatch(prompt,/addEventListener\('beforeinstallprompt'/)
  assert.match(prompt,/isNativePlatform/)
  assert.match(prompt,/На экран «Домой»/)
  assert.match(prompt,/Add to Home Screen/)
  assert.match(prompt,/display-mode: standalone/)
  assert.match(cabinet,/import InstallHolisticHouse/)
  assert.equal((cabinet.match(/<InstallHolisticHouse locale=\{locale\}/g)||[]).length,2)
  assert.match(cabinet,/settings#hh-phone-notifications/)
  assert.match(cabinet,/autoOpen=\{requestedMessageId === request.id \|\| Number\(request.newMessageCount\)>0\}/)
})
test('manifest and Service Worker remain scoped and do not cache private consultation pages',()=>{
  const manifest=JSON.parse(read('public/holistic-house-app.webmanifest'))
  const worker=read('public/sw.js')
  assert.equal(manifest.display,'standalone')
  assert.equal(manifest.id,'/en/app')
  assert.match(worker,/importScripts\('\/course-notifications-sw.js'\)/)
  assert.match(worker,/PRIVATE_PREFIXES/)
  assert.match(worker,/network-only/)
  assert.doesNotMatch(worker,/localStorage/)
})

test('public mobile-install PR runs source and consent contracts; full browser/install artifacts run after merge', () => {
  const yaml=read('.github/workflows/holistic-house-mobile-install.yml')
  assert.match(yaml, /ready_for_review/)
  for (const name of [
    'Build public phone installation pages without credentials',
    'Install Chromium and WebKit for real public iPhone installation QA',
    'Check EN/RU install pages and real PNG icons',
  ]) {
    assert.ok(yaml.includes('- name: '+name+"\n        if: github.event_name != 'pull_request'"),
      'ordinary PR must skip duplicate mobile browser matrix: '+name)
  }
  assert.ok(yaml.includes("if: always() && github.event_name != 'pull_request'"))
  assert.match(yaml, /^  push:/m)
  assert.match(yaml, /tests\/holistic-house-install-push-regression\.test\.mjs/)
  assert.match(yaml, /node --test tests\/holistic-house-pwa\.test\.mjs/)
  assert.doesNotMatch(yaml, /continue-on-error:\s*true/)
})
