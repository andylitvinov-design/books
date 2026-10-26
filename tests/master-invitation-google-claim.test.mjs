import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {masterInviteToken,masterInviteName,masterInviteLocale,masterInviteContinuation,MASTER_INVITE_PENDING_KEY} from '../lib/practitioners/master-invite-contract.mjs'
import {directMediaSpec} from '../lib/practitioners/direct-message-policy.mjs'

test('master invitation has 256 bits of URL-safe entropy and strict token length',()=>{
 const token=randomBytes(32).toString('base64url')
 assert.equal(token.length,43)
 assert.equal(masterInviteToken(token),true)
 for(const bad of [undefined,'','small',token+'.',token+'Z',token.slice(1),'../',token.replace(/./,'/')])
   assert.equal(masterInviteToken(bad),false)
})
test('only explicit locale and plausible names create private master records',()=>{
 assert.equal(masterInviteName('  Ana  Master  '),'Ana Master')
 for(const bad of ['', ' a ', 'a'.repeat(121),'\u0000master',null])
   assert.throws(()=>masterInviteName(bad))
 for(const locale of ['en','ru','es'])assert.equal(masterInviteLocale(locale),locale)
 for(const bad of ['de',undefined,''])assert.throws(()=>masterInviteLocale(bad))
})
test('Google continuation only resumes the matching same-tab invite for ten minutes',()=>{
 const token=randomBytes(32).toString('base64url'),now=1_900_000_000_000
 const value={token,locale:'ru',createdAt:now-1000}
 assert.equal(masterInviteContinuation(value,'ru',now),true)
 assert.equal(masterInviteContinuation(value,'en',now),false)
 assert.equal(masterInviteContinuation({...value,createdAt:now-600001},'ru',now),false)
 assert.equal(masterInviteContinuation({...value,createdAt:now+1},'ru',now),false)
 assert.equal(masterInviteContinuation({...value,token:'bad'},'ru',now),false)
 assert.equal(MASTER_INVITE_PENDING_KEY,'hh-master-invite-claim-v1')
})
test('private attachments allow PDFs but reject forged format and oversize',()=>{
 assert.deepEqual(directMediaSpec('application/pdf',512),{kind:'document',extension:'pdf',max:10_000_000})
 assert.throws(()=>directMediaSpec('application/pdf',10_000_001))
 assert.throws(()=>directMediaSpec('text/html',512))
 assert.deepEqual(directMediaSpec('audio/mpeg',1000),{kind:'audio',extension:'mp3',max:20_000_000})
})
test('migration enforces private RLS, owner invitation, draft-only claim and PDF bucket policy',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261026192106_hh_owner_master_invite_google_claim.sql',import.meta.url),'utf8')
 for(const fragment of ['force row level security','create policy master_invitation_read','create policy practitioner_owner_invite_insert','trusted_auth_user_id is null','create policy direct_threads_start','create policy direct_threads_read','application/pdf','deferrable initially deferred','owner_account_id=(select auth.uid())']){
   assert.ok(sql.includes(fragment),'missing security contract '+fragment)
 }
 assert.ok(!sql.includes('to anon,authenticated with check'))
})
test('Google OAuth never receives an invitation bearer token in redirect',()=>{
 const oauth=readFileSync(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8')
 const claim=readFileSync(new URL('../components/app/master-invite-claim.jsx',import.meta.url),'utf8')
 assert.ok(oauth.includes("'master-invite'"))
 assert.ok(oauth.includes('/masters/invite/continue'))
 assert.ok(claim.includes('sessionStorage.setItem(MASTER_INVITE_PENDING_KEY'))
 assert.ok(claim.includes("body:JSON.stringify({locale,continueTo:'master-invite'})"))
 assert.ok(claim.includes("body:JSON.stringify({action:'claim',token})"))
})
