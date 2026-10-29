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
 assert.match(page,/<MessagesBottomNavigation locale=\{locale\}\/>/)
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
   "q.get('section')==='clients'","q.get('order')","chooseOrder(order.id)",
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
    'Записаться на бесплатную консультацию',
    'Личный письменный разбор',
    'Пройти бесплатный курс практик Рейки',
    'Request a free personal consultation',
    'Solicitar una consulta gratuita',
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
 assert.match(hub,/<DirectMessageInbox locale=\{locale\} embedded compact ownerCrmAvailable=\{false\}\/>/)
 assert.match(hub,/!loading&&!unauthenticated&&!bootstrapSignInRequired/)
})
