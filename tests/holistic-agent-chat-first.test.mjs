import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {explainUserQuestion} from '../lib/holistic-support/guide-dialogue.mjs'
import {prepareNaturalDialogue,finishNaturalDialogue} from '../lib/holistic-support/natural-dialogue.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('authenticated no-model chat stays available with experimental inference disabled',()=>{
 const route=source('app/api/holistic-agent/turn/route.js')
 assert.ok(route.includes('await auth.verified()'))
 assert.ok(route.includes('requireSameOrigin(request,config)'))
 assert.ok(route.includes('if(body.mode!=="rules"&&!experimentalEnabled)'))
 assert.ok(route.includes('process.env.HH_AGENT_PRODUCTION_APPROVED'))
 assert.ok(route.includes('ownedInferenceConsent'))
 const auth=route.indexOf('await auth.verified()')
 const parse=route.indexOf('const body = inputOf(await readBody')
 const gated=route.indexOf('if(body.mode!=="rules"&&!experimentalEnabled)')
 assert.ok(auth>=0&&parse>auth&&gated>parse,'only authenticated validated requests reach the rules endpoint')
})

test('reviewed question responses answer user identity/process/pricing in RU EN ES',async()=>{
 for(const [locale,question] of [['en','Are you human?'],['ru','Ты человек?'],['es','¿Eres humano?']]){
  const reply=explainUserQuestion(question,locale,{status:'clarify'})
  assert.ok(typeof reply==='string'&&reply.length>30,locale)
  const prepared=prepareNaturalDialogue({locale,message:question,decision:{status:'clarify',message:reply}})
  const result=await finishNaturalDialogue(prepared)
  assert.equal(result.text,reply)
  assert.equal(result.modelUsed,false)
 }
 const price=explainUserQuestion('How much does it cost?','en',{status:'no_match'})
 assert.ok(price&&price.includes('price'))
 assert.equal(explainUserQuestion('Are you human?','en',{status:'safety_handoff'}),null)
})

test('the mobile transcript contains sent messages, inline errors, settings and approved suggestions',()=>{
 const agent=source('components/holistic-agent-chat.tsx')
 const start=agent.indexOf('ref={threadRef}')
 const end=agent.indexOf('    </div>\n    {newBelow',start)
 assert.ok(start>0&&end>start,'chat scroll log bounds found')
 const log=agent.slice(start,end)
 for(const text of ['messages.map','className={styles.choices}','role="alert"','data-hh-public-video-choices','data-hh-video-chat-options','data-hh-video-open-studio'])
  assert.ok(log.includes(text),text)
 assert.ok(agent.includes('followTail.current=true;setNewBelow(false)'))
 assert.ok(agent.includes('response.status===401'))
 assert.ok(agent.includes('response.status===503'))
 assert.ok(agent.includes('{!compact&&settings}'))
 assert.ok(!agent.includes('{compact&&settings}'))
 assert.ok(!agent.includes('className={styles.compactDisclosure}'))
 assert.ok(log.includes('data-hh-video-chat-choice'))
 assert.ok(agent.includes('{!compact&&<details className={styles.programPanel}'))
 const workspace=source('components/app/messenger-ai-workspace.jsx')
 assert.doesNotMatch(workspace,/css\.(prepared|footer)/)
 assert.ok(workspace.includes('<HolisticAgentChat locale={locale} compact messengerView'))
 assert.ok(agent.includes('data-hh-ai-welcome'))
 assert.ok(agent.includes('data-hh-ai-start="video"'))
 assert.ok(agent.includes('data-hh-ai-start="meditation"'))
 assert.ok(agent.includes('data-hh-ai-start="hint"'))
 assert.ok(agent.includes('data-hh-ai-start="master"'))
 assert.ok(agent.includes('data-hh-ai-tests-link'))
 assert.ok(agent.includes('isCasualGreeting(text)'))
})

test('RU EN ES greetings answer without a paid model; focused iPhone editor fills visible viewport',()=>{
 for(const [locale,message] of [['ru','Привет Ау'],['ru','Ау'],['en','Hello'],['es','Hola']]){
  const reply=explainUserQuestion(message,locale,{status:'clarify'})
  assert.ok(reply&&reply.length>20,locale+': '+message)
 }
 const hub=source('components/app/messages-orders-clients.jsx')
 const navCss=source('app/unified-mobile-dock.css')
 assert.ok(hub.includes('const limit=keyboard?bottom:Math.min(bottom'))
 assert.ok(navCss.includes('data-keyboard-open="true"'))
 const css=source('components/holistic-agent-chat.module.css')
 assert.ok(css.includes('.startActions button'))
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'))
 for(const label of ['Получить ИИ-подсказку','Получить личную блиц-диагностику','Get an AI suggestion','Solicitar revisión exprés personal'])
  assert.ok(source('components/holistic-agent-chat.tsx').includes(label),label)
})


test('iPhone Messenger scrolls complete assistant answers above the keyboard',()=>{
 const agent=source('components/holistic-agent-chat.tsx')
 const css=source('components/holistic-agent-chat.module.css')
 const start=agent.indexOf('const revealLatest=()=>{')
 const end=agent.indexOf('  },[messages.length',start)
 assert.ok(start>=0&&end>start)
 const scroll=agent.slice(start,end)
 assert.match(scroll,/const target=Math\.max\(0,thread\.scrollHeight-thread\.clientHeight\)/)
 assert.doesNotMatch(scroll,/querySelectorAll<HTMLElement>/)
 assert.match(agent,/if\(!compact\|\|!messengerView\|\|messages\.length===0\)return/)
 assert.match(agent,/new ResizeObserver\(revealVisibleReply\)/)
 assert.match(agent,/viewport\?\.addEventListener\("resize",revealVisibleReply\)/)
 assert.match(agent,/viewport\?\.addEventListener\("scroll",revealVisibleReply\)/)
 assert.match(agent,/if\(!followTail\.current\)return/,'resizing cannot interrupt manual history reading')
 assert.match(css,/\.root\[data-compact\]\[data-chat-skin="messenger"\]>\.thread>\*\{\s*flex-shrink:0/)
 assert.match(agent,/const atBottom=el\.scrollHeight-el\.scrollTop-el\.clientHeight<64/)
})
