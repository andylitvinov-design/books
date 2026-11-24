import {test} from 'node:test'
import assert from 'node:assert/strict'
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
