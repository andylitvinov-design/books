import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const workspace=read('components/app/practice-workspace.jsx')
const nav=read('components/app/practice-inner-navigation.jsx')
const client=read('components/app/practitioner-client-profiles.jsx')
const materials=read('components/app/practice-materials.jsx')
const messages=read('components/app/messages-simple-inbox.jsx')
const mobileNav=read('components/app/messages-bottom-navigation.jsx')
const requestCss=read('components/app/practice-dashboard.css')
const clientCss=read('components/app/practitioner-client-profiles.module.css')
const materialsCss=read('components/app/practice-materials.module.css')
const messagesCss=read('components/app/messages-simple-inbox.module.css')
const ordersCss=read('components/app/messages-orders-clients.module.css')

test('four internal designs reuse real practitioner, order and resource modules',()=>{
 assert.match(workspace,/data-practice-inner-requests/)
 assert.match(workspace,/PracticeInnerHeader locale=\{locale\}/)
 assert.match(workspace,/PracticeInnerBottomNavigation locale=\{locale\}/)
 assert.match(workspace,/<PractitionerClientProfiles items=\{requests\} services=\{services\}/)
 assert.match(workspace,/<PracticeMaterials key=\{p\?\.id\|\|'materials'\}/)
 assert.match(messages,/data-simple-messages/)
 assert.match(messages,/CrmMessengerPanel/)
 assert.match(messages,/DirectMessageInbox/)
 assert.match(messages,/PracticeRequestConversation/)
})

test('requests show only derived status, published service and user-submitted details',()=>{
 for(const s of ['newCount=items.filter','workCount=items.filter','doneCount=items.filter','visible.map(x=>','services.find(item=>item.id===x.serviceId)',
  'data-request-status={x.status}', 'onOpenRequest?.(x)','hh-inner-request-details']){
  assert.ok(workspace.includes(s),s)
 }
 assert.match(workspace,/setFocusRequestId\(item.id\);choosePanel\('clients'\)/)
 assert.match(workspace,/x\.remoteBooking\?\.price/)
 assert.match(workspace,/x\.accountRequest===true\|\|x\.reportEligible===true/)
 assert.match(workspace,/PracticeInnerBottomNavigation/)
 assert.doesNotMatch(workspace,/Math\.random\(\).*status|fakeRequest|demoRequest/)
})

