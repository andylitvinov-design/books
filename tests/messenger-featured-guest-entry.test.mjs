import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const hub=read('components/app/messages-orders-clients.jsx')
const gate=read('components/app/messenger-guest-gate.jsx')
const css=read('components/app/messenger-guest-gate.module.css')
const signin=read('components/app/messenger-sign-in.jsx')
const messagesHub=read('components/app/messages-hub.jsx')
test('illustrated guest entry is shared by Orders, Conversations and News, not logged-in screens',()=>{
 assert.match(hub,/import MessengerGuestGate from '.\/messenger-guest-gate'/)
 assert.match(hub,/const guestAccess=aiIdentity.status==='guest'/)
 for(const section of ['orders','clients','news']){
  assert.ok(hub.includes('<MessengerGuestGate locale={locale} section="'+section+'"'),section)
  assert.ok(gate.includes(section+':{eyebrow:'),section+' translation')
 }
 assert.match(css,/background-image:linear-gradient/)
 assert.match(css,/@media\(max-width:354px\)/)
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/)
 assert.doesNotMatch(gate,/localStorage|sessionStorage|sendBeacon|setAuthenticated/)
})
test('messenger invitations and real secure website login are kept separate',()=>{
 assert.match(gate,/resolveTelegramFirstEntry\(payload,locale\)/)
 assert.match(gate,/\/api\/public\/telegram-diagnostic/)
 assert.match(gate,/data-telegram-route=\{telegram.kind\}/)
 assert.match(gate,/whatsappEnquiryUrl\(\{locale,service:'Holistic House',request:copy.whatsappRequest\}\)/)
 assert.match(gate,/data-hh-guest-whatsapp/)
 assert.match(gate,/target="_blank" rel="noopener noreferrer nofollow" referrerPolicy="no-referrer"/)
 assert.match(gate,/<MessengerSignIn locale=\{locale\} continueTo="direct-messages" googleOnly\/>/)
 assert.match(signin,/googleOnly=false/)
 assert.match(signin,/messengerFirst&&!googleOnly/)
 assert.match(signin,/fetch\('\/api\/app\/auth\/start'/)
 assert.doesNotMatch(gate,/loginWithWhatsApp|loginWithTelegram|signInSuccess/)
 for(const label of ['Sign in to see your personal orders','Войдите, чтобы видеть личные заказы','Inicia sesión para ver tus pedidos','Написать в WhatsApp','Message us in WhatsApp','Escribir por WhatsApp'])assert.ok(gate.includes(label),label)
})
test('existing Messenger and new gate transpile as React JSX',()=>{
 for(const path of ['components/app/messages-orders-clients.jsx','components/app/messenger-sign-in.jsx','components/app/messenger-guest-gate.jsx']){
  const result=ts.transpileModule(read(path),{fileName:path,reportDiagnostics:true,
   compilerOptions:{allowJs:true,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}})
  const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error)
  assert.deepEqual(errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[],path)
 }
})

test('website Telegram login is separate server-gated Supabase OAuth, not bot-chat consent',()=>{
 assert.ok(signin.includes("fetch('/api/app/auth/providers'"))
 assert.ok(signin.includes('data?.telegram===true'))
 assert.ok(signin.includes('setTelegramWebsiteLogin(false)'))
 assert.ok(signin.includes("provider==='telegram'&&!telegramWebsiteLogin"))
 assert.ok(signin.includes('body:JSON.stringify({locale,continueTo,provider,'))
 assert.ok(signin.includes('data-hh-messenger-telegram-login'))
 assert.ok(signin.includes('data-hh-messenger-google-login'))
 assert.ok(signin.includes("onClick={()=>signin('telegram')}"))
 assert.ok(signin.includes("onClick={()=>signin('google')}"))
 assert.ok(signin.includes('await Browser.open({url:destination.href})'))
 assert.ok(signin.includes('resolveTelegramFirstEntry(data,locale)'))
 for(const translation of [
  'Open website Cabinet with Telegram',
  'Войти в кабинет сайта через Telegram',
  'Acceder al gabinete web con Telegram',
 ])assert.ok(signin.includes(translation),translation)
 assert.doesNotMatch(signin,/window\.localStorage|sessionStorage|loginWithWhatsApp/)
})


test('embedded Messages 401 uses the illustrated messenger-first guest entry without misrouting practitioner requests',()=>{
 const start=messagesHub.indexOf("if(embedded)return <div className={styles.hub} data-member-direct-fallback>")
 const end=messagesHub.indexOf("return <div className={styles.hub} data-messages-hub",start)
 assert.ok(start>=0&&end>start,'embedded fallback is present')
 const fallback=messagesHub.slice(start,end)
 assert.ok(messagesHub.includes("import MessengerGuestGate from './messenger-guest-gate'"))
 assert.ok(fallback.includes('<MessengerGuestGate locale={locale} section="clients"/>'))
 assert.ok(fallback.includes('directDestination'))
 assert.ok(fallback.includes('<MessengerSignIn locale={locale} recipientSlug={directDestination} label={t.masterSignIn}/>'))
 assert.ok(fallback.includes('{t.failure}'),'temporary API failures keep a separate neutral error state')
 assert.ok(fallback.includes('<DirectMessageInbox locale={locale} embedded compact ownerCrmAvailable={false}/>'))
 assert.ok(!fallback.includes('t.sessionRequired'),'generic 401 no longer renders the pale text-only sign-in banner')
 assert.ok(gate.includes('data-hh-guest-telegram'))
 assert.ok(gate.includes('data-hh-guest-whatsapp'))
 assert.ok(gate.includes('<MessengerSignIn locale={locale} continueTo="direct-messages" googleOnly/>'))
})
