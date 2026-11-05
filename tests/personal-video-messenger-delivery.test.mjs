import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseVideoChatAction} from '../lib/mandala/video-chat-intent.mjs'

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('finished video download and share commands open the delivery chooser',()=>{
 for(const value of ['скачать ролик','скачать видео','отправить ролик',
  'download video','send video','descargar vídeo','enviar vídeo']){
  assert.equal(parseVideoChatAction(value,'done'),'open',value)
 }
 assert.equal(parseVideoChatAction('скачать ролик','review'),null)
 assert.equal(parseVideoChatAction('открой результат','done'),'open')
})

test('the real video result and natural-language chat reuse one chooser',()=>{
 const studio=source('components/mandala-free-video-studio.tsx')
 const chat=source('components/mandala-video-director-chat.tsx')
 assert.match(studio,/data-mandala-video-download/)
 assert.match(studio,/setDeliveryChooserOpen\(true\)/)
 assert.match(studio,/MandalaVideoDelivery/)
 assert.match(studio,/blob=\{result.blob\}/)
 assert.match(studio,/playbackStatus==="ready"/)
 assert.match(chat,/onOpenDelivery\(\)/)
 assert.match(chat,/parseVideoChatAction/)
})

test('automatic video delivery is explicit opt-in, owner scoped and private',()=>{
 const backend=source('lib/app/personal-video-messenger.js')
 const migration=source('supabase/migrations/20261104230500_hh_personal_video_telegram_delivery.sql')
 const upload=source('components/mandala-video-delivery.tsx')
 assert.match(backend,/HH_VIDEO_TELEGRAM_DELIVERY_ENABLED==='true'/)
 assert.match(backend,/personalVideoCloudEnabled\(env\)/)
 assert.match(backend,/telegramClientSendReady\(env\)/)
 assert.match(backend,/videoId,actor.id/)
 assert.match(backend,/status='ready'/)
 assert.match(backend,/l.chat_hash=d.chat_hash/)
 assert.match(backend,/l.verified_at=d.link_verified_at/)
 assert.match(backend,/openSealed\(claimed.chat_ciphertext/)
 assert.match(backend,/storage.from\(BUCKET\).download\(claimed.object_key\)/)
 assert.match(backend,/sendVideo/)
 assert.match(backend,/allow_paid_broadcast','false'/)
 assert.match(migration,/video_id uuid primary key/)
 assert.match(migration,/enable row level security/)
 assert.match(migration,/force row level security/)
 assert.match(migration,/hh_app_backend/)
 assert.match(upload,/action:"automatic",enabled,consent:true/)
 assert.match(upload,/consent:!automatic/)
 assert.match(upload,/uploadToSignedUrl/)
 assert.match(upload,/navigator.share/)
 assert.doesNotMatch(backend,/wa\.me|api\.whatsapp\.com/)
})

test('API routes require authenticated account and same-origin writes',()=>{
 const settings=source('app/api/app/personal-videos/delivery/route.js')
 const send=source('app/api/app/personal-videos/[id]/delivery/route.js')
 for(const route of [settings,send]){
  assert.match(route,/createRequestAuth/)
  assert.match(route,/await auth.verified\(\)/)
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/consumeRate/)
  assert.match(route,/PRIVATE_HEADERS/)
 }
 assert.match(send,/channel!=='telegram'/)
})

test('UI has EN RU ES copy and never claims WhatsApp background delivery',()=>{
 const ui=source('components/mandala-video-delivery.tsx')
 for(const locale of ['ru','en','es'])assert.match(ui,new RegExp('\\b'+locale+':\\{'))
 assert.match(ui,/whatsapp:\{manualShare:boolean;automatic:boolean\}/)
 assert.match(ui,/navigator.share/)
 assert.match(ui,/noShare/)
 assert.match(ui,/signed_in|guest/) // distinguish account-bound and local guest paths
})