test('client profile preserves request-specific secure history, tasks and in-site audio',()=>{
 for(const s of ['currentRequest=selected?.items.find','data-client-current-request','data-practice-client-card',
  'client-request-\'+currentRequest.id','<PracticeRequestConversation key={request.id}',
  '<PractitionerRequestTasks key={\'tasks:\'+request.id}']){
  assert.ok(client.includes(s),s)
 }
 assert.match(client,/groupVerifiedPractitionerClients\(items,lang\)/)
 assert.match(client,/fetch\('\/api\/app\/practitioner\/legacy-clients'/)
 assert.match(client,/onOpenLegacy\?\.\(client.id\)/)
 assert.match(clientCss,/\.currentFocus\{/)
 assert.match(clientCss,/\.request:target\{/)
 assert.doesNotMatch(client,/mergeClientsByName|storeClientHealthInInbox|createPayment/)
})

test('Materials retains existing courses, moderation and owner-only private report files',()=>{
 assert.match(materials,/const activeTabs=\['courses','videos'/)
 assert.match(materials,/tab==='files'&&isOwner/)
 assert.match(materials,/data-practice-private-files/)
 assert.match(materials,/data-practice-master-courses/)
 assert.match(materials,/PracticeReportMaterials items=\{reportItems\}/)
 assert.match(materials,/reportMode==='loading'/)
 assert.match(materials,/\/api\/app\/practice\/report-materials/)
 assert.match(materials,/onSubmitVideos/)
 assert.match(materials,/PractitionerCourseBuilder/)
 assert.match(materialsCss,/reiki-practitioner-sunrise\.webp/)
 assert.doesNotMatch(materials,/localStorage|SUPABASE_SERVICE_ROLE_KEY/)
})

test('message redesign preserves actual private audio/media send and viewport keyboard behavior',()=>{
 assert.match(messages,/CrmMessengerPanel key=\{accountId/)
 assert.match(messages,/DirectMessageInbox key=\{accountId/)
 assert.match(messages,/PracticeRequestConversation key=\{selected\.id\} inline autoOpen/)
 assert.match(messages,/window\.visualViewport/)
 assert.match(messages,/--hh-mobile-window-height/)
 assert.match(messagesCss,/height:var\(--hh-mobile-window-height,calc\(100dvh - 152px\)\)/)
 assert.match(messagesCss,/background:linear-gradient\(110deg,#019d7a,#00785f\)/)
 assert.match(ordersCss,/\.orderFoot em\[data-kind="working"\]/)
 assert.doesNotMatch(messages,/sendOneMessengerMessage\(|fakeMessage|sampleConversation/)
})

test('five safe-area practitioner destinations are localized and never create a second CRM',()=>{
 // The current component intentionally uses one guarded registry, rather than
 // repeating inline panel comparisons in each view.
 const supported=nav.match(/const PANELS=new Set\(\[([^\]]+)\]\)/)?.[1]
 assert.ok(supported,'protected practitioner panel registry must exist')
 assert.equal((nav.match(/if\(!PANELS\.has\(panel\)\)return null/g)||[]).length,2,
  'both header and dock must reject unregistered panels')
 for(const key of ['requests','clients','materials','profile','analytics']){
  assert.match(supported,new RegExp("'"+key+"'"),key+' must be registered')
  assert.match(nav,new RegExp('\\b'+key+':t\\.'+key+'Title\\b'),key+' must have a guarded header title')
  assert.match(nav,new RegExp('\\b'+key+':t\\.'+key+'Intro\\b'),key+' must have a guarded introduction')
  assert.equal((nav.match(new RegExp(key+'Title:', 'g'))||[]).length,3,key+' must have EN/RU/ES title translations')
  assert.equal((nav.match(new RegExp(key+'Intro:', 'g'))||[]).length,3,key+' must have EN/RU/ES intro translations')
 }
 for(const label of ['Главная','Практика','Заявки','Материалы','Профиль','Inicio','Solicitudes','Client records'])
  assert.ok(nav.includes(label),label)
 for(const s of ['data-practice-inner-dock','aria-current={selected?', 'onOpenMaterials(\'courses\')']) {
  // The action is owned by existing protected callbacks, not a duplicate service.
  assert.ok(nav.includes(s)||nav.includes(s.replace('onOpenMaterials(\'courses\')',"onOpenMaterials('courses')")),s)
 }
 assert.match(mobileNav,/path:'materials'/)
 assert.match(mobileNav,/path:'profile'/)
 assert.match(mobileNav,/app\/practice\?panel=materials/)
 assert.match(mobileNav,/app\/practice\?panel=profile/)
 assert.match(requestCss,/env\(safe-area-inset-bottom\)/)
 assert.match(requestCss,/@media\(max-width:355px\)/)
 assert.match(clientCss,/@media\(max-width:355px\)/)
 assert.match(materialsCss,/@media\(max-width:350px\)/)
 assert.match(messagesCss,/@media\(max-width:355px\)/)
 assert.doesNotMatch(nav,/fetch\(|localStorage|window\.location\.assign|crm_contacts/)
})

test('new and edited UI modules are syntax-valid for current React/TypeScript',()=>{
 const files=[
  'components/app/practice-inner-navigation.jsx',
  'components/app/practice-workspace.jsx',
  'components/app/practitioner-client-profiles.jsx',
  'components/app/practice-materials.jsx',
  'components/app/messages-bottom-navigation.jsx',
  'components/app/messages-simple-inbox.jsx',
  'components/app/messages-orders-clients.jsx',
  'components/practice-showcase.jsx',
 ]
 for(const file of files){
  const transpiled=ts.transpileModule(read(file),{
   fileName:file,reportDiagnostics:true,
   compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
  })
  const errs=(transpiled.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.deepEqual(errs.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],file)
 }
})
