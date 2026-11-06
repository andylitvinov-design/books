import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {ruleConversationReply} from '../lib/holistic-support/rule-conversation.mjs'
import {publicVideoGoalForMessage,VIDEO_GOALS} from '../lib/video-discovery/ranker.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('guest referrals use coarse editorial goals across all locales',()=>{
 for(const [message,goal] of [['Love','relationships'],['Любовь','relationships'],['Amor','relationships'],
   ['Спокойствие','stress'],['Energy','energy'],['10 minutes',null]]){
  assert.equal(publicVideoGoalForMessage(message),goal,message)
  if(goal)assert.ok(VIDEO_GOALS.includes(goal))
 }
 const discovery=source('components/video-discovery.tsx')
 assert.match(discovery,/VIDEO_GOALS\.includes\(requested\)/)
 const chat=source('components/holistic-agent-chat.tsx')
 assert.match(chat,/if\(compact&&!authenticated&&mode==="rules"\)/)
 assert.match(chat,/ruleConversationReply\(\{message:text,locale,history:prior\}\)/)
 assert.match(chat,/href=\{"\/"\+locale\+"\/mytube\?goal="\+videoGoal\}/)
 assert.doesNotMatch(chat,/mytube\?goal="\+text/)
})
test('generation displays a real Google button; the private reply API stays protected',()=>{
 const chat=source('components/holistic-agent-chat.tsx')
 const login=source('components/app/messenger-sign-in.jsx')
 const auth=source('app/api/app/[...path]/route.js')
 const secure=source('app/api/holistic-agent/turn/route.js')
 const hub=source('components/app/messages-orders-clients.jsx')
 for(const label of ['data-hh-guest-ready-videos','data-hh-personal-video-request',
   'data-hh-video-sign-in','setShowVideoSignIn(true)','continueTo="video-studio"'])
  assert.ok(chat.includes(label),label)
 assert.ok(!chat.includes('{compact&&settings}'))
 assert.ok(!chat.includes('className={styles.compactDisclosure}'))
 assert.match(login,/data-hh-messenger-google-login/)
 assert.match(login,/fetch\('\/api\/app\/auth\/start'/)
 assert.match(auth,/continueTo === 'video-studio'/)
 assert.match(auth,/\$\{origin\}\/\$\{locale\}\/holistic-support\/mandala/)
 assert.match(secure,/await auth\.verified\(\)/)
 assert.match(hub,/authenticated=\{Boolean\(ordersData\?\.accountId\)\}/)
})
test('reviewed guest meditation dialogue handles Love, Любовь and Amor safely',()=>{
 for(const [locale,start,follow] of [['en','I want to find a meditation','Love'],
  ['ru','Хочу подобрать медитацию','Любовь'],['es','Quiero meditación','Amor']]){
  const response=ruleConversationReply({message:follow,locale,history:[{role:'user',text:start}]})
  assert.ok(response?.reply?.length>12,locale)
  assert.equal(publicVideoGoalForMessage(follow),'relationships')
 }
 assert.equal(ruleConversationReply({message:'I want to die',locale:'en'}),null)
})
