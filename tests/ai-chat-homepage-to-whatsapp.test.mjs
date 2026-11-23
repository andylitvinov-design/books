import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('approved opening has one live composer and selected voice',()=>{
 const intro=read('components/app/messenger-ai-landing.tsx')
 const agent=read('components/holistic-agent-chat.tsx')
 for(const selector of ['data-hh-ai-chat-shortcuts','data-hh-ali-first-message','data-hh-ai-inline-composer',
  'data-hh-alchemist-topics','data-hh-ai-persona-voice-play'])
  assert.ok(intro.includes(selector),selector)
 for(const [id,path] of [
  ['ai','/app/messages?section=ai'],['page','/app/portrait'],
  ['orders','/app/messages?section=orders'],['clients','/app/messages?section=clients']
 ]) {
   assert.ok(intro.includes('data-hh-chat-shortcut="'+id+'"'),id)
   assert.ok(intro.includes(path),path)
 }
 for(const name of ['My page','My orders','My clients','"ИИ"','"IA"']) assert.ok(intro.includes(name),name)
 assert.doesNotMatch(intro,/data-hh-ai-audience|setAudience\(/)
 assert.match(intro,/TOPICS\.slice\(0,4\)/)
 assert.match(intro,/onTopicSelect\(topic\.prompt\)/)
 assert.match(intro,/playAliPersonaAudio\(persona\.id,locale/)
 assert.match(agent,/const showLandingComposer=compact&&messengerView&&!pageHelp&&!messages\.length&&!homeHandoffPreview&&!supportQuizOpen/)
 assert.match(agent,/composer=\{composer\}/)
 assert.match(agent,/\{!supportQuizOpen&&!showLandingComposer&&composer\}/)
 assert.match(agent,/data-has-messages=\{Boolean\(messages\.length>0\|\|homeHandoffPreview\)\|\|undefined\}/)
 assert.match(agent,/Start free chat/)
})
test('one user turn removes intro, retains a slim WhatsApp chat and real navigation',()=>{
 const agent=read('components/holistic-agent-chat.tsx')
 const header=read('components/app/messages-orders-clients.jsx')
 const chatCss=read('components/holistic-agent-chat.module.css')
 const navCss=read('components/app/messages-orders-clients.module.css')
 assert.match(agent,/compact&&messengerView&&!pageHelp&&!messages\.length&&!homeHandoffPreview&&<>/)
 assert.match(agent,/role="log" aria-live="polite"/)
 assert.match(agent,/data-hh-chat-turn=\{m\.role\}/)
 assert.match(chatCss,/\[data-has-messages="true"\]>\.thread/)
 assert.match(chatCss,/\[data-has-messages="true"\]>\.form/)
 assert.match(header,/data-hh-ai-chat-brand/)
 assert.match(header,/data-hh-ai-chat-menu/)
 assert.match(header,/data-chat-tabs-open=\{chatTabsOpen\|\|undefined\}/)
 assert.match(navCss,/\.sections\[data-chat-tabs-open="true"\]\{display:grid/)
 assert.match(agent,/data-hh-conversation-mic/)
})
