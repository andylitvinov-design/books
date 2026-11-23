import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('all-request analytics requires authenticated first-party owner and existing RLS',()=>{
 const route=read('app/api/app/crm/enquiry-analytics/route.js')
 assert.match(route,/requestOrigin\(request,config\)/)
 assert.match(route,/actor=await auth\.verified\(\)/)
 assert.match(route,/practitionerEmailAllowed\(actor\)/)
 assert.match(route,/request\.headers\.get\('x-hh-account-id'\)!==actor\.id/)
 assert.match(route,/transaction\(config,actor,async db=>/)
 assert.match(route,/p\.trusted_auth_user_id=\$1 and p\.active/)
 assert.match(route,/p\.status in \('approved','submitted','changes_requested'\)/)
 assert.match(route,/PRIVATE_HEADERS/)
 assert.doesNotMatch(route,/createCrmRepository|createClient|service_role|supabase\.auth\.admin/)
})

test('rolling 1/7/30 day reports count only stored data and never fabricate replies',()=>{
 const route=read('app/api/app/crm/enquiry-analytics/route.js')
 assert.match(route,/day:1,week:7,month:30/)
 assert.match(route,/make_interval\(days=>\$2::int\)/)
 assert.match(route,/firstResponseMinutes:null/)
 assert.match(route,/scope:'all_authorized_public_service_enquiries'/)
 assert.match(route,/bySource:aggregate\(sources\.rows\)/)
 assert.match(route,/byService:aggregate\(services\.rows\)/)
 assert.match(route,/byPage:aggregate\(pages\.rows\)/)
 assert.match(route,/e\.status='requested'/)
 assert.match(route,/e\.attribution->>'trafficSource'/)
 assert.match(route,/telegram_thread_id is not null/)
 // Personal encrypted messages and contacts never leave this aggregate.
 assert.doesNotMatch(route,/select\s+(?:\*|e\.\*)|description_ciphertext\s+as|contact_ciphertext\s+as|provider_message_id|email_hash|phone_hash/i)
})

test('inbox fetches the full real CRM stats only on explicit expansion with loaded fallback',()=>{
 const view=read('components/app/messages-lead-metrics.jsx')
 const inbox=read('components/app/messages-simple-inbox.jsx')
 assert.match(view,/onToggle=\{event=>setOpened\(event\.currentTarget\.open\)\}/)
 assert.match(view,/if\(!opened\|\|!accountId\)return/)
 assert.match(view,/\/api\/app\/crm\/enquiry-analytics\?period=/)
 assert.match(view,/X-HH-Account-Id/)
 assert.match(view,/AbortController/)
 assert.match(view,/setError\(true\)/)
 assert.match(view,/exact\?t\.caveatAll:t\.caveat/)
 assert.match(inbox,/MessagesLeadMetrics locale=\{locale\} accountId=\{accountId\}/)
 assert.doesNotMatch(view,/setInterval|sendBeacon|analytics\.track|gtag\(|dataLayer\.push/)
})
