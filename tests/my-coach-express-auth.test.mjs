import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
test('every AI coach hero and card uses the same intentional guest-only Google gate',()=>{
 const catalog=read('components/my-coach-catalog.jsx'),gate=read('components/my-coach-express-start.jsx'),greeting=read('components/my-coach-greeting-gate.jsx')
 assert.match(catalog,/<MyCoachExpressStart locale=\{lang\} href=\{startHref\} embedded/)
 assert.match(catalog,/<MyCoachExpressStart locale=\{lang\} className=\{heroStyles.talkButton\}/)
 assert.match(catalog,/<MyCoachExpressStart locale=\{lang\} className=\{styles.cardButton\}/)
 assert.match(gate,/continuation:'my-coach-action',kind:'coach-link'/)
 assert.match(gate,/<ReikiJoinDialog mode="coach"/)
 assert.match(greeting,/if\(!accountSaving\)\{topicDialog.current\?\.close\(\);void gate.begin\(\{id\}\);return\}/)
 const authorization=greeting.slice(greeting.indexOf('onAuthorized:action=>{'),greeting.indexOf('useEffect(()=>()=>{audioRun.current++'))
 assert.match(authorization,/setReadyTopic\(action.id\)/)
 assert.doesNotMatch(authorization,/setPhase\(|onStart\?\.|chooseSession\(/)
 // OAuth restores the intended topic, not a fabricated completed presentation.
 // A fresh screen after redirect must play the greeting before starting.
 assert.match(greeting,/if\(phase!=='complete'\|\|entryPending\|\|chosen.current\|\|switching.current\|\|gate.busy\|\|courseRunId\)return/)
 assert.match(authorization,/if\(courseRunId\)return/)
 assert.match(authorization,/if\(clarityDay&&action.id!==clarityCourseId\(clarityDay\)\)return/)
 assert.match(greeting,/chooseSession\(clarityCourseId\(clarityDay\)\|\|readyTopic\|\|INTRODUCTORY_COACH_SESSION_ID\)/)
 assert.match(greeting,/onEnd:\(\)=>\{if\(audioRun.current===generation\).*audio\?\.ended.*setPhase\('complete'\)/)
 assert.equal((greeting.match(/setPhase\('complete'\)/g)||[]).length,1)
 assert.match(greeting,/url.searchParams.set\('greetingProgram',id\)/)
 assert.match(greeting,/window.history.replaceState\(window.history.state,'',url.pathname\+url.search\+url.hash\)/)
 assert.doesNotMatch(gate,/signInAnonymously|SUPABASE_SERVICE_ROLE_KEY|localStorage/)
})
test('coach auth reuses verified status and Google PKCE, and returns to the exact first-party source',()=>{
 const hook=read('components/use-google-page-action.js'),api=read('app/api/app/[...path]/route.js')
 assert.match(hook,/check='auth\/status'/)
 assert.match(hook,/failure\?\.status!==401\|\|resumed/)
 assert.match(hook,/provider:'google',returnPath/)
 assert.match(api,/joined === 'auth\/status' && method === 'GET'[\s\S]*?await auth\.verified\(\)/)
 assert.match(api,/safePageAuthReturnPath\(returnPath,continueTo,locale\)/)
 assert.match(api,/const destination = pageReturn \? origin\+pageReturn/)
 assert.match(api,/const account=await createAppRepository\(config\)\.ensureAccount\(actor\)/)
})

test('cancel and failure retain legacy guest routes and remove the new page resume marker',()=>{
 const api=read('app/api/app/[...path]/route.js')
 assert.match(api,/const failedPracticeDestination = continueTo === 'practice-preview'/)
 assert.equal((api.match(/if\(pageReturn\) url\.searchParams\.delete\('hh_resume'\)/g)||[]).length,2)
 assert.equal((api.match(/new URL\(failedPracticeDestination\)/g)||[]).length,2)
})
