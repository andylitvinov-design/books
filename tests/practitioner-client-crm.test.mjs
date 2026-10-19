import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {groupVerifiedPractitionerClients} from '../lib/practitioners/client-profile-groups.js'
import {validateMessageText} from '../lib/crm/messenger-policy.js'
const root=new URL('..',import.meta.url)
const src=p=>readFileSync(new URL(p,root),'utf8')
const now='2026-10-19T10:00:00Z'
const request=(id,key,contact,status='requested')=>({id,clientKey:key,contact,status,createdAt:now})
test('master clients are grouped by VERIFIED account HMAC, never by matching typed names',()=>{
  const key='a'.repeat(64),another='b'.repeat(64)
  const groups=groupVerifiedPractitionerClients([
    request('one',key,{displayName:'Same Person',email:'a@example.org'}),
    request('two',key,{displayName:'Updated Person',email:'different@example.org'},'contacted'),
    request('three',another,{displayName:'Same Person',email:'a@example.org'}),
  ],'en')
  assert.equal(groups.length,2)
  assert.equal(groups.find(group=>group.key===key).items.length,2)
  assert.equal(groups.find(group=>group.key===another).items.length,1)
})
test('missing verified account key never merges contacts that share email or display name',()=>{
  const result=groupVerifiedPractitionerClients([
    request('request-a','bad',{displayName:'Anna',email:'same@test.invalid'}),
    request('request-b','bad',{displayName:'Anna',email:'same@test.invalid'}),
  ])
  assert.equal(result.length,2)
  assert.ok(result.every(x=>x.key.startsWith('request:')))
})
test('master client summary shows real requests and actionable statuses',()=>{
  const key='c'.repeat(64)
  const result=groupVerifiedPractitionerClients([
    request('r1',key,'Client contact','requested'),
    request('r2',key,'Client contact','closed'),
    request('r3',key,'Client contact','contacted'),
  ])
  assert.equal(result.length,1)
  assert.equal(result[0].open,2)
  assert.equal(result[0].items.length,3)
  assert.equal(result[0].name,'Client contact')
})
test('master client grouping handles unexpected contact types without disclosing data',()=>{
  assert.equal(groupVerifiedPractitionerClients(null).length,0)
  const g=groupVerifiedPractitionerClients([request('first','?',{phone:'+14165550100',displayName:'A'})],'ru')
  assert.equal(g[0].name,'A')
  assert.match(g[0].contact,/1416/)
})
test('new participant message table requires FORCE RLS and denies direct public/API privileges',()=>{
  const sql=src('supabase/migrations/20261019115500_hh_practitioner_request_messages_20261019.sql')
  assert.match(sql,/ALTER TABLE app\.practitioner_request_messages FORCE ROW LEVEL SECURITY/)
  assert.match(sql,/REVOKE ALL ON app\.practitioner_request_messages FROM PUBLIC,anon,authenticated/)
  assert.match(sql,/GRANT SELECT,INSERT ON app\.practitioner_request_messages TO hh_app_backend/)
  assert.doesNotMatch(sql,/TO authenticated.*USING\s*\(true\)/)
  assert.doesNotMatch(sql,/SECURITY DEFINER/i)
  assert.match(sql,/ON DELETE CASCADE/)
  assert.match(sql,/FOR INSERT TO hh_app_backend/)
  assert.match(sql,/WITH CHECK/)
})
test('only requester or exactly assigned active practitioner can see participant replies',()=>{
  const sql=src('supabase/migrations/20261019115500_hh_practitioner_request_messages_20261019.sql')
  assert.match(sql,/r\.account_id=\(SELECT auth\.uid\(\)\)/)
  assert.match(sql,/p\.trusted_auth_user_id=\(SELECT auth\.uid\(\)\)/)
  assert.match(sql,/p\.id=r\.recipient_practitioner_id/)
  assert.match(sql,/p\.active AND p\.status IN/)
  assert.match(sql,/app_private\.account_active\(\)/)
  assert.match(sql,/practitioner_request_messages\.visibility='participants'/)
})
test('master-only notes remain invisible to client even when they belong to the same request',()=>{
  const sql=src('supabase/migrations/20261019115500_hh_practitioner_request_messages_20261019.sql')
  assert.match(sql,/visibility IN\('participants','practitioner_note'\)/)
  assert.match(sql,/visibility='practitioner_note'/)
  assert.match(sql,/author_role='practitioner'/)
  assert.match(sql,/practitioner_request_messages\.visibility='participants'\s+AND r\.account_id/)
  assert.doesNotMatch(sql,/GRANT UPDATE/)
  assert.doesNotMatch(sql,/GRANT DELETE/)
})
test('message send uses real server session, exact request participant and immutable idempotency',()=>{
  const server=src('lib/practitioners/client-messages.js')
  const route=src('app/api/app/practitioner-client-messages/route.js')
  assert.match(server,/transaction\(config,actor,async db=>/)
  assert.match(server,/requestId\)/)
  assert.match(server,/r\.account_id/)
  assert.match(server,/p\.trusted_auth_user_id/)
  assert.match(server,/const scope=await participant\(db,actor,input\.requestId,\{lock:true\}\)/)
  assert.match(server,/old!==text/)
  assert.match(server,/original\.visibility!==visibility/)
  assert.match(server,/openSealed\(row\.body_ciphertext,bodyContext/)
  assert.match(server,/seal\(\{text\},bodyContext/)
  assert.match(server,/PRACTICE_MESSAGE_DAILY_LIMIT/)
  assert.doesNotMatch(server,/sendOneMessengerMessage|Telegram|WhatsApp|service_role/i)
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/auth\.verified\(\)/)
  assert.match(route,/x-hh-account-id/)
  assert.match(route,/onlyKeys\(body,\['requestId','operationId','text','visibility'\]\)/)
})
test('only active participant correspondence, not closed requests, may create shared replies',()=>{
  const sql=src('supabase/migrations/20261019115500_hh_practitioner_request_messages_20261019.sql')
  assert.match(sql,/r\.status IN \('requested','contacted'\)/)
  const store=src('lib/practitioners/client-messages.js')
  assert.match(store,/if\(visibility==='participants'&&!scope\.canReply\)/)
  assert.match(store,/CONVERSATION_CLOSED/)
})
test('requester and master UI expose private replies without opening other cabinet records',()=>{
  const master=src('components/app/practice-workspace.jsx')
  const cabinet=src('components/app/app-workspace.jsx')
  const profile=src('components/app/practitioner-client-profiles.jsx')
  const chat=src('components/app/practice-request-conversation.jsx')
  assert.match(master,/<PractitionerClientProfiles items=\{requests\}/)
  assert.match(master,/onStatus=\{\(item,status\)=>act/)
  assert.match(cabinet,/<PracticeRequestConversation key=\{request\.id\}/)
  assert.match(profile,/groupVerifiedPractitionerClients/)
  assert.match(chat,/aria-expanded=\{open\}/)
  assert.match(chat,/\/api\/app\/practitioner-client-messages/)
  assert.match(chat,/visibility==='practitioner_note'/)
  assert.match(chat,/no Telegram, WhatsApp or email delivery is implied/)
  assert.doesNotMatch(profile,/data\.results|savedReports|savedSessions|clinicalRecord/)
})
test('sensitive private report links and clinical details are rejected by shared message policy',()=>{
  assert.throws(()=>validateMessageText('Your prescription is ready'))
  assert.throws(()=>validateMessageText('https://holistichouse.vercel.app/en/client/a#private-session-token-123456789'))
  assert.equal(validateMessageText('Please confirm a suitable appointment day.'),'Please confirm a suitable appointment day.')
})
