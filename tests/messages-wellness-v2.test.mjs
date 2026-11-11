import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('the single authenticated Messages entry defaults to Orders / Clients, not two separate pages',()=>{
 const page=source('app/[locale]/app/messages/page.tsx')
 const design=source('docs/design/MESSAGES_WELLNESS_ORDERS_CLIENTS_20261029.md')
 assert.match(page,/<MessagesOrdersClients locale=\{locale\}>/)
 assert.match(page,/<MessagesHub locale=\{locale\} embedded\/>/)
 assert.doesNotMatch(page,/MessagesBottomNavigation/)
 assert.ok(source('app/layout.tsx').includes('<UnifiedMobileDock initialLocale={lang}'))
 assert.doesNotMatch(page,/showOrders\?/)
 assert.doesNotMatch(page,/hh-messages-context-nav/)
 assert.match(design,/Page identity gate/)
 assert.match(design,/actual order|real.*status|no fake/i)
 const compiled=ts.transpileModule(page,{fileName:'page.tsx',reportDiagnostics:true,
   compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}})
 assert.deepEqual((compiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error),[])
})

test('EN/RU/ES orders and clients are actual account-scoped tabs and never synthetic fixtures',()=>{
 const ui=source('components/app/messages-orders-clients.jsx')
 const css=source('components/app/messages-orders-clients.module.css')
 const api=source('app/api/app/messages/my-orders/route.js')
 for(const word of ['Мои заказы','Мои клиенты','My orders','My clients','Mis pedidos','Mis clientes'])
   assert.ok(ui.includes(word),word)
 for(const required of ['data-orders-clients-hub','data-section={section}',
   "role=\"tablist\"","aria-selected={section==='orders'}","aria-selected={section==='clients'}",
   "requested==='clients'","requested==='orders'","q.get('order')","chooseOrder(order.id)",
   'cloneElement(children,','onClientsCount:setClientCount','onDetailChange:setClientDetailOpen',
   'search.trim().toLocaleLowerCase()','filter===key','PracticeRequestConversation key={selected.id}'])
   assert.ok(ui.includes(required),required)
 assert.match(ui,/data-kind=\{category\(order\)\}/)
 assert.match(ui,/order\.unread>0&&<b className=\{styles\.unread\}>/)
 assert.match(ui,/order\.practitionerName/)
 assert.match(css,/\.introCard\{[^}]*linear-gradient/)
 assert.match(css,/\.root \.order\{[^}]*border-radius:18px/)
 assert.match(css,/@media\(max-width:354px\)/)
 assert.match(api,/const actor=await auth\.verified\(\)/)
 assert.match(api,/myOrderInbox\(actor\)/)
 assert.doesNotMatch(ui,/providerPaid:true|paymentStatus:'paid'|demoOrders|mockOrders|fakeOrders/)
})

