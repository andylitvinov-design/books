import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('guest exchange never establishes cabinet-wide access',()=>{
  const guest=read('app/[locale]/client/session/[selector]/page.js')
  const gate=read('components/client-session-share-gate.jsx')
  const viewer=read('lib/clients/session-delivery.js')
  assert.match(guest,/getGuestClientSession/)
  assert.match(gate,/\/api\/client-session\/exchange/)
  assert.doesNotMatch(gate,/\/api\/client-access/)
  assert.match(viewer,/g\.access_version=v\.access_version/)
  assert.match(viewer,/p\.status='published'/)
  assert.match(viewer,/g\.selector=\$3/)
})
test('guest playback uses exactly its granted session and asset',()=>{
  const api=read('app/api/client-session/[selector]/play/[itemId]/route.js')
  assert.match(api,/getGuestClientSession/)
  assert.match(api,/signedClientSessionAsset\(grant\.clientId,grant\.sessionId,itemId\)/)
  assert.doesNotMatch(api,/authorizeCabinetRequest/)
  const asset=read('lib/clients/session-delivery.js')
  assert.match(asset,/current\.items\.find\(i=>i\.id===itemId/)
  assert.match(asset,/session_id=\$2 and client_id=\$3/)
})
test('private media is scoped to a server-held key and reviewed CSP',()=>{
  const service=read('lib/clients/session-delivery.js')
  const middleware=read('middleware.ts')
  assert.match(service,/HH_APP_SUPABASE_SECRET_KEY/)
  assert.match(service,/createSignedUploadUrl/)
  assert.match(service,/createSignedUrl\(a\.object_key,300\)/)
  assert.match(middleware,/sessionStorageOrigin/)
  assert.match(middleware,/privateSessionPage/)
  assert.match(middleware,/frame-src 'none'/)
})
