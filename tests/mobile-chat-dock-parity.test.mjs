import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const showcase = read('components/practice-showcase.jsx')
const cabinet = read('components/app/app-workspace.jsx')
const messagesDock = read('components/app/messages-bottom-navigation.jsx')
const showcaseCss = read('components/practice-showcase.module.css')
const cabinetCss = read('app/[locale]/app/[[...path]]/workspace.css')
const messagesCss = read('app/[locale]/app/messages/messages-page.css')

test('Practitioner preview and authenticated dashboard keep Messages as third tab', () => {
  const tabs = showcase.match(/const TABS = \[([\s\S]*?)\n\]/)?.[1]
  assert.ok(tabs, 'original five-tab bar must remain in the real PracticeShowcase')
  assert.deepEqual([...tabs.matchAll(/key:'([^']+)'/g)].map(match => match[1]),
    ['home','practice','messages','materials','profile'])
  assert.match(tabs, /\{ key:'messages', label:'inbox', Icon:MessageCircle \}/)
  assert.doesNotMatch(tabs, /key:'requests'/)
  assert.match(showcase, /inbox:'Сообщения'/)
  assert.match(showcase, /messages:'\/' \+ appLocale \+ '\/app\/messages\?section=clients&tab=chats'/)
  assert.match(showcase, /onClick=\{\(\) => void openAction\(key\)\}/)
  assert.match(showcase, /data-practice-after-google/)
  assert.match(showcase, /data-mobile-tab=\{key\}/)
  assert.match(showcase, /requests:root \+ '\?panel=requests'/,
    'real Requests management remains available inside Practice')
})

test('private Cabinet uses the same 5-tab order and localized names as Messenger', () => {
  const section = cabinet.match(/  const mobileNav = \[([\s\S]*?)\n  \]/)?.[1]
  assert.ok(section)
  assert.deepEqual([...section.matchAll(/id: '([^']+)'/g)].map(match => match[1]),
    ['practice','messages','materials','profile'])
  for (const label of ['Практика','Сообщения','Материалы','Профиль',
    'Práctica','Mensajes','Materiales','Perfil','Practice','Messages','Materials','Profile']) {
    assert.ok(section.includes("'" + label + "'"), label)
  }
  for (const fragment of ["root + '/messages'","root + '/practice?panel=materials'",
    "root + '/practice?panel=profile'","root + '/history'","root + '/portrait'"]) {
    assert.ok(section.includes(fragment), fragment)
  }
  assert.match(cabinet, /mobileNavIsActive\(id\)/)
  assert.match(cabinet, /data-mobile-tab=\{id\}/)
  assert.match(cabinet, /href: root \+ '\/progress'/,
    'progress stays accessible from the existing account menu')
  assert.match(cabinet, /href=\{root \+ '\/settings'\}/,
    'settings stay accessible from the existing account menu')
  for (const tab of ['','practice','messages','materials','profile']) {
    assert.ok(messagesDock.includes("path:'" + tab + "'"), tab || 'home')
  }
})

test('iPhone web docks are fixed to the page bottom with safe areas and keyboard guard', () => {
  assert.match(showcaseCss, /\.bottomNav \{ position: fixed;[^\n]*bottom: 0/)
  assert.match(showcaseCss, /safe-area-inset-bottom/)
  assert.match(cabinetCss, /\.hh-mobile-app-nav\{[\s\S]*?position:fixed;[\s\S]*?inset:auto 0 0/)
  assert.match(cabinetCss, /border-radius:20px 20px 0 0/)
  assert.match(cabinetCss, /-webkit-backdrop-filter:blur\(16px\)/)
  assert.match(messagesCss, /:has\(input:focus,textarea:focus\) \.hh-mobile-app-nav/)
  assert.match(messagesCss, /data-detail-open="true"/)
  assert.doesNotMatch(showcase, /fakeMessenger|newCrmStore|sendOneMessengerMessage\(/)
})
