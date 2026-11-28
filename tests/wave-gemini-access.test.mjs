import test from 'node:test';
import assert from 'node:assert/strict';
import {accessStatus,accessRequestPatch,requestKey,eligibilityKey} from '../lib/holistic-support/wave-gemini-access.mjs';
const req={action:'request',adultDeclared:true,regionDeclared:true,publicConsent:true};
test('request is pending, never verified and rejects injected authorization',()=>{
 const p=accessRequestPatch(req,100);
 assert.equal(accessStatus(p,101),'pending');
 assert.equal(p[eligibilityKey],undefined);
 for(const body of [{...req,adultVerified:true},{...req,accountId:'other'},{...req,publicConsent:false},{action:'grant'},null])assert.equal(accessRequestPatch(body),null);
});
test('revocation cancels both request and current grant; expires fail closed',()=>{
 const active={[eligibilityKey]:{version:1,adultVerified:true,eligibleRegionVerified:true,publicGeminiConsent:true,expiresAtMs:200}};
 assert.equal(accessStatus(active,100),'eligible');
 assert.equal(accessStatus(active,200),'not_enabled');
 const revoked=accessRequestPatch({action:'revoke'},100);
 assert.equal(accessStatus({...active,...revoked},101),'not_enabled');
 assert.equal(revoked[requestKey].status,'revoked');
 assert.equal(revoked[eligibilityKey].publicGeminiConsent,false);
});
