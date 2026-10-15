import test from 'node:test'
import assert from 'node:assert/strict'
import {safeSessionExitTarget,sessionExitActionTarget,rememberSessionSaveTarget,consumeSessionSaveTarget} from '../lib/app/session-exit-navigation.js'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const origin='https://holistichouse.vercel.app'
const id='29e2a748-ea4c-4cb4-9561-5224482f9b44'
const current=origin+'/ru/client/session/aaaaaaaaaaaaaaaaaaaaaa'
const makeStore=()=>{
 const data=new Map()
 return {getItem:key=>data.get(key)||null,setItem:(key,val)=>data.set(key,val),removeItem:key=>data.delete(key),data}
}

test('first-party tabs trigger the session-save prompt, in-page and media links do not',()=>{
 assert.equal(safeSessionExitTarget(origin+'/ru/app/tests',origin,current),'/ru/app/tests')
 assert.equal(safeSessionExitTarget('/ru/app/portrait#personal-reports',origin,current),
   '/ru/app/portrait#personal-reports')
 assert.equal(safeSessionExitTarget('/en/academy?ref=public#intro',origin,current),'/en/academy')
 assert.equal(safeSessionExitTarget('/',origin,current),'/')
 assert.equal(safeSessionExitTarget(current+'#session-prescription',origin,current),null)
 for(const href of [
   'https://evil.example/ru/app/tests','//evil.example/steal',
   '/ru/client/session/secret','/ru/prescriptions/private','/ru/admin/settings',
   '/ru/api/app/save-intents','/ru/app/%63lient/secret','javascript:alert(1)',
   '/ru/app/%2e%2e/%2e%2e/private'
 ]) assert.equal(safeSessionExitTarget(href,origin,current),null,href)
})

test('only a short-lived intent ID can restore and consume a target once',()=>{
 const store=makeStore()
 assert.equal(rememberSessionSaveTarget(id,'/en/app/course',origin,store),true)
 assert.equal(consumeSessionSaveTarget(id,'en',origin,store),'/en/app/course')
 assert.equal(consumeSessionSaveTarget(id,'en',origin,store),null)
 assert.equal(rememberSessionSaveTarget('wrong-id','/en/app/course',origin,store),false)
 assert.equal(rememberSessionSaveTarget(id,'https://example.org/',origin,store),false)
})

test('stored return destination cannot be used as an open redirect or private invitation',()=>{
 const store=makeStore()
 assert.equal(rememberSessionSaveTarget(id,'/ru/app/portrait#personal-reports',origin,store),true)
 assert.equal(consumeSessionSaveTarget(id,'ru',origin,store),'/ru/app/portrait#personal-reports')
 assert.equal(rememberSessionSaveTarget(id,'/ru/app/tests',origin,store),true)
 const key=[...store.data.keys()][0]
 store.setItem(key,JSON.stringify({target:'https://evil.example/steal',createdAt:Date.now()}))
 assert.equal(consumeSessionSaveTarget(id,'ru',origin,store),null)
 assert.equal(rememberSessionSaveTarget(id,'/ru/app/tests',origin,store),true)
 store.setItem(key,JSON.stringify({target:'/ru/app/tests',createdAt:Date.now()-20*60*1000}))
 assert.equal(consumeSessionSaveTarget(id,'ru',origin,store),null)
})

test('session exit dialog is explicit, keyboard-accessible and allows refusal without saving',()=>{
 const guard=read('components/session-exit-save-guard.jsx')
 const entry=read('components/client-session-cabinet-entry.jsx')
 const page=read('components/client-session-page.jsx')
 const workspace=read('components/app/app-workspace.jsx')
 assert.match(guard,/data-hh-session-save-modal/)
 assert.match(guard,/aria-modal="true"/)
 assert.match(guard,/continueWithoutSaving/)
 assert.ok(guard.includes("document.addEventListener('click',intercept,true)"))
 assert.ok(guard.includes('event.preventDefault()'))
 assert.ok(guard.includes('setPending({next:target})'))
 assert.match(guard,/sourceKind:'client_session'/)
 assert.match(guard,/rememberSessionSaveTarget/)
 assert.match(guard,/auto=1/)
 assert.match(guard,/data.savedSessions/)
 assert.match(guard,/sourceSessionId===sessionId/)
 assert.match(guard,/if\(savedSessionId\)/)
 assert.match(guard,/cabinetMode&&sessionId/)
 assert.match(entry,/exit.requestExit/)
 assert.match(page,/SessionExitSaveGuard/)
 assert.match(workspace,/consumeSessionSaveTarget/)
})

test('legacy Client Cabinet navigation is offered Save without persisting its selector',()=>{
 const privatePage='https://holistichouse.vercel.app/ru/client/abcdefghijklmnopqrstuv/sessions/29e2a748-ea4c-4cb4-9561-5224482f9b44'
 const route=sessionExitActionTarget(privatePage,origin,current)
 assert.equal(route.afterSave,'/ru/app/portrait#personal-reports')
 assert.equal(route.withoutSave,privatePage)
 const store=makeStore()
 assert.equal(rememberSessionSaveTarget(id,route.afterSave,origin,store),true)
 const stored=[...store.data.values()][0]
 assert(!stored.includes('abcdefghijklmnopqrstuv'))
 assert.equal(consumeSessionSaveTarget(id,'ru',origin,store),'/ru/app/portrait#personal-reports')
 assert.equal(sessionExitActionTarget('https://elsewhere.example/ru/client/abcdefghijklmnopqrstuv',origin,current),null)
})


test('homepage language remains on chosen first-party route after Google save',()=>{
  assert.equal(safeSessionExitTarget('/?lang=ru',origin,current),'/?lang=ru')
  assert.equal(safeSessionExitTarget('/?lang=en',origin,current),'/?lang=en')
  assert.equal(safeSessionExitTarget('/?lang=ru&client=secret',origin,current),'/')
  assert.equal(safeSessionExitTarget('/?return=https://evil.example&lang=ru',origin,current),'/')
  const store=makeStore()
  assert.equal(rememberSessionSaveTarget(id,'/?lang=ru',origin,store),true)
  assert.equal(consumeSessionSaveTarget(id,'ru',origin,store),'/?lang=ru')
  assert.equal(consumeSessionSaveTarget(id,'ru',origin,store),null)
  const config=read('next.config.ts')
  assert.ok(config.includes('{ source: "/ru", destination: "/?lang=ru", permanent: true }'))
})
