import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {canReply,channelTransportReady,telegramPilotReady,messengerSetupStatus,validateMessageText,MESSENGER_CHANNELS} from '../lib/crm/messenger-policy.js'
import {messengerCursor,parseMessengerCursor} from '../lib/crm/messenger-pagination.js'
const root=new URL('..',import.meta.url)
const source=path=>readFileSync(new URL(path,root),'utf8')
test('only supported official messenger channels',()=>{
  assert.deepEqual(MESSENGER_CHANNELS,['telegram','whatsapp','instagram','messenger'])
  assert.deepEqual(canReply({channel:'unknown',lastInboundAt:new Date().toISOString(),enabled:true,suppressed:false}).reason,'INVALID_CHANNEL')
})
test('messenger channels fail closed in production without credentials and explicit approval',()=>{
  for(const channel of MESSENGER_CHANNELS){
    assert.equal(channelTransportReady(channel,{VERCEL_ENV:'production'}),false)
    assert.equal(channelTransportReady(channel,{VERCEL_ENV:'production',HH_CRM_MSG_PRODUCTION_APPROVED:'true'}),false)
  }
})
test('customer must have initiated contact; opt-out blocks any reply',()=>{
  for(const channel of MESSENGER_CHANNELS){
    assert.equal(canReply({channel,lastInboundAt:null,enabled:true}).ok,false)
    assert.equal(canReply({channel,lastInboundAt:new Date().toISOString(),enabled:true,suppressed:true}).reason,'CONTACT_BLOCKED')
  }
})
test('Meta user reply window is conservative and Telegram does not invent delivery receipts',()=>{
  const now=Date.parse('2026-10-18T18:00:00Z')
  const twoHoursAgo=new Date(now-2*3600000).toISOString()
  const dayAgo=new Date(now-24*3600000).toISOString()
  for(const channel of ['whatsapp','instagram','messenger']){
    assert.equal(canReply({channel,lastInboundAt:twoHoursAgo,enabled:true,now}).ok,true)
    assert.equal(canReply({channel,lastInboundAt:dayAgo,enabled:true,now}).reason,'REPLY_WINDOW_CLOSED')
  }
  assert.equal(canReply({channel:'telegram',lastInboundAt:dayAgo,enabled:true,now}).ok,true)
})
test('outbound message validation enforces length, secret protection and health-safety boundary',()=>{
  assert.equal(validateMessageText('  Thank you for reaching out.  '),'Thank you for reaching out.')
  for(const text of ['', '  ', 'x'.repeat(1201), 'https://holistichouse.vercel.app/en/client/abc#very-long-token-1234567890',
    'Your prescription is ready: 30c', 'Результаты анализа и диагноз: ...']){
    assert.throws(()=>validateMessageText(text))
  }
})
test('webhook entrypoints require verified signatures, no client-side provider tokens or trust based on display name',()=>{
  const webhook=source('lib/crm/messenger-webhook.js')
  const api=source('app/api/app/crm/messenger/route.js')
  const db=source('supabase/migrations/20261018185711_hh_crm_messenger_core_20261018.sql')
  const ui=source('components/app/crm-messenger.jsx')
  assert.match(webhook,/timingSafeEqual/)
  assert.match(webhook,/x-hub-signature-256/)
  assert.match(webhook,/x-telegram-bot-api-secret-token/)
  assert.match(api,/practitionerEmailAllowed/)
  assert.match(api,/requireSameOrigin/)
  assert.match(db,/FORCE ROW LEVEL SECURITY/g)
  assert.match(db,/SECURITY DEFINER/g)
  assert.match(db,/hh_app_inbox/)
  assert.doesNotMatch(ui,/HH_CRM_MSG_(TELEGRAM_TOKEN|WHATSAPP_TOKEN)/)
})
test('all sends are owner-confirmed, single-recipient and idempotent; no automated campaigns',()=>{
  const store=source('lib/crm/messenger-store.js')
  const api=source('app/api/app/crm/messenger/route.js')
  assert.match(store,/requestId/)
  assert.match(store,/providerMessageHash/)
  assert.match(store,/MESSENGER_DAILY_LIMIT/)
  assert.match(api,/action==='send'/)
  assert.doesNotMatch(api,/sendBulk|sendCampaign|setInterval|auto.?send/i)
})

