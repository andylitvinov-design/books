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
  const primary=['home','practice','messages','materials','profile']
  const keys=[...tabs.matchAll(/key:'([^']+)'/g)].map(match=>match[1])
  assert.deepEqual(keys.filter(key=>primary.includes(key)),primary)
  assert.equal(keys.indexOf('messages'),2,'Messages remains the third primary tab')
  assert.ok(keys.length<=6&&keys.every(key=>primary.includes(key)||['ai','video-ai'].includes(key)),
    'only the authorized optional AI video destination may be added')
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
  const primary=['practice','messages','materials','profile']
  const ids=[...section.matchAll(/id: '([^']+)'/g)].map(match=>match[1])
  assert.deepEqual(ids.filter(id=>primary.includes(id)),primary)
  assert.ok(ids.length<=5&&ids.every(id=>primary.includes(id)||['ai','video-ai'].includes(id)),
    'only the approved optional AI-video destination may extend the Cabinet dock')
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

test('protected Practice panels reuse the private Messages dock without a Requests tab',()=>{
 const protectedNav=read('components/app/practice-inner-navigation.jsx')
 const dock=read('components/app/messages-bottom-navigation.jsx')
 const protectedCss=read('app/[locale]/app/[[...path]]/workspace.css')
 assert.match(protectedNav,/<MessagesBottomNavigation locale=\{locale\} activeSection=\{activeSection\}\/>/)
 assert.match(protectedNav,/panel==='materials'\?'materials':panel==='profile'\?'profile':'practice'/)
 assert.doesNotMatch(protectedNav,/data-practice-inner-dock/)
 assert.match(dock,/const active=path===activeSection/)
 assert.match(protectedCss,/hh-app--practice-inner:has\(\[data-service-slide-editor\]\) \.hh-mobile-app-nav/)
 assert.match(protectedCss,/hh-app--practice-inner:has\(input:focus,textarea:focus\) \.hh-mobile-app-nav/)
})

test('all bottom-docked mobile contexts follow the iPhone visual viewport and clean up',()=>{
 const hook=read('components/app/use-visual-bottom-dock.ts')
 const practice=read('components/practice-showcase.jsx')
 const messages=read('components/app/messages-bottom-navigation.jsx')
 const cabinet=read('components/app/app-workspace.jsx')
 const support=read('components/holistic-support-mobile.tsx')
 for(const src of [practice,messages,cabinet,support]){
   assert.match(src,/useVisualBottomDock\(/)
   assert.match(src,/ref=\{mobileDockRef\}/)
 }
 assert.match(hook,/visualViewport/)
 assert.match(hook,/viewport\.offsetTop \+ viewport\.height/)
 assert.match(hook,/visualBottom - rect\.bottom/)
 assert.match(hook,/getBoundingClientRect/)
 assert.match(hook,/style\.display === "none"/)
 assert.match(hook,/style\.removeProperty\("transform"\)/)
 assert.match(hook,/window\.cancelAnimationFrame\(frame\)/)
 assert.match(hook,/ResizeObserver\(update\)/)
 assert.match(hook,/addEventListener\("focusout", update\)/)
 assert.match(hook,/removeEventListener\("focusout", update\)/)
 assert.match(hook,/viewport\?\.addEventListener\("resize", update/)
 assert.match(hook,/viewport\?\.removeEventListener\("resize", update/)
})
