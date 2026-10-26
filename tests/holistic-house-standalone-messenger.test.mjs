import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(path,'utf8')

test('one existing Holistic House app opens Messages on iOS PWA, Android PWA, and Capacitor',()=>{
  const en=JSON.parse(read('public/holistic-house-app.webmanifest'))
  const ru=JSON.parse(read('public/holistic-house-app-ru.webmanifest'))
  const es=JSON.parse(read('public/holistic-house-app-es.webmanifest'))
  const legacy=JSON.parse(read('public/holistic-house.webmanifest'))
  for(const [manifest,locale] of [[en,'en'],[ru,'ru'],[es,'es'],[legacy,'en']]){
    assert.equal(manifest.id,'/en/app','do not create a second installed icon')
    assert.equal(manifest.display,'standalone')
    assert.equal(manifest.start_url,`/${locale}/app/messages`)
    assert.ok(manifest.shortcuts.some(link=>link.url===`/${locale}/app/messages`))
  }
  const native=JSON.parse(read('capacitor.holistic-house.config.json'))
  assert.equal(native.appId,'com.holistichouse.app')
  assert.equal(native.server.url,'https://holistichouse.vercel.app/en/app/messages')
  assert.equal(native.server.cleartext,false)
  const localeLayout=read('app/[locale]/layout.tsx')
  assert.match(localeLayout,/holistic-house-app-es.webmanifest/)
  assert.doesNotMatch(read('app/[locale]/app/layout.jsx'),/manifest:/)
})

test('full-height phone conversation keeps composer in visual viewport and hides dock only during input',()=>{
 const page=read('app/[locale]/app/messages/messages-page.css')
 const inbox=read('components/app/messages-simple-inbox.jsx')
 const css=read('components/app/messages-simple-inbox.module.css')
 const crm=read('components/app/crm-messenger.module.css')
 const direct=read('components/app/direct-message-inbox.module.css')
 assert.match(page,/height:var\(--hh-messages-viewport,100dvh\)/)
 assert.match(page,/:has\(textarea:focus, input\[type="search"\]:focus\)/)
 assert.match(inbox,/window\.visualViewport/)
 assert.match(inbox,/removeEventListener\('resize',updateHeight\)/)
 assert.match(css,/\.window\{flex:1;min-height:0;height:auto/)
 assert.match(css,/data-detail-open="true"\] \.heading\{display:none/)
 assert.match(crm,/\.detailConversation \.compose textarea\{grid-column:1;grid-row:1/)
 assert.match(crm,/\.detailConversation \.compose>button\{grid-column:2;grid-row:1/)
 assert.match(direct,/data-simple-detail="true"\] \.compose textarea/)
 assert.match(read('components/app/crm-messenger.jsx'),/conversationOnly\|\|compact\?<Send/)
})

test('offline mode is explicit; protected conversations are not cached on device',()=>{
 const sw=read('public/sw.js')
 const inbox=read('components/app/messages-simple-inbox.jsx')
 assert.match(sw,/PRIVATE_PREFIXES/)
 assert.match(sw,/\/en\/app/)
 assert.match(sw,/\/api\/app/)
 assert.match(sw,/network-only/)
 assert.doesNotMatch(sw,/caches\.open\(.*private/i)
 assert.match(inbox,/navigator\.onLine===false/)
 assert.match(inbox,/role="status">\{t\.offline\}/)
 assert.doesNotMatch(inbox,/localStorage|sessionStorage/)
})
