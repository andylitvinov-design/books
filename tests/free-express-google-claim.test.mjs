import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  EXPRESS_GOOGLE_CLAIM_PENDING_KEY,EXPRESS_GOOGLE_CLAIM_MAX_AGE_MS,
  validExpressGoogleClaimIntent,
} from '../lib/practitioners/free-express-google-claim.mjs'
import {
  createFreeExpressToken,verifyFreeExpressToken,isFreeExpressRequest,FREE_EXPRESS_SERVICE,
} from '../lib/practitioners/free-express-continuation.mjs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const at=Date.parse('2026-10-26T17:20:00.000Z')
const intent={referenceCode:'HH-ABCDEF123456',locale:'ru',path:'/ru/services/free-situation-review',createdAt:at-5000}

test('a same-tab Google intent is scoped to one locale/path/receipt, expires in ten minutes',()=>{
  assert.equal(EXPRESS_GOOGLE_CLAIM_PENDING_KEY,'hh-free-express-google-claim-v1')
  assert.equal(validExpressGoogleClaimIntent(intent,'ru',intent.path,at),true)
  for(const value of [
    {...intent,referenceCode:'HH-SECRET'},
    {...intent,locale:'en'},
    {...intent,path:'/ru/app/profile'},
    {...intent,createdAt:at+1000},
    {...intent,createdAt:at-EXPRESS_GOOGLE_CLAIM_MAX_AGE_MS},
    {...intent,createdAt:'yesterday'},
    null,{},
  ])assert.equal(validExpressGoogleClaimIntent(value,'ru',intent.path,at),false)
  assert.equal(validExpressGoogleClaimIntent(intent,'en','/en/services/free-situation-review',at),false)
})

test('only consented first-party free review requests qualify for the HMAC continuation cookie',()=>{
  for(const locale of ['en','ru','es']){
    const valid={locale,sourcePath:'/'+locale+'/services/free-situation-review',
      serviceTitle:FREE_EXPRESS_SERVICE[locale],contactConsent:true,
      contact:{phone:'+14165551234'}}
    assert.equal(isFreeExpressRequest(valid),true)
    assert.equal(isFreeExpressRequest({...valid,contactConsent:false}),false)
    assert.equal(isFreeExpressRequest({...valid,sourcePath:'/'+locale+'/app/profile'}),false)
    assert.equal(isFreeExpressRequest({...valid,serviceTitle:'Other service'}),false)
  }
})

test('enquiry number is never authorization; expiry and invalid HMAC are denied',()=>{
  const config={encryptionKey:'local-test-only-secret-key-not-production'}
  const id='287fe98a-1780-4b9a-83cb-ff83925f45c8'
  const operationId='927fe98a-1780-4b9a-83cb-ff83925f45c8'
  const token=createFreeExpressToken({id,operationId,createdAt:at},config)
  assert.equal(verifyFreeExpressToken(token,config,at+20000)?.id,id)
  assert.equal(verifyFreeExpressToken(token,config,at+3600_000+1000),null)
  assert.equal(verifyFreeExpressToken(intent.referenceCode,config,at),null)
  assert.equal(verifyFreeExpressToken(token,{encryptionKey:'wrong-test-key'},at),null)
})

test('public form saves one lead then offers an explicit verified account claim without enabling v2 media',()=>{
  const intake=read('app/api/service-enquiries/route.js')
  const claim=read('app/api/free-express/claim/route.js')
  const oldForm=read('components/contact-channel-chooser.tsx')
  const publicForm=read('components/personal-express-enquiry.tsx')
  const ui=read('components/free-express-google-claim.tsx')
  const lockedWizard=read('app/api/free-express/route.js')
  const lockedMedia=read('app/api/free-express/media/route.js')
  assert.match(intake,/result\.saved === true && isFreeExpressRequest\(payload\)/)
  assert.match(intake,/httpOnly: true, secure: !config\.test, sameSite: 'strict'/)
  assert.match(claim,/createRequestAuth\(request, config\)/)
  assert.match(claim,/freeExpressProof\(request, config\)/)
  assert.match(claim,/input\.consent !== true/)
  assert.match(claim,/on conflict \(enquiry_id\) do nothing/)
  assert.doesNotMatch(claim,/HH_FREE_EXPRESS_V2_ENABLED/)
  assert.match(publicForm,/allowSecureExpressClaim/)
  assert.match(oldForm,/FreeExpressGoogleClaim/)
  assert.match(ui,/data-express-save-to-google/)
  assert.match(ui,/continueTo:"enquiry",returnPath:pathname/)
  assert.match(ui,/body:JSON\.stringify\(\{consent:true,referenceCode:ref\}\)/)
  assert.match(lockedWizard,/HH_FREE_EXPRESS_V2_ENABLED/)
  assert.match(lockedMedia,/HH_FREE_EXPRESS_V2_ENABLED/)
})
