import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {availableInboxHeight} from '../lib/app/mobile-inbox-height.mjs'

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('visual viewport sizing pins the input above iOS keyboard or cabinet navigation',()=>{
  // 375px iPhone, bottom navigation visible; window top is below page title.
  assert.equal(availableInboxHeight({visualBottom:738,windowTop:115,navigationTop:651,gutter:8}),528)
  // The keyboard shrinks the visual viewport: the bottom nav is hidden.
  assert.equal(availableInboxHeight({visualBottom:386,windowTop:115,gutter:8}),263)
  // Safari can offset the viewport while the page scrolls.
  assert.equal(availableInboxHeight({visualBottom:417,windowTop:136,gutter:8}),273)
  // 320px device with short keyboard viewport still allows a composer.
  assert.equal(availableInboxHeight({visualBottom:295,windowTop:145,gutter:8}),142)
  assert.equal(availableInboxHeight({visualBottom:176,windowTop:145,gutter:8}),112)
  assert.equal(availableInboxHeight({visualBottom:6000,windowTop:0}),1100)
  assert.equal(availableInboxHeight({visualBottom:undefined,windowTop:100}),null)
})

test('mobile Messages listens for visualViewport resize, scroll, and focus to resize the chat',()=>{
  const jsx=read('components/app/messages-simple-inbox.jsx')
  const css=read('components/app/messages-simple-inbox.module.css')
  const app=read('app/[locale]/app/messages/messages-page.css')
  assert.match(jsx,/window\.visualViewport/)
  assert.match(jsx,/visual\?\.addEventListener\('resize',requestUpdate\)/)
  assert.match(jsx,/visual\?\.addEventListener\('scroll',requestUpdate\)/)
  assert.match(jsx,/document\.addEventListener\('focusin',requestUpdate\)/)
  assert.match(jsx,/document\.addEventListener\('focusout',requestUpdate\)/)
  assert.match(jsx,/window\.addEventListener\('resize',requestUpdate\)/)
  assert.match(jsx,/availableInboxHeight\(\{/)
  assert.match(jsx,/inboxWindowRef/)
  assert.match(jsx,/ref=\{inboxWindowRef\}/)
  assert.match(css,/height:var\(--hh-mobile-window-height,calc\(100dvh - 152px\)\)/)
  assert.match(css,/min-height:0/)
  assert.match(app,/:has\(input:focus,textarea:focus\) \.hh-mobile-app-nav/)
  assert.match(app,/display:none!important/)
})

test('Telegram reply editor is the last row, input is 16px to prevent zoom, Send never leaves it',()=>{
  const css=read('components/app/crm-messenger.module.css')
  const jsx=read('components/app/crm-messenger.jsx')
  assert.match(css,/\.detailConversation \.messages\{flex:1 1 0%;min-height:0/)
  assert.match(css,/\.detailConversation \.compose\{[\s\S]*?margin-top:auto/)
  assert.match(css,/\.detailConversation \.compose textarea\{[\s\S]*?grid-column:1;grid-row:1/)
  assert.match(css,/font:400 16px\/1\.35 system-ui,sans-serif/)
  assert.match(css,/\.detailConversation \.compose>button:last-of-type\{[\s\S]*?grid-column:2;grid-row:1/)
  assert.match(css,/\.panel\[data-compact="true"\] \.compose textarea\{[\s\S]*?resize:none;font:400 16px/)
  assert.match(jsx,/\(conversationOnly\|\|compact\)&&status&&<p className=\{styles\.composeNotice\}/)
  assert.match(jsx,/!conversationOnly&&!compact&&status&&<p role="status"/)
  assert.match(jsx,/placeholder=\{conversationOnly\|\|compact\?\(lang==='ru'/)
  assert.match(jsx,/photoOnlyMessage\.test\(String\(m\.text\|\|''\)\.trim\(\)\)/)
  assert.match(jsx,/onClick=\{send\}/)
  assert.doesNotMatch(jsx,/sendOneMessengerMessage\(/)
})

test('on-site/private reply composers do not zoom or disappear either',()=>{
  const direct=read('components/app/direct-message-inbox.module.css')
  const practice=read('components/app/practice-request-conversation.module.css')
  assert.match(direct,/\.shell\[data-simple-detail="true"\] \.compose textarea\{font:400 16px/)
  assert.match(direct,/\.shell\[data-simple-detail="true"\] \.send\{min-height:44px/)
  assert.match(practice,/\.chat\[data-inline="true"\] \.compose textarea\{font:400 16px/)
})

test('selected client conversation is full screen and follows visualViewport when keyboard appears',()=>{
  const jsx=read('components/app/messages-simple-inbox.jsx')
  const css=read('components/app/messages-simple-inbox.module.css')
  const crm=read('components/app/crm-messenger.module.css')
  const app=read('app/[locale]/app/messages/messages-page.css')
  assert.match(jsx,/if\(openDetail\)\{/)
  assert.match(jsx,/Math\.floor\(visual\?\.height\|\|window\.innerHeight\)/)
  assert.match(jsx,/Math\.floor\(visual\?\.offsetTop\|\|0\)/)
  assert.match(jsx,/--hh-mobile-window-top/)
  assert.match(jsx,/windowElement\.dataset\.keyboardOpen=focused/)
  assert.match(css,/\.shell\[data-detail-open="true"\] \.window,[\s\S]*?position:fixed;z-index:4000/)
  assert.match(css,/top:var\(--hh-mobile-window-top,0px\)/)
  assert.match(css,/window\[data-keyboard-open="true"\] \.personBar/)
  assert.match(app,/data-simple-messages\]\[data-detail-open="true"\]\) \.hh-mobile-app-nav/)
  assert.match(crm,/\.detailConversation \.compose \.salesbotAssistSlot\{[\s\S]*?position:relative/)
  assert.match(crm,/\.detailConversation \.compose \.salesbotAssistSlot \[role="region"\]\{[\s\S]*?position:static/)
  assert.match(crm,/min-height:44px;height:44px/)
})

// The full request card must hide the pane rather than unmounting the private
// conversation and dropping a draft or uncertain in-flight operation.
test('request composer stays mounted behind client card and the hidden pane takes no space',()=>{
  const jsx=read('components/app/messages-simple-inbox.jsx')
  const css=read('components/app/messages-simple-inbox.module.css')
  assert.match(jsx,/selected\?\.kind==='request'&&<div className=\{styles\.requestPane\} hidden=\{showCard\}>/)
  assert.doesNotMatch(jsx,/!showCard&&selected\?\.kind==='request'&&<div/)
  assert.match(css,/\.requestPane\[hidden\]\{display:none!important\}/)
  assert.match(jsx,/key=\{selected\.id\} inline autoOpen/)
})

test('priority mobile chat PRs execute the isolated browser journey without sends',()=>{
  const workflow=read('.github/workflows/hh-messages-wellness-browser.yml')
  const browser=read('scripts/verify-messages-wellness-browser.mjs')
  const gate="if: ${{ github.event_name != 'pull_request' || contains(github.event.pull_request.labels.*.name, 'P0') }}"
  for(const name of ['Build production Next.js before browser tests','Install synthetic browser engines',
    'Actual iPhone-sized Orders / Clients / request conversations']){
    assert.equal(workflow.split('      - name: '+name+'\n')[1]?.split('\n')[0]?.trim(),gate,name)
  }
  assert.match(workflow,/ready_for_review/)
  assert.match(browser,/Loopback browser environment only/)
  assert.match(browser,/SYNTHETIC_READ_ONLY/)
  assert.match(browser,/route\.abort\(\)/)
  assert.match(browser,/accountRequest:true/)
  assert.match(browser,/\[320,354,390,430\]/)
  assert.match(browser,/\[chromium,webkit\]/)
})
