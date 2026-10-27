import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Telegram photo blob previews are allowed only on the two owner messenger routes',()=>{
  const middleware=read('middleware.ts')
  const declaration=middleware.match(/const ownerMessengerImages = (\/\^.+\/)\.test\(pathname\)/)
  assert.ok(declaration,'private owner-messenger image route guard exists')
  const guardedPaths=runInNewContext(declaration[1])
  for(const path of ['/en/app/messages','/ru/app/messages','/es/app/messages',
    '/en/app/practice','/ru/app/practice/','/es/app/practice']){
    assert.equal(guardedPaths.test(path),true,path)
  }
  for(const path of ['/','/en','/en/services/free-situation-review','/en/client/123',
    '/en/app/reports','/en/app/portrait','/api/app/crm/messenger/photo',
    '/en/app/messages/someone-else','/admin']){
    assert.equal(guardedPaths.test(path),false,path)
  }
  assert.match(middleware,/\(ownerMessengerImages \? ' blob:' : ''\)/)
  assert.match(middleware,/"frame-src 'none'"/)
  assert.match(middleware,/"object-src 'none'"/)
})

test('Photos are resolved only in authenticated owner CRM thread and have retries and image error states',()=>{
  const ui=read('components/app/crm-telegram-photo.jsx')
  const css=read('components/app/crm-telegram-photo.module.css')
  assert.match(ui,/fetch\('\/api\/app\/crm\/messenger\/photo\?'/)
  assert.match(ui,/credentials:'same-origin',cache:'no-store'/)
  assert.match(ui,/'X-HH-Account-Id':accountId/)
  assert.match(ui,/new URLSearchParams\(\{threadId,messageId\}\)/)
  assert.match(ui,/URL\.createObjectURL\(blob\)/)
  assert.match(ui,/URL\.revokeObjectURL\(objectUrl\)/)
  assert.match(ui,/onLoad=\{\(\)=>setState\('ready'\)\}/)
  assert.match(ui,/onError=\{\(\)=>setState\('error'\)\}/)
  assert.match(ui,/setRetry\(value=>value\+1\)/)
  assert.match(ui,/<PrivateChatPhoto src=\{src\}/)
  const viewer=read('components/app/private-chat-photo.jsx')
  const viewerCss=read('components/app/private-chat-photo.module.css')
  assert.match(viewer,/aria-expanded=\{open\}/)
  assert.match(viewer,/role="dialog" aria-modal="true"/)
  assert.match(viewer,/event.key==='Escape'/)
  assert.match(viewer,/trigger.current\?\.focus\(\)/)
  assert.match(viewer,/createPortal\(/)
  assert.match(viewerCss,/position:fixed;inset:0/)
  assert.match(viewerCss,/safe-area-inset-top/)
  assert.doesNotMatch(viewer,/api.telegram.org|file_id|sessionStorage|localStorage/)
  assert.doesNotMatch(ui,/api\.telegram\.org|file_id|telegramPhotoFileId/)
})

test('Private photos remain linked to the new one-screen customer messenger',()=>{
  const chat=read('components/app/crm-messenger.jsx')
  const css=read('components/app/crm-messenger.module.css')
  const inbox=read('components/app/messages-simple-inbox.jsx')
  assert.match(chat,/photoOnlyMessage=/)
  for(const marker of ['Voluntary photo attached for private review',
    'Client portrait photo, shared voluntarily for private review',
    'ME-GOAL-OBSTACLE drawing, shared voluntarily for private review'])
    assert.ok(chat.includes(marker),marker)
  assert.match(chat,/!m\.photo\|\|!photoOnlyMessage\.test\(String\(m\.text\|\|''\)\.trim\(\)\)/)
  assert.match(chat,/m\.photo&&selected\.channel==='telegram'&&<CrmTelegramPhoto/)
  assert.match(chat,/purpose=\{m\.photoPurpose==='drawing'\?'drawing':'portrait'\}/)
  assert.match(chat,/placeholder=\{conversationOnly\|\|compact\?/)
  assert.match(inbox,/function PrivateAvatar\(/)
  assert.match(inbox,/portrait=\{selected\.kind==='crm'/)
  assert.match(inbox,/conversationOnly onThreadsLoaded=\{onCrmThreads\}/)
  assert.match(css,/\.detailConversation \.compose textarea\{grid-column:1/)
  assert.match(css,/\.detailConversation \.compose>button\{grid-column:2/)
})
