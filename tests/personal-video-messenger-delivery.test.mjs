import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {parseVideoChatAction} from '../lib/mandala/video-chat-intent.mjs'
import {telegramPersonalVideoSendReady,telegramClientSendReady} from '../lib/app/client-telegram-policy.js'

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
 const migration=source('supabase/migrations/20261105015517_hh_personal_video_telegram_delivery_20261104.sql')
 const upload=source('components/mandala-video-delivery.tsx')
 assert.match(source('lib/app/client-telegram-policy.js'),/HH_VIDEO_TELEGRAM_DELIVERY_ENABLED==='true'/)
 // Video bot pairing cannot silently opt users into the general messages/
 // bookings/reports/courses notification defaults.
 assert.match(backend,/select topics from app_private.notification_messenger_requests/)
 assert.match(backend,/messages:false,booking:false,reports:false,courses:false,news:false/)
 assert.match(backend,/telegramPersonalVideoSendReady\(env\)/)
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
 assert.match(upload,/savePrivateMp4/);
 const uploader=source('lib/mandala/signed-private-video-upload.mjs')
 assert.match(uploader,/uploadToSignedUrl/)
 assert.match(uploader,/uploadSignedPrivateVideoChunks/)
 assert.match(uploader,/request\("personal-videos"/)
 assert.match(upload,/navigator.share/)
 assert.match(upload,/data-video-delivery-status/)
 const archive=source('components/app/my-personal-videos.jsx')
 assert.match(archive,/const matched=\[10,15,20,30,60\]/)
 assert.match(archive,/health:'Health',life:'Personal growth'/)
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

test('video-only permission remains independent from general Telegram alerts',()=>{
 const env={
  HH_CLIENT_TG_LINK_ENABLED:'true',
  HH_CLIENT_TG_USE_PRACTICE_BOT:'true',
  HH_PRACTICE_TG_ENABLED:'true',
  HH_PRACTICE_TG_BOT_TOKEN:['123456','A'.repeat(30)].join(':'),
  HH_CLIENT_TG_WEBHOOK_SECRET:'S'.repeat(48),
  HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED:'true',
  HH_VIDEO_TELEGRAM_DELIVERY_ENABLED:'true',
  HH_CLIENT_TG_SEND_APPROVED:'false'
 };
 assert.equal(telegramPersonalVideoSendReady(env),true);
 assert.equal(telegramClientSendReady(env),false);
 assert.equal(telegramPersonalVideoSendReady({...env,HH_VIDEO_TELEGRAM_DELIVERY_ENABLED:'false'}),false);
 assert.equal(telegramPersonalVideoSendReady({...env,HH_PERSONAL_VIDEO_CLOUD_SAVE_ENABLED:'false'}),false);
 assert.equal(telegramPersonalVideoSendReady({...env,HH_CLIENT_TG_LINK_ENABLED:'false'}),false);
 assert.equal(telegramPersonalVideoSendReady({...env,HH_CLIENT_TG_WEBHOOK_SECRET:''}),false);
 const ui=source('components/mandala-video-delivery.tsx');
 assert.match(ui,/!state.telegram.sendingAvailable&&!state.telegram.automatic/);
});


test('private library has owner-controlled Telegram consent, revocation and saved video send',()=>{
 const archive=source('components/app/my-personal-videos.jsx')
 const panel=source('components/app/personal-video-messenger-panel.jsx')
 const backend=source('lib/app/personal-video-messenger.js')
 const route=source('app/api/app/personal-videos/delivery/route.js')
 assert.match(archive,/PersonalVideoMessengerPanel/)
 assert.match(archive,/locale==='es'/)
 assert.match(panel,/data-personal-video-messenger-panel/)
 assert.match(panel,/data-video-archive-telegram-send/)
 assert.match(panel,/action:'connect',locale:language,consent:true/)
 assert.match(panel,/action:'automatic',enabled,consent:enabled/)
 assert.match(panel,/automatic:false,consent:true,locale:language/)
 assert.match(panel,/checked=\{optedIn\}/)
 assert.match(backend,/consentSaved:pref\?\.automatic===true/)
 assert.match(backend,/\(enabled&&consent!==true\)/)
 assert.match(backend,/const stillAllowed=await transaction/)
 assert.match(backend,/if\(!stillAllowed\)/)
 assert.match(route,/\(!body.enabled\|\|body.consent===true\)/)
 assert.doesNotMatch(panel,/HH_CRM_MSG_WHATSAPP/)
});


test('future-video opt-in cannot upload the current MP4 silently and iPhone Share failures preserve local save',()=>{
 const ui=source('components/mandala-video-delivery.tsx')
 const studio=source('components/mandala-free-video-studio.tsx')
 assert.match(ui,/const automaticAtResultLoad=useRef\(false\)/)
 assert.match(ui,/automaticAtResultLoad\.current=next\.telegram\.automatic===true/)
 assert.match(ui,/!automaticAtResultLoad\.current\|\|!state\?\.telegram\.automatic/)
 assert.match(ui,/automaticAtResultLoad\.current=false/)
 assert.match(ui,/async function changeAutomatic\(enabled:boolean\)/)
 assert.match(ui,/async function shareFromDevice\(\)\{\s*try\{/)
 assert.match(ui,/typeof navigator\.canShare==="function"/)
 assert.match(ui,/setNotice\(t\.noShare\)/)
 assert.match(studio,/key=\{result\.url\}/)
});