test('owner My Clients merges existing real CRM, direct, request and business rows into one folder',()=>{
 const hub=source('components/app/messages-hub.jsx')
 const client=source('components/app/messages-simple-inbox.jsx')
 const css=source('components/app/messages-simple-inbox.module.css')
 assert.match(hub,/if\(ownerAccountId\)return <MessagesSimpleInbox/)
 assert.match(hub,/embedded=\{embedded\}/)
 assert.match(hub,/onClientsCount=\{onClientsCount\}/)
 assert.match(client,/data-embedded=\{embedded\|\|undefined\}/)
 for(const k of ["key:'crm:'","key:'direct:'","key:'request:'","key:'business:'"])
   assert.ok(client.includes(k),k)
 assert.match(client,/const displayed=embedded/)
 assert.match(client,/!unreadOnly\|\|row\.unread>0/)
 assert.match(client,/onClientsCount\?\.\(rows\.length\)/)
 assert.match(client,/onDetailChange\?\.\(openDetail\)/)
 assert.match(client,/!embedded&&!inMessagesTab\(selected,tab\)/)
 assert.match(client,/<CrmMessengerPanel key=\{accountId/)
 assert.match(client,/<DirectMessageInbox key=\{accountId/)
 assert.match(client,/<PracticeRequestConversation key=\{selected.id\} inline autoOpen/)
 assert.match(css,/\.shell\[data-embedded="true"\] \.person/)
 assert.match(css,/@media\(max-width:700px\)/)
 assert.doesNotMatch(client,/api\.telegram\.org|service_role|localStorage|sessionStorage/)
})

test('order detail sends through its real request with protected participants only',()=>{
 const orders=source('components/app/messages-orders-clients.jsx')
 const chat=source('components/app/practice-request-conversation.jsx')
 const route=source('app/api/app/practitioner-client-messages/route.js')
 assert.match(orders,/requestId=\{selected\.id\} accountId=\{ordersData\.accountId\}/)
 assert.match(orders,/inline autoOpen initialMessage=\{selected\.message\|\|''\}/)
 assert.match(chat,/method:'POST',credentials:'same-origin'/)
 assert.match(chat,/X-HH-Account-Id/)
 assert.match(chat,/crypto\.randomUUID\(\)/)
 assert.match(route,/const actor=await auth\.verified\(\)/)
 assert.match(route,/createPractitionerClientMessages\(config\)/)
})

test('zero owned orders shows exactly two real free offer links, and truthful EN/RU/ES copy',()=>{
  const ui=source('components/app/messages-orders-clients.jsx')
  const css=source('components/app/messages-orders-clients.module.css')
  const review=source('app/[locale]/services/free-situation-review/page.tsx')
  const academy=source('app/[locale]/academy/[[...slug]]/page.tsx')
  for(const required of [
    '!loading&&!error&&!selected&&ordersData&&orders.length===0',
    'data-free-order-offers',
    'data-free-order-offer="consultation"',
    'data-free-order-offer="reiki"',
    '/services/free-situation-review',
    '/academy/reiki/free-practitioner-course',
    'andy-about.png',
    'reiki-practitioner-sunrise.webp',
    'Получить бесплатный письменный разбор',
    'Личный письменный разбор',
    'Пройти бесплатный курс практик Рейки',
    'Get a free written personal review',
    'Solicitar un análisis personal escrito gratuito',
    '!selected&&!loading&&!error&&orders.length>0',
  ])assert.ok(ui.includes(required),required)
  assert.equal([...ui.matchAll(/data-free-order-offer=/g)].length,2)
  assert.ok(review.includes('FreeEntryLanding locale={locale} kind="situation"'))
  assert.ok(academy.includes('key === "reiki/free-practitioner-course"'))
  for(const required of [
    '.freeOffers{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))',
    '.freeOffer{display:flex;align-items:center',
    '.freeOffers{grid-template-columns:minmax(0,1fr)',
    '.freeOffer img{width:67px;height:75px',
    ':focus-visible',
  ])assert.ok(css.includes(required),required)
  assert.equal(ui.includes('freeConsultationDetail:\'30 min'),false)
})

test('practitioner client inbox is unified without revealing owner-only CRM',()=>{
 const hub=source('components/app/messages-hub.jsx')
 const ui=source('components/app/messages-simple-inbox.jsx')
 assert.match(hub,/if\(embedded&&requestData\?\.accountId\)return <MessagesSimpleInbox/)
 assert.match(hub,/crmEnabled=\{false\} embedded/)
 assert.match(hub,/accountId=\{requestData\.accountId\}/)
 assert.match(ui,/crmEnabled=true,onClientsCount/)
 assert.match(ui,/crmEnabled&&<CrmMessengerPanel/)
 assert.match(ui,/loading:crmEnabled/)
 assert.match(ui,/selected\?\.kind!=='crm'\|\|!crmEnabled/)
 assert.match(ui,/<DirectMessageInbox key=\{accountId/)
 assert.match(ui,/<PracticeRequestConversation key=\{selected.id\} inline autoOpen/)
})

test('direct messenger remains available when the optional request directory is down',()=>{
 const hub=source('components/app/messages-hub.jsx')
 assert.match(hub,/if\(embedded\)return <div className=\{styles.hub\} data-member-direct-fallback>/)
 assert.match(hub,/<MessengerGuestGate locale=\{locale\} section="clients"\/>/)
 assert.match(hub,/if\(embedded\)return[\s\S]*?<DirectMessageInbox locale=\{locale\} embedded compact ownerCrmAvailable=\{false\}\/>/)
 assert.match(hub,/if\(ownerAccountId&&directDestination\)[\s\S]*?recipientSlug=\{directDestination\}/)
 assert.match(hub,/\(unauthenticated\|\|bootstrapSignInRequired\)[\s\S]*?<MessengerGuestGate/)
})

test('CSP class is identical on Spanish app routes in server and client',()=>{
 const client=source('components/csp-navigation-boundary.tsx')
 const edge=source('middleware.ts')
 assert.ok(client.includes('^\\/(ru|en|es)\\/app'))
 assert.ok(edge.includes('^\\/(ru|en|es)\\/app'))
 assert.equal(client.includes('^\\/(ru|en)\\/app'),false)
})

test('owner-approved Messenger restores truthful compact empty Orders art and copy',()=>{
 const ui=source('components/app/messages-orders-clients.jsx')
 const css=source('components/app/messages-orders-clients.module.css')
 assert.match(ui,/const listHelper=section!=='ai'&&section!=='news'&&!detailMode&&!loading&&!error&&Boolean\(ordersData\)/)
 assert.match(ui,/<div id="hh-news-panel"[^>]*hidden=\{section!=='news'\}/)
 assert.match(ui,/data-messenger-list-helper/)
 assert.match(ui,/<div id="hh-orders-panel"[^>]*>/)
 assert.match(ui,/<div id="hh-clients-panel"[^>]*>/)
 assert.match(ui,/const guestAccess=aiIdentity.status==='guest'/)
 assert.match(ui,/<MessengerGuestGate locale=\{locale\} section="orders"\/>/)
 assert.match(ui,/<MessengerGuestGate locale=\{locale\} section="clients"\/>/)
 assert.equal((ui.match(/\{listHelper\}/g)||[]).length,2) // Both signed-in list helpers remain
 assert.match(ui,/className=\{styles.emptyHint\} role="status"/)
 assert.match(ui,/t.emptyHelp/)
 assert.match(ui,/freeConsultation:'Получить бесплатный письменный разбор'/)
 assert.match(css,/\.root \.emptyHint\{/)
 assert.match(css,/\.root \.introCard\{min-height:72px/)
 // The two actual free entry links remain intact; no fake order/booking records.
 assert.equal((ui.match(/data-free-order-offer=/g)||[]).length,2)
 assert.doesNotMatch(ui,/setOrders\(\[|demoOrders|fakeOrders|paymentStatus:'paid'/)
})

test('CRM message compose is an accessible single-row icon helper + message + Send',()=>{
 const crm=source('components/app/crm-messenger.jsx')
 const css=source('components/app/crm-messenger.module.css')
 const bot=source('components/app/crm-salesbot-assist.jsx')
 const botCss=source('components/app/crm-salesbot-assist.module.css')
 assert.match(crm,/className=\{styles.readLabel\}/)
 assert.match(crm,/aria-label=\{t.read\} title=\{t.read\}/)
 assert.match(crm,/conversationOnly\|\|compact\?<Send size=\{20\} aria-hidden="true"\/>/)
 assert.match(crm,/iconOnly=\{conversationOnly\}/)
 assert.match(crm,/requestId:pending.id,purpose:'customer_reply'/)
 assert.match(css,/\.detailConversation \.salesbotAssistSlot\{/)
 assert.match(css,/grid-template-columns:44px minmax\(0,1fr\) 46px/)
 assert.match(css,/\.detailConversation \.readLabel\{/)
 assert.match(bot,/iconOnly\?<Sparkles size=\{20\} aria-hidden="true"\/>/)
 assert.match(botCss,/\.launcherIcon\+\.panel\{/)
 assert.doesNotMatch(crm,/type="file"|capture="user"|MediaRecorder/)
})

test('client list shows distinct useful preview and source, never duplicate Telegram text',()=>{
 const ui=source('components/app/messages-simple-inbox.jsx')
 const css=source('components/app/messages-simple-inbox.module.css')
 assert.match(ui,/preview:item.needsReply\?t.previewNeedsReply:t.previewHistory/)
 assert.match(ui,/previewNeedsReply:'Откройте переписку, чтобы ответить'/)
 assert.match(ui,/className=\{styles.sourceTag\}/)
 assert.match(ui,/crmEnabled=\{false\} embedded|crmEnabled=true/)
 assert.match(css,/\.shell\[data-embedded="true"\] \.person,/)
 assert.match(css,/\.shell\[data-embedded="true"\] \.back\{/)
})

test('Messenger keeps the same header and tab shell across AI, Orders, Clients and delayed data',()=>{
 const ui=source('components/app/messages-orders-clients.jsx')
 const css=source('components/app/messages-orders-clients.module.css')
 for(const text of ['AI · Orders · Clients','ИИ · Заказы · Клиенты','IA · Pedidos · Clientes'])
   assert.ok(ui.includes(text),text)
 for(const label of ["AI Assistant","ИИ-ассистент","Asistente IA"])assert.ok(ui.includes(label),label);
 assert.match(ui,/data-hh-ai-chat-history/);
 assert.match(ui,/data-hh-ai-new-chat/);
 assert.doesNotMatch(ui,/<p>\{section==='ai'\?/)
 const header=ui.indexOf('<header className={styles.head} data-hh-ai-assistant-header>')
 const tabs=ui.indexOf('<div className={styles.sections} role="tablist"')
 const orders=ui.indexOf('<div id="hh-orders-panel"')
 assert.ok(tabs!==-1&&header>tabs&&orders>header,'tab switcher appears before shared heading')
 assert.equal(ui.slice(header,tabs).includes('introCard'),false,'no network-dependent banner before tabs')
 assert.match(css,/\.root \.head\{height:92px;min-height:92px/)
 assert.match(css,/\.root \.head\{height:84px;min-height:84px/)
 assert.match(css,/\.root \.sections button,\.root \.sections \.aiTab\{height:52px;min-height:52px/)
 assert.match(css,/\.root \.sections \.count\{[^}]*position:absolute/)
})


test('owner Messenger preserves one chat with six in-chat entries and locale control',()=>{
 const ui=source('components/app/messages-orders-clients.jsx')
 const ai=source('components/app/messenger-ai-workspace.jsx')
 const css=source('components/app/messenger-ai-workspace.module.css')
 const chat=source('components/holistic-agent-chat.tsx')
 const mobile=source('app/[locale]/app/messages/messages-page.css')
 assert.ok(ui.indexOf('<div className={styles.sections} role="tablist"')<
   ui.indexOf('<header className={styles.head} data-hh-ai-assistant-header>'))
 assert.match(css,/\.layout\{display:flex;flex-direction:column/)
 assert.match(css,/\.content\{display:flex;flex:1/)
 assert.ok(chat.includes('data-hh-ai-welcome'))
 for(const id of ['video','meditation'])assert.ok(chat.includes('data-hh-ai-start="'+id+'"'))
 assert.ok(chat.includes('startGuided(kind:'))
 assert.ok(chat.includes('isCasualGreeting(text)'))
 // One original protected chat. The approved six-action landing opens only
 // on a user gesture; its old IHelpTopics rail and automatic prompt transfer
 // were retired. Auth/consent, one composer and local draft remain intact.
 assert.doesNotMatch(ai,/data-chat-menu-rail/)
 assert.equal((ai.match(/<HolisticAgentChat\b/g)||[]).length,1)
 assert.match(ai,/<HolisticAgentChat locale=\{locale\} compact messengerView/)
 assert.match(ai,/authenticated=\{authenticated\} authStatus=\{authStatus\}/)
 assert.match(ai,/onAuthRetry=\{onAuthRetry\}/)
 assert.match(ai,/onConversationLocaleChange=\{onConversationLocaleChange\}/)
 assert.match(chat,/data-chat-skin=\{messengerView\?"messenger":undefined\}/)
 assert.doesNotMatch(ai,/<IHelpTopics\b|quickPrompt=\{/)
 assert.match(chat,/compact&&messengerView&&!pageHelp&&!messages\.length&&<>[\s\S]*?<MessengerAiLanding/)
 assert.ok(chat.includes('<MessengerSixProjects locale={locale} onSelect={startProject}/>'))
 assert.match(chat,/onCreateVideo=\{(?:startContent|\(\)\s*=>\s*startContent\(\))\}/)
 assert.match(chat,/onPractice=\{\(\)=>startGuided\("meditation"\)\}/)
 assert.match(chat,/onAsk=\{\(\)=>composerRef\.current\?\.focus\(\{preventScroll:true\}\)\}/)
 assert.match(chat,/if\(!quickPrompt\)return;\s*setDraft\(quickPrompt\.text\.slice\(0,2000\)\)/)
 const landing=source('components/app/messenger-ai-landing.tsx')
 assert.match(landing,/const ACTIONS=\[/)
 for(const id of ['test','video','practice','session','course','ask'])
   assert.ok(landing.includes('{id:"'+id+'"'),id)
 assert.equal((landing.match(/\{id:"(?:test|video|practice|session|course|ask)"/g)||[]).length,6)
 assert.match(landing,/data-hh-ai-choice=\{item\.id\}/)
 assert.match(landing,/onClick=\{item\.id==="video"\?onCreateVideo:/)
 assert.match(landing,/data-hh-ai-intro-play onClick=\{\(\)=>setPlaying\(true\)\}/)
 assert.match(chat,/method:"POST",credentials:"same-origin"/)
 assert.ok(mobile.includes('body:has(.hh-messages-page[data-hh-mobile-keyboard-open="true"]) [data-hh-unified-dock]'))
 assert.match(ui,/data-free-order-offers/)
 assert.match(ui,/PracticeRequestConversation key=\{selected.id\}/)
})


test('compact chat CSS scopes to the actual global Messages route, not a CSS-module-local class',()=>{
 const css=source('components/holistic-agent-chat.module.css')
 assert.match(css,/:global\(\.hh-messages-page\) \.root\[data-compact\] \.thread/)
 assert.match(css,/:global\(\.hh-messages-page\) \.root\[data-compact\] \.form textarea/)
 assert.doesNotMatch(css,/(?:^|\n)\.hh-messages-page \.root\[data-compact\]/)
})

test('owner P0: mobile AI chat stays mounted across folders, never autofocuses quick actions',()=>{
 const hub=source('components/app/messages-orders-clients.jsx')
 const ai=source('components/holistic-agent-chat.tsx')
 const css=source('components/holistic-agent-chat.module.css')
 const pageCss=source('app/[locale]/app/messages/messages-page.css')
 assert.match(hub,/<div id="hh-ai-panel"[^>]*hidden=\{section!=='ai'\}/)
 assert.match(hub,/<div id="hh-orders-panel"[^>]*hidden=\{section!=='orders'\}/)
 assert.match(hub,/<div id="hh-clients-panel"[^>]*hidden=\{section!=='clients'\}/)
 assert.doesNotMatch(hub,/setSelectedId\(''\)\}/)
 assert.match(hub,/--hh-messenger-height/)
 assert.match(hub,/aiAccountRef\.current/)
 assert.match(hub,/key=\{aiSession\}/)
 assert.match(hub,/visualViewport/)
 assert.match(hub,/data-hh-order-active-chat/)
 assert.match(hub,/--hh-order-chat-height/)
 assert.match(ai,/if\(!compact\)composerRef\.current\?\.focus/)
 assert.match(ai,/data-has-messages/)
 assert.match(ai,/followTail\.current/)
 assert.match(css,/flex:1 1 auto;min-height:48px;max-height:none/)
 assert.match(pageCss,/\[data-hh-unified-dock\]/)
});

test('hidden private dialogs never hide navigation in another folder',()=>{
 const ui=source('components/app/messages-orders-clients.jsx')
 const css=source('app/[locale]/app/messages/messages-page.css')
 assert.match(ui,/clientsVisited&&/)
 assert.match(ui,/if\(section==='clients'\)setClientsVisited\(true\)/)
 assert.match(css,/data-section="orders"\] \[data-hh-order-active-chat\]/)
 assert.match(css,/data-section="clients"\] \[data-simple-messages\]/)
 assert.doesNotMatch(css,/body:has\(\.hh-messages-page \[data-hh-order-active-chat\]\)/)
})

test('AI long messages auto-grow safely and scrollback exposes explicit new-reply navigation',()=>{
 const agent=source('components/holistic-agent-chat.tsx')
 const css=source('components/holistic-agent-chat.module.css')
 assert.match(agent,/input\.style\.height='44px'/)
 assert.match(agent,/Math\.min\(100,input\.scrollHeight\)/)
 assert.match(agent,/followTail\.current/)
 assert.match(agent,/setNewBelow\(true\)/)
 assert.match(agent,/className=\{styles\.jumpToLatest\}/)
 assert.match(agent,/locale==="ru"\?"↓ Новые сообщения"/)
 assert.match(css,/\.root \.jumpToLatest\{/)
 assert.match(css,/order:2;flex:none;margin:0 auto/)
})

test('client card shows consented lead attribution without revealing private URL parameters',()=>{
 const card=source('components/app/messages-contact-card.jsx')
 const backend=source('lib/practitioners/public-service-enquiry.js')
 const parser=source('lib/analytics/enquiry-attribution.mjs')
 assert.match(backend,/attribution: normalizeEnquiryAttribution\(row\.attribution\)/)
 assert.match(parser,/ENQUIRY_ATTRIBUTION_CONSENT_COOKIE/)
 assert.match(parser,/return null/)
 assert.match(card,/const attribution=publicRequest\?item\.item\?\.attribution:null/)
 for(const property of ['landingPath','trafficSource','campaign','previousPath'])
   assert.ok(card.includes("field(attribution,'"+property+"')"),property)
 for(const locale of ["en:{reference:","ru:{reference:","es:{reference:"])
   assert.ok(card.includes(locale),'all card locales retain a source label')
 assert.match(card,/\{landing&&<div><dt>\{t\.landing\}/)
 assert.match(card,/\{traffic&&<div><dt>\{t\.traffic\}/)
 assert.doesNotMatch(card,/document\.referrer|window\.location\.search|localStorage\./)
})

test('mobile dock follows the actual visual keyboard, not lingering input focus',()=>{
 const nav=source('components/unified-mobile-dock.tsx')
 const detector=source('lib/mobile-visual-bottom.mjs')
 const page=source('app/[locale]/app/messages/messages-page.css')
 const route=source('app/[locale]/app/messages/page.tsx')
 const hub=source('components/app/messages-orders-clients.jsx')
 const aiCss=source('components/app/messenger-ai-workspace.module.css')
 assert.ok(!route.includes('MessagesBottomNavigation'))
 assert.ok(nav.includes('visualKeyboardOpen('))
 assert.ok(nav.includes('messengerPage.dataset.hhMobileKeyboardOpen = hideForKeyboard'))
 assert.ok(detector.includes('Math.max(fromLayout, fromUnfocused) > 140'))
 assert.ok(hub.includes('const limit=keyboard?bottom:'))
 assert.ok(hub.includes('sharedKeyboard||window.innerHeight-bottom>92'))
 assert.ok(page.includes('body:has(.hh-messages-page[data-hh-mobile-keyboard-open="true"])'))
 assert.ok(!page.includes(':has(input:focus,textarea:focus)'))
 assert.ok(aiCss.includes('.content{display:flex;flex:1'))
 assert.ok(source('components/holistic-agent-chat.module.css').includes('>.form'))
})
