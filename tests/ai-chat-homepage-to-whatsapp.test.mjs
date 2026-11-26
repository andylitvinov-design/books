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
 assert.match(agent,/Start chat/)
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

test('blank initial CTA opens local dialogue; entered text still goes through existing consent path',()=>{
 const agent=read('components/holistic-agent-chat.tsx')
 assert.ok(agent.includes('if(showLandingComposer&&!draft.trim())'))
 assert.ok(agent.includes('text:messengerStarter[locale].welcome,localOnly:true'))
 assert.ok(agent.includes('sendSelectedTurn(draft)'))
 assert.ok(agent.includes('(!draft.trim()&&!showLandingComposer)'))
 assert.ok(agent.includes('(!showLandingComposer||Boolean(draft.trim()))'))
 assert.ok(agent.includes('data-hh-ai-gemini-consent'))
 assert.ok(agent.includes('data-hh-conversation-mic'))
})
test('AI Chat reuses the actual homepage photos, icon types and living persona',()=>{
 const home=read('components/home-dialogue-entry.tsx')
 const intro=read('components/app/messenger-ai-landing.tsx')
 const landCss=read('components/app/messenger-ai-landing.module.css')
 const chatCss=read('components/holistic-agent-chat.module.css')
 for(const art of ['stress.webp','love.webp','growth.webp','energy.webp']){
   assert.ok(home.includes(art),'homepage art '+art)
   assert.ok(intro.includes('/images/video-goal-art/'+art),'AI opening art '+art)
 }
 assert.ok(intro.includes('genieScene'),'approved first turn reuses existing genie scene')
 assert.ok(intro.includes('icon:TrendingUp'))
 assert.ok(intro.includes('icon:Leaf'))
 assert.ok(landCss.includes('23 Nov: approved homepage images'))
 assert.ok(chatCss.includes('23 Nov: wide editable input'))
})

test('Samir entry uses a full-height WhatsApp layout without duplicate site chrome',()=>{
 const landing=read('components/app/messenger-ai-landing.tsx')
 const landingCss=read('components/app/messenger-ai-landing.module.css')
 const pageCss=read('app/[locale]/app/messages/messages-page.css')
 const hubCss=read('components/app/messages-orders-clients.module.css')
 const hub=read('components/app/messages-orders-clients.jsx')
 const chat=read('components/holistic-agent-chat.tsx')
 const composerCss=read('components/holistic-agent-chat.module.css')
 assert.match(landing,/data-hh-genie-scene/)
 assert.match(landing,/className=\{css\.backToHome\}/)
 assert.match(landing,/hh:messenger-open-persona/)
 assert.match(hub,/addEventListener\('hh:messenger-open-persona'/)
 assert.match(pageCss,/body:has\(\.hh-messages-page \[data-hh-ai-landing\]\) \[data-hh-unified-dock\]/)
 assert.match(hubCss,/data-section="ai"\]:has\(\[data-hh-ai-landing\]\)/)
 assert.match(landingCss,/23 Nov: mobile chat screenshot fidelity/)
 assert.match(chat,/data-hh-ai-photo-shortcut/)
 assert.doesNotMatch(chat,/className=\{styles\.freeProSwitch\}/)
 assert.match(composerCss,/23 Nov full-screen Samir first turn/)
 for(const marker of ['data-hh-genie-goal-choice="discover"','data-hh-genie-goal-choice="defined"','data-hh-ai-inline-composer']){
   assert.ok(landing.includes(marker),marker)
 }
})

test('established Samir chat retains immersive design and no provider tier selector',()=>{
 const chat=read('components/holistic-agent-chat.tsx')
 const css=read('components/holistic-agent-chat.module.css')
 const page=read('app/[locale]/app/messages/messages-page.css')
 assert.match(chat,/data-hh-immersive-dialogue=/)
 assert.doesNotMatch(chat,/data-hh-ai-tier=/)
 assert.match(css,/font:550 19px\/1\.4/)
 assert.match(css,/\.thread>\.user\{background:#d9f0ce/)
 assert.match(page,/data-hh-immersive-dialogue="true"/)
 assert.match(chat,/data-hh-conversation-mic/)
 assert.match(chat,/data-hh-ai-photo-shortcut/)
})
