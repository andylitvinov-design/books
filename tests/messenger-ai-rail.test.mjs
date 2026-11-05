import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('Messenger retains real AI, Orders and Clients and the protected agent API',()=>{
 const hub=read('components/app/messages-orders-clients.jsx')
 const agent=read('components/holistic-agent-chat.tsx')
 const workspace=read('components/app/messenger-ai-workspace.jsx')
 for(const section of ['ai','orders','clients'])
  assert.match(hub,new RegExp('id="hh-'+section+'-panel"'))
 assert.match(hub,/onClick=\{\(\)=>chooseSection\('ai'\)\}/)
 assert.match(workspace,/HolisticAgentChat locale=\{locale\} compact\/>/)
 assert.match(agent,/fetch\("\/api\/holistic-agent\/turn"/)
 assert.match(agent,/ownedInferenceConsent:mode==="owned"&&agree/)
 assert.doesNotMatch(workspace,/fetch\(/)
 assert.doesNotMatch(workspace,/data-hh-unified-dock/)
})

test('two large conversation starters replace the five-card rail; no fake rendered media',()=>{
 const agent=read('components/holistic-agent-chat.tsx')
 const css=read('components/holistic-agent-chat.module.css')
 const workspace=read('components/app/messenger-ai-workspace.jsx')
 for(const id of ['video','meditation'])assert.ok(agent.includes('data-hh-ai-start="'+id+'"'))
 assert.ok(agent.includes('setFormat(kind==="video"?"video":"audio")'))
 assert.ok(agent.includes('setMessages(prev=>[...prev'))
 assert.ok(agent.includes('setEntryOpen(true)'))
 assert.match(css,/startActions button/)
 assert.doesNotMatch(workspace,/data-chat-menu-rail|eight-practice|video-director-chat/)
 assert.ok(agent.includes('{!compact&&<details className={styles.programPanel}'))
})

test('response, safety and keyboard controls remain inside the transcript',()=>{
 const dock=read('lib/unified-mobile-dock.mjs')
 const agent=read('components/holistic-agent-chat.tsx')
 const css=read('app/unified-mobile-dock.css')
 assert.match(dock,/case "ai": return prefix\+"\/app\/messages\?section=ai"/)
 for(const word of ['{compact&&settings}','messages.map','role="alert"','className={styles.choices}'])
  assert.ok(agent.includes(word),word)
 assert.ok(css.includes('data-chat-editing="true"'))
 assert.match(agent,/followTail.current=true;setNewBelow\(false\)/)
})