test('message retries preserve one client id and queued messages never retry automatically',()=>{
  const component=source('components/app/crm-messenger.jsx')
  const store=source('lib/crm/messenger-store.js')
  assert.match(component,/pendingRequest\.current=pending/)
  assert.match(component,/requestId:pending\.id/)
  assert.match(component,/old&&old\.threadId===threadId&&old\.text===body/)
  assert.match(store,/status='unknown'.*direction='out'.*status='queued'/)
  assert.doesNotMatch(store,/sendOneMessengerMessage\(/)
})
test('outbound provider calls recheck latest contact suppression and Meta reply window',()=>{
  const api=source('app/api/app/crm/messenger/route.js')
  const store=source('lib/crm/messenger-store.js')
  const preflight=api.indexOf('checkMessengerReplyReady(reservation.id)')
  const provider=api.indexOf('sendOneMessengerMessage({channel:reservation.channel')
  assert.ok(preflight>0&&provider>preflight)
  assert.match(store,/checkMessengerReplyReady\(id\)/)
  assert.match(store,/row\.lifecycle==='archived'/)
  assert.match(store,/finalizeMessengerReply\(id,channel,status/)
  assert.match(store,/blocked/)
})
test('Telegram connection registers a signed webhook and refuses another application webhook',()=>{
  const provider=source('lib/crm/messenger-provider.js')
  const api=source('app/api/app/crm/messenger/route.js')
  assert.match(provider,/TELEGRAM_WEBHOOK_ALREADY_IN_USE/)
  assert.match(provider,/getWebhookInfo/)
  assert.match(provider,/setWebhook/)
  assert.match(provider,/secret_token:secret/)
  assert.match(provider,/drop_pending_updates:false/)
  assert.match(api,/ensureTelegramWebhook\(\)/)
})
test('signed early WhatsApp receipts survive out-of-order events with owner-scoped RLS',()=>{
  const sql=source('supabase/migrations/20261018193024_hh_crm_messenger_early_receipts_20261018.sql')
  const store=source('lib/crm/messenger-store.js')
  assert.match(sql,/FORCE ROW LEVEL SECURITY/)
  assert.match(sql,/ON CONFLICT\(account_id,provider_hash\)/)
  assert.match(sql,/TO hh_crm_backend/)
  assert.match(sql,/TO hh_app_inbox/)
  assert.match(sql,/WHEN app\.crm_msg_receipts\.status='read'/)
  assert.match(store,/app\.crm_msg_receipts/)
  assert.match(store,/provider_hash=\$3/)
})

test('Meta provider adapters use the correct official Instagram Login and Page-scoped endpoints',()=>{
  const provider=source('lib/crm/messenger-provider.js')
  assert.match(provider,/const INSTAGRAM = 'https:\/\/graph\.instagram\.com'/)
  assert.match(provider,/INSTAGRAM\+'\/'\+version\+'\/me\/messages'/)
  assert.match(provider,/configuredExternalId\('messenger',env\)\+'\/messages'/)
  assert.match(provider,/INSTAGRAM\+'\/'\+version\+'\/me\?fields=id'/)
})

test('multiple browser tabs and lost HTTP responses cannot reserve same pending message twice',()=>{
  const code=source('lib/crm/messenger-store.js')
  const start=code.indexOf('async reserveMessengerReply(input)')
  const end=code.indexOf('async checkMessengerReplyReady(',start)
  assert.ok(start>=0&&end>start,'outbound reservation must exist')
  const reserve=code.slice(start,end)
  const lock=reserve.indexOf('for update of t')
  const antiReplay=reserve.indexOf('const recent=(await db.query(')
  const insert=reserve.indexOf('insert into app.crm_msg_items')
  assert.ok(lock>=0&&antiReplay>lock&&insert>antiReplay,
    'outgoing replay must be checked under recipient lock before outbound reservation')
  assert.match(code,/status in \('queued','unknown','accepted','delivered','read'\)/)
  assert.match(code,/previous\.body_ciphertext,messageContext\(actor\.id,previous\.id\),config/)
  assert.match(code,/lastText===text/)
  assert.match(code,/return \{id:previous\.id,status:previous\.status,duplicate:true\}/)
  assert.match(code,/created_at>now\(\)-interval '24 hours'/)
})
test('CRM owner has separate three-section mobile navigation and never mounts messages on Contacts',()=>{
  const ui=source('components/app/crm-manager.jsx')
  const css=source('components/app/crm-manager.module.css')
  assert.match(ui,/aria-pressed=\{activeSection===id\}/)
  assert.match(ui,/activeSection==='overview'/)
  assert.match(ui,/activeSection==='messages'&&<CrmMessengerPanel/)
  assert.ok(ui.indexOf("activeSection==='messages'&&<CrmMessengerPanel")<ui.indexOf('{data&&<>'),
    'inbox must mount independently when overview API is unavailable')
  assert.match(ui,/activeSection==='contacts'&&<>/)
  assert.match(ui,/\['messages',language==='ru'\?'Сообщения'/)
  assert.match(css,/min-height:44px/)
  assert.match(css,/\.sectionTabs\{[^}]*overflow-x:auto/)
})
test('inbox supports channel, unread and search filters with locale-correct provider statuses',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  const css=source('components/app/crm-messenger.module.css')
  assert.match(ui,/const visibleThreads=threads\.filter/)
  assert.match(ui,/channelFilter==='all'/)
  assert.match(ui,/unreadOnly\|\|item\.unreadCount>0/)
  assert.match(ui,/type="search" value=\{search\}/)
  assert.match(ui,/aria-label=\{lang==='ru'\?'Канал сообщений'/)
  assert.match(ui,/statusLabel\(m\.status,lang\)/)
  assert.match(ui,/await refresh\(activeRef\.current\)/)
  assert.doesNotMatch(ui,/await action\('read'[^;]*;await refresh/)

  assert.match(ui,/unknown:\{en:'Unconfirmed — do not resend'/)
  assert.match(css,/\.inboxFilters\{/)
})

test('v3 conversation workflow: late response from another client cannot replace the selected thread',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  assert.match(ui,/const activeRef=useRef\(''\)/)
  assert.match(ui,/activeRef\.current=id/)
  assert.match(ui,/if\(activeRef\.current===id\)\{\s*setData\(previous=>\(\{/)
  assert.match(ui,/setData\(previous=>previous\?\{\.\.\.previous,messages:\[\],followups:\[\]/)
  assert.match(ui,/if\(id===activeRef\.current\)\{\s*setData\(previous=>\(\{/)
  assert.match(ui,/aria-busy=\{threadLoading\}/)
  assert.match(ui,/threadLoading\|\|!selected\.reply\.ok/)
})
test('v3 conversation workflow: private business notes are encrypted and never sent through provider API',()=>{
  const store=source('lib/crm/messenger-store.js')
  const ui=source('components/app/crm-messenger.jsx')
  const route=source('app/api/app/crm/messenger/route.js')
  const note=store.slice(store.indexOf('async addMessengerNote(input)'),store.indexOf('async connectMessengerChannel('))
  assert.match(note,/requireUUID\(input\.noteId\)/)
  assert.match(note,/validateMessageText\(input\.text\)/)
  assert.match(note,/openSealed\(old\.body_ciphertext,messageContext/)
  assert.match(note,/seal\(\{text\},messageContext\(actor\.id,input\.noteId\),config\)/)
  assert.match(note,/values\(\$1,\$2,\$3,'note','received',\$4\)/)
  assert.doesNotMatch(note,/sendOneMessengerMessage|sendMessage|fetch\(/)
  assert.match(ui,/m\.direction==='note'\?styles\.internalNote/)
  assert.match(ui,/onClick=\{saveNote\}/)
  assert.match(route,/action==='note'/)
  assert.match(route,/store\.addMessengerNote\(payload\)/)
})
test('v3 conversation workflow: stage and followup actions are owner-verified and revision guarded',()=>{
  const store=source('lib/crm/messenger-store.js')
  const route=source('app/api/app/crm/messenger/route.js')
  assert.match(store,/c\.revision as contact_revision/)
  assert.match(store,/contactRevision:r\.contact_revision/)
  assert.match(store,/where owner_id=\$1 and contact_id=\$2 and status='open'/)
  assert.match(store,/async messengerFollowupBelongsToThread\(threadId,followupId\)/)
  assert.match(store,/t\.contact_id=f\.contact_id and t\.owner_id=f\.owner_id/)
  assert.match(route,/action==='set_stage'/)
  assert.match(route,/store\.setLifecycle\(\{id,lifecycle:payload\.lifecycle,expectedRevision:payload\.expectedRevision\}\)/)
  assert.match(route,/action==='create_followup'/)
  assert.match(route,/store\.createFollowup\(\{id:payload\.id,contactId,kind:payload\.kind,dueOn:payload\.dueOn\}\)/)
  assert.match(route,/action==='complete_followup'/)
  assert.match(route,/store\.changeFollowup\(\{id:payload\.id,action:'complete',expectedRevision:payload\.expectedRevision\}\)/)
})
test('v3 conversation workflow: EN/RU/ES note, stage and task controls are accessible on mobile',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  const css=source('components/app/crm-messenger.module.css')
  assert.match(ui,/const workflowCopy=\{/)
  assert.match(ui,/ru:\{stage:'Статус контакта'/)
  assert.match(ui,/es:\{stage:'Estado del contacto'/)
  assert.match(ui,/timeZone:'America\/Toronto'/)
  assert.match(ui,/type="date" value=\{dueOn\}/)
  assert.match(ui,/aria-label=\{w\.note\}/)
  assert.match(ui,/onClick=\{createFollowup\}/)
  assert.match(ui,/onClick=\{saveNote\}/)
  assert.match(ui,/onClick=\{\(\)=>completeFollowup\(item\)\}/)
  assert.match(css,/\.internalNote\{/)
  assert.match(css,/\.taskForm\{/)
  assert.match(css,/min-height:44px/)
})

test('v3 async chat switching never mixes the previous client conversation into a new selection',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  assert.match(ui,/activeRef\.current=id/)
  assert.match(ui,/if\(activeRef\.current===id\)\{\s*setData\(previous=>\(\{/)
  assert.match(ui,/setData\(previous=>previous\?\{\.\.\.previous,messages:\[\],followups:\[\]/)
  assert.match(ui,/if\(id===activeRef\.current\)\{\s*setData\(previous=>\(\{/)
  assert.match(ui,/aria-busy=\{threadLoading\}/)
})
test('v3 internal note and followup authorizations reuse encrypted owner storage only',()=>{
  const store=source('lib/crm/messenger-store.js')
  const route=source('app/api/app/crm/messenger/route.js')
  const note=store.slice(store.indexOf('async addMessengerNote(input)'),store.indexOf('async connectMessengerChannel'))
  assert.match(note,/requireUUID\(input\.noteId\)/)
  assert.match(note,/validateMessageText\(input\.text\)/)
  assert.match(note,/messageContext\(actor\.id,input\.noteId\),config/)
  assert.match(note,/values\(\$1,\$2,\$3,'note','received',\$4\)/)
  assert.doesNotMatch(note,/sendOneMessengerMessage|fetch\(/)
  assert.match(route,/action==='note'/)
  assert.match(route,/store\.addMessengerNote\(payload\)/)
  assert.match(route,/action==='set_stage'/)
  assert.match(route,/store\.setLifecycle\(\{id,lifecycle:payload\.lifecycle,expectedRevision:payload\.expectedRevision\}\)/)
  assert.match(route,/action==='create_followup'/)
  assert.match(route,/store\.createFollowup\(\{id:payload\.id,contactId,kind:payload\.kind,dueOn:payload\.dueOn\}\)/)
  assert.match(route,/action==='complete_followup'/)
  assert.match(route,/store\.messengerFollowupBelongsToThread\(payload\.threadId,payload\.id\)/)
  assert.match(route,/store\.changeFollowup\(\{id:payload\.id,action:'complete',expectedRevision:payload\.expectedRevision\}\)/)
})
test('v3 owner stage, notes and tasks have readable EN/RU/ES mobile controls',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  const css=source('components/app/crm-messenger.module.css')
  const manager=source('components/app/crm-manager.jsx')
  assert.match(ui,/workflowCopy=\{/)
  assert.match(ui,/ru:\{stage:'Статус контакта'/)
  assert.match(ui,/es:\{stage:'Estado del contacto'/)
  assert.match(ui,/timeZone:'America\/Toronto'/)
  assert.match(ui,/onClick=\{saveNote\}/)
  assert.match(ui,/onClick=\{createFollowup\}/)
  assert.match(ui,/onClick=\{\(\)=>completeFollowup\(item\)\}/)
  assert.match(ui,/onCrmChange\?\.\(\)/)
  assert.match(manager,/onCrmChange=\{retry\}/)
  assert.match(css,/\.internalNote\{/)
  assert.match(css,/\.contactActions\{/)
  assert.match(css,/\.taskForm\{/)
  assert.match(css,/min-height:44px/)
})
test('v3 awaiting-reply queue is distinct from unread and ignores internal notes and rejected sends',()=>{
  const store=source('lib/crm/messenger-store.js')
  const ui=source('components/app/crm-messenger.jsx')
  assert.match(store,/select m\.direction from app\.crm_msg_items/)
  assert.match(store,/m\.direction='in' or \(m\.direction='out' and m\.status in \('accepted','delivered','read'\)\)/)
  assert.match(store,/needsReply:r\.last_external_direction==='in'/)
  assert.match(ui,/setNeedsReplyOnly/)
  assert.match(ui,/needsReplyOnly\|\|item\.needsReply/)
  assert.match(ui,/thread\.needsReply/)
})

test('v3 quick replies are neutral owner-selected drafts, not scheduled or auto-sent',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  const api=source('app/api/app/crm/messenger/route.js')
  assert.match(ui,/const quickReplies=\{/)
  assert.match(ui,/ru:\[/)
  assert.match(ui,/es:\[/)
  assert.match(ui,/role="group" aria-label=\{lang==='ru'\?'Быстрые ответы'/)
  assert.match(ui,/onClick=\{\(\)=>\{pendingRequest\.current=null;setText\(item\.text\)\}\}/)
  assert.match(ui,/disabled=\{busy\|\|threadLoading\|\|!selected\.reply\.ok\}/)
  assert.doesNotMatch(ui,/setInterval\(|sendOneMessengerMessage\(/)
  assert.match(api,/action==='send'/)
})

test('v3 stale replies and notes never clear another chat draft or display old status',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  assert.match(ui,/const requestThreadId=payload\?\.threadId\|\|activeRef\.current/)
  assert.match(ui,/if\(activeRef\.current===requestThreadId\)/)
  assert.match(ui,/if\(!result\|\|activeRef\.current!==threadId\)return/)
  assert.match(ui,/if\(result&&activeRef\.current===args\.threadId\)/)
  assert.match(ui,/if\(result&&activeRef\.current===threadId\)setStatus/)
})

test('v3 actionable privacy and quota errors are localized, never expose provider secrets',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  assert.match(ui,/const workflowErrors=\{/)
  assert.match(ui,/PRIVATE_CONTENT_BLOCKED:/)
  assert.match(ui,/NOTE_DAILY_LIMIT:/)
  assert.match(ui,/CRM_FOLLOWUP_LIMIT:/)
  assert.match(ui,/workflowErrors\[e\.message\]\?\.\[lang\]/)
  assert.doesNotMatch(ui,/HH_CRM_MSG_TELEGRAM_TOKEN|HH_CRM_MSG_META_APP_SECRET/)
})

test('messenger history cursors retain PG timestamp precision and reject malformed input',()=>{
  const time='2026-10-18 20:34:59.123456+00'
  const id='123e4567-e89b-42d3-a456-426614174000'
  const token=messengerCursor(time,id)
  assert.deepEqual(parseMessengerCursor(token),{at:time,id})
  assert.equal(parseMessengerCursor(null),null)
  for(const invalid of ['', '!!!!!!','A'.repeat(250),
    Buffer.from(JSON.stringify({at:'2026-13-33 99:33:77+00',id})).toString('base64url'),
    Buffer.from(JSON.stringify({at:time,id,owner:'abc'})).toString('base64url'),
    Buffer.from(JSON.stringify({at:time,id:'00000000-0000-0000-0000-000000000000'})).toString('base64url')]){
    assert.throws(()=>parseMessengerCursor(invalid))
  }
  assert.throws(()=>messengerCursor('2026-02-30 10:00:00+00',id))
})
test('pagination is owner-isolated, bounded and able to open selected older thread',()=>{
  const store=source('lib/crm/messenger-store.js')
  const api=source('app/api/app/crm/messenger/route.js')
  assert.match(store,/async listMessengerThreads\(selectedThreadId=null,\{threadsBefore=null,messagesBefore=null\}=\{\}\)/)
  assert.match(store,/and \(\$2::timestamptz is null or \(t\.last_message_at,t\.id\)</)
  assert.match(store,/t\.owner_id=\$1 and t\.id=\$2 limit 1/)
  assert.match(store,/order by t\.last_message_at desc,t\.id desc limit 31/)
  assert.match(store,/order by created_at desc,id desc limit 51/)
  assert.match(store,/nextThreadsCursor,nextMessagesCursor/)
  assert.match(api,/allowed=\['thread','threadsBefore','messagesBefore'\]/)
  assert.match(api,/params\.getAll\(key\)\.length>1/)
  assert.match(api,/params\.get\('messagesBefore'\)/)
})
test('Messenger UI can load older conversations and messages without losing selected state',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  const css=source('components/app/crm-messenger.module.css')
  assert.match(ui,/const load=useCallback\(async\(threadId='',signal,\{threadsBefore=null,messagesBefore=null\}=\{\}\)/)
  assert.match(ui,/async function loadMoreThreads\(\)/)
  assert.match(ui,/async function loadOlderMessages\(\)/)
  assert.match(ui,/setData\(previous=>previous\?\{/)
  assert.match(ui,/mergeThreadPages\(previous\.threads,page\.threads\)/)
  assert.match(ui,/mergeMessagePages\(page\.messages,previous\.messages\)/)
  assert.match(ui,/if\(threadId!==activeRef\.current\)return/)
  assert.match(ui,/data\.nextThreadsCursor&&<button/)
  assert.match(ui,/data\?\.nextMessagesCursor&&<button/)
  assert.match(css,/\.historyButton\{/)
})
test('idempotent outgoing reply key is bound to the original encrypted text and thread',()=>{
  const code=source('lib/crm/messenger-store.js')
  assert.match(code,/select id,status,thread_id,direction,body_ciphertext from app\.crm_msg_items/)
  assert.match(code,/existed\.thread_id!==input\.threadId\|\|existed\.direction!=='out'\|\|recorded!==text/)
  assert.match(code,/openSealed\(existed\.body_ciphertext,messageContext\(actor\.id,existed\.id\),config\)/)
})

test('pilot remains disabled by default and requires an exact allowlisted Telegram test chat',()=>{
  const basic={VERCEL_ENV:'production',HH_CRM_MSG_TELEGRAM_ENABLED:'true',
    HH_CRM_MSG_TELEGRAM_TOKEN:'SYNTHETIC-TEST-ONLY',
    HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'SYNTHETIC_TEST_SECRET',
    HH_CRM_MSG_TELEGRAM_BOT_ID:'12345678'}
  assert.equal(telegramPilotReady(basic),false)
  assert.equal(channelTransportReady('telegram',basic),false)
  assert.equal(channelTransportReady('telegram',{...basic,HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true'}),false)
  const env={...basic,HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',
    HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'123456789'}
  assert.equal(telegramPilotReady(env),true)
  assert.equal(channelTransportReady('telegram',env),true)
  for(const channel of ['whatsapp','instagram','messenger']){
    assert.equal(channelTransportReady(channel,env),false)
  }
  assert.equal(telegramPilotReady({...env,HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'not-a-chat-id'}),false)
  assert.equal(telegramPilotReady({...env,HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'-12345678'}),false)
})
test('production full release gate and pilot gate are independent and never silently enable Meta',()=>{
  const env={VERCEL_ENV:'production',HH_CRM_MSG_TELEGRAM_ENABLED:'true',
    HH_CRM_MSG_TELEGRAM_TOKEN:'SYNTHETIC',HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'SYNTHETIC_TOKEN',
    HH_CRM_MSG_TELEGRAM_BOT_ID:'12345678',HH_CRM_MSG_TELEGRAM_PILOT_ENABLED:'true',
    HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID:'123456789'}
  assert.equal(channelTransportReady('telegram',{...env,HH_CRM_MSG_PRODUCTION_APPROVED:'false'}),true)
  assert.equal(telegramPilotReady({...env,HH_CRM_MSG_PRODUCTION_APPROVED:'true'}),false)
  assert.equal(channelTransportReady('telegram',{...env,HH_CRM_MSG_PRODUCTION_APPROVED:'true'}),true)
  assert.equal(channelTransportReady('telegram',{...env,HH_CRM_MSG_TELEGRAM_ENABLED:'false'}),false)
  assert.equal(channelTransportReady('telegram',{...env,HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'bad secret'}),false)
})
test('read-only setup status shows ONLY missing key names, never tokens or account identifiers',()=>{
  const env={VERCEL_ENV:'production',HH_CRM_MSG_TELEGRAM_ENABLED:'true',
    HH_CRM_MSG_TELEGRAM_TOKEN:'PROTECTED-SAMPLE-ONLY',
    HH_CRM_MSG_TELEGRAM_WEBHOOK_SECRET:'PROTECTED_SAMPLE_SECRET',
    HH_CRM_MSG_TELEGRAM_BOT_ID:'12345678'}
  const test=messengerSetupStatus('telegram',env)
  assert.ok(Array.isArray(test.missingKeys))
  assert.deepEqual(test.missingKeys,[])
  assert.equal(test.liveApproved,false)
  assert.equal(test.enabled,true)
  assert.equal(test.configured,false)
  assert.match(test.callbackUrl,/\/webhook\/telegram$/)
  assert.doesNotMatch(JSON.stringify(test),/PROTECTED-SAMPLE|PROTECTED_SAMPLE|12345678/)
  const missing=messengerSetupStatus('whatsapp',{VERCEL_ENV:'production'})
  assert.ok(missing.missingKeys.includes('HH_CRM_MSG_META_APP_SECRET'))
  assert.ok(missing.missingKeys.includes('HH_CRM_MSG_WHATSAPP_PHONE_ID'))
  assert.equal(messengerSetupStatus('invalid',{}),null)
})
test('Telegram pilot enforces exact inbound chat filter BEFORE database access and outbound provider send',()=>{
  const webhook=source('lib/crm/messenger-webhook.js')
  const provider=source('lib/crm/messenger-provider.js')
  const guard=webhook.indexOf("if(provider==='telegram'&&telegramPilotReady(env)")
  const db=webhook.indexOf("return webhookTransaction(config,async db=>")
  assert.ok(guard>0&&db>guard,'pilot inbound must be filtered before any DB activity')
  assert.match(webhook,/event\.type!=='incoming'\|\|String\(event\.userId\)!==env\.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID/)
  const out=provider.indexOf("if(telegramPilotReady(env)&&String(to)!==env.HH_CRM_MSG_TELEGRAM_PILOT_CHAT_ID)")
  const send=provider.indexOf("'/sendMessage'")
  assert.ok(out>0&&send>out,'only allowlisted test recipient can reach Telegram API')
  assert.match(provider,/throw new AppError\('TEST_RECIPIENT_ONLY',403\)/)
})
test('Messenger owner console shows connected state and official setup without credentials in client JS',()=>{
  const ui=source('components/app/crm-messenger.jsx')
  const store=source('lib/crm/messenger-store.js')
  assert.match(store,/messengerSetupStatus\(channel\)/)
  assert.match(ui,/channel\.missingKeys/)
  assert.match(ui,/channel\.pilot/)
  assert.match(ui,/guide\.notVerified/)
  assert.match(ui,/guide\.copyUrl/)
  assert.match(ui,/navigator\.clipboard\.writeText\(url\)/)
  assert.match(ui,/target="_blank" rel="noopener noreferrer"/)
  assert.doesNotMatch(ui,/HH_CRM_MSG_TELEGRAM_TOKEN\s*=/)
  assert.doesNotMatch(ui,/HH_CRM_MSG_META_APP_SECRET\s*=/)
})
