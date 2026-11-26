import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {verifiedGoogleEmailForReport,reportRecipientEmailMatches} from '../lib/app/report-google-identity.mjs'
const google={provider:'google',identity_data:{email:'client@example.invalid',email_verified:true,sub:'google-subject'}}
test('Google report claim requires verified provider email and subject',()=>{
  assert.equal(verifiedGoogleEmailForReport([google],'Client@example.invalid'),'client@example.invalid')
  assert.equal(verifiedGoogleEmailForReport([{...google,provider:'custom:telegram'}],'client@example.invalid'),null)
  assert.equal(verifiedGoogleEmailForReport([{...google,identity_data:{...google.identity_data,email_verified:false}}],'client@example.invalid'),null)
  assert.equal(verifiedGoogleEmailForReport([google],'other@example.invalid'),null)
  assert.equal(verifiedGoogleEmailForReport([google,google],'client@example.invalid'),null)
})
test('An owner-recorded address, not a name or first claimant, gates the initial claim',()=>{
  assert.equal(reportRecipientEmailMatches(' CLIENT@example.invalid ','client@example.invalid'),true)
  assert.equal(reportRecipientEmailMatches('', 'client@example.invalid'),false)
  assert.equal(reportRecipientEmailMatches('owner@example.invalid','client@example.invalid'),false)
})

test('invitation capability is removed before exchange, never returned as report content',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const gate=read('components/client-session-share-gate.jsx'),access=read('lib/clients/session-delivery-access.js')
 const clear=gate.indexOf('window.history.replaceState(window.history.state')
 assert.ok(clear>=0&&clear<gate.indexOf("fetch('/api/client-session-access'"))
 assert.doesNotMatch(gate,/localStorage|sessionStorage/)
 const invitation=access.slice(access.indexOf('export async function authorizeSessionInvitation'),access.indexOf('export async function authorizeSessionGuest'))
 assert.match(invitation,/return \{clientId:grant\.legacy_client_id,sessionId:grant\.session_id,grantId:grant\.id,grantVersion:grant\.access_version\}/)
 assert.doesNotMatch(invitation,/return \{session,/)
 assert.match(access,/export async function authorizeSessionGuest\(\) \{ fail\(\) \}/)
})
