import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const page=read('app/[locale]/app/messages/page.tsx')
const hub=read('components/app/messages-hub.jsx')
const simple=read('components/app/messages-simple-inbox.jsx')
const orders=read('components/app/messages-orders-clients.jsx')
const nav=read('components/app/messages-bottom-navigation.jsx')
const css=read('app/[locale]/app/messages/messages-page.css')
test('default EN/RU/ES messages route renders approved Messenger without old Orders/Clients wrapper',()=>{
  assert.match(page,/const query=await searchParams/)
  assert.match(page,/const showOrders=query\?\.section==='orders'/)
  assert.match(page,/showOrders\?<MessagesOrdersClients/)
  assert.match(page,/:\s*<MessagesHub locale=\{locale\}\/>/)
  assert.match(page,/query\?\.section!=='clients'/)
  assert.match(page,/orderId=typeof query\?\.order==='string'/)
  assert.match(page,/\[0-9a-f\]\{12\}/i)
  assert.match(page,/if\(!\['en','ru','es'\]\.includes\(locale\)\)notFound\(\)/)
  assert.doesNotMatch(page,/default.*<CrmMessengerPanel|<DirectMessageInbox locale=\{locale\}\/>/)
})
test('approved Messenger preserves existing CRM plus direct and client request auth, not a fake chat',()=>{
  assert.match(hub,/if\(ownerAccountId\)return <MessagesSimpleInbox/)
  assert.match(simple,/data-simple-messages/)
  assert.match(simple,/className=\{selectedKey===row\.key\?styles\.personSelected:styles\.person\}/)
  assert.match(simple,/<CrmMessengerPanel/)
  assert.match(simple,/<DirectMessageInbox/)
  assert.match(simple,/<PracticeRequestConversation/)
  assert.match(orders,/data-orders-clients-hub/)
  assert.match(orders,/if\(value==='orders'\)url\.searchParams\.set\('section','orders'\)/)
  assert.match(page,/<MessagesOrdersClients locale=\{locale\}><MessagesHub locale=\{locale\}\/><\/MessagesOrdersClients>/)
  assert.doesNotMatch(page,/fetch\(|localStorage|sessionStorage|forcePaid|sendOneMessengerMessage/)
})
test('new mobile labels and compact orders escape are correct for RU/EN/ES',()=>{
  for(const label of ['Переписка','Заявки','Conversations','Requests','Conversaciones','Solicitudes'])
    assert.ok((simple+hub).includes(label),label)
  for(const label of ["ru:'Сообщения'","en:'Messages'","es:'Mensajes'"])
    assert.ok(nav.includes(label),label)
  assert.match(nav,/Icon:MessageCircle/)
  assert.match(page,/tab=chats':'section=orders'/)
  for(const label of ['Мои заказы','Mis pedidos','My orders','К переписке'])
    assert.ok(page.includes(label),label)
  assert.match(css,/hh-messages-context-link/)
  assert.match(css,/min-height:44px/)
  assert.match(css,/data-detail-open="true"/)
  assert.match(css,/data-thread-open="true"/)
  assert.match(css,/input:focus,textarea:focus/)
  assert.match(css,/env\(safe-area-inset-bottom\)/)
})
test('page renders valid Next TSX and order branch remains explicit',()=>{
  const result=ts.transpileModule(page,{
    fileName:'app/[locale]/app/messages/page.tsx',reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext},
  })
  const errs=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.deepEqual(errs.map(e=>ts.flattenDiagnosticMessageText(e.messageText,' ')),[])
})
