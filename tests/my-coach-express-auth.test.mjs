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
 assert.match(greeting,/setReadyTopic\(action.id\);setPhase\('complete'\)/)
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
