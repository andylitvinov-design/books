import test from 'node:test';
import assert from 'node:assert/strict';
import {toPublishedProfessionalSource} from '../lib/mandala/professional-public-source.mjs';
const fixture={service:{
  id:'source_22',practitionerId:'master_12',slug:'first-meeting',status:'published',active:true,
  displayLocales:['ru','en','es'],
  copy:{title:'Первая встреча',shortDescription:'Онлайн, 30 минут'},
  draftCopy:{title:'SECRET NEW PRICE'},clientNote:'PRIVATE CLIENT INFORMATION'},
  practitioner:{id:'master_12',slug:'master-example',
    profile:{displayName:'Автор практики',professionalTitle:'Registered Psychotherapist',
      privateAddress:'PRIVATE-ADDRESS'},
    credentials:[{title:'Registered Psychotherapist',public:true,verificationStatus:'verified',expiresOn:null}]}
};
test('maps only published user-facing offering data and verified public title',()=>{
 const r=toPublishedProfessionalSource(fixture,'ru');
 assert.equal(r.publicOffer.href,'/ru/services/master-example/first-meeting');
 assert.equal(r.publicOffer.title,'Первая встреча');
 assert.equal(r.publicPractitioner.credentialVerified,true);
 const serialized=JSON.stringify(r);
 assert.ok(!serialized.includes('SECRET NEW PRICE'));
 assert.ok(!serialized.includes('PRIVATE CLIENT INFORMATION'));
 assert.ok(!serialized.includes('PRIVATE-ADDRESS'));
});
test('rejects draft, inactive, mixed-owner and invalid slug offers',()=>{
 for(const change of [{status:'submitted'},{status:'draft'},{active:false},{practitionerId:'different'},{slug:'https://evil.example'}]){
  assert.throws(()=>toPublishedProfessionalSource({...fixture,service:{...fixture.service,...change}},'en'));
 }
});
test('unverified, expired or unrelated credential never provides verified title',()=>{
 const r=toPublishedProfessionalSource({...fixture,practitioner:{...fixture.practitioner,
  credentials:[{title:'Other Title',public:true,verificationStatus:'verified'}]}},'ru');
 assert.equal(r.publicPractitioner.credentialVerified,false);
 const expired=toPublishedProfessionalSource({...fixture,practitioner:{...fixture.practitioner,
  credentials:[{title:'Registered Psychotherapist',public:true,verificationStatus:'verified',expiresOn:'2020-01-01'}]}},'ru');
 assert.equal(expired.publicPractitioner.credentialVerified,false);
});
test('unpublished ES and missing localized title fail closed',()=>{
 assert.throws(()=>toPublishedProfessionalSource({...fixture,service:{...fixture.service,displayLocales:['ru','en']}},'es'),/unpublished_translation/);
 assert.throws(()=>toPublishedProfessionalSource({...fixture,service:{...fixture.service,copy:{title:''}}},'en'),/published_title_required/);
});
