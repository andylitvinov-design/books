import {removeAnonymousPortraitAdditions} from './helpers/anonymous-portrait-source-normalization.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {attachPublicApiReadDiagnostics, publicApiReadDiagnostic} from '../scripts/helpers/public-api-read-diagnostics.mjs';
const origin='http://127.0.0.1:3100';
const info={url:origin+'/api/app/bootstrap',method:'GET',resourceType:'fetch',navigation:false,status:503,frameUrl:origin+'/en/academy'};

test('known exact API aliases preserve actual denial/configuration statuses and fixed frame context',()=>{
 for(const status of [200,401,403,503])for(const [suffix,apiKind] of [['/api/app/bootstrap','account-bootstrap'],['/api/app/bootstrap?view=portrait','portrait-bootstrap'],['/api/app/auth/contact-profile','contact-profile']]) {
  assert.deepEqual(publicApiReadDiagnostic({...info,url:origin+suffix,status},origin),{apiKind,framePageAtResponse:'academy',status,method:'GET',resourceType:'fetch',navigation:false});
 }
 for(const locale of ['en','ru','es'])for(const [path,alias] of [['/academy','academy'],['/services','services'],['/services/business-consulting','business'],['/services/free-situation-review','free-review'],['/services/free-consultation','free-diagnosis']])assert.equal(publicApiReadDiagnostic({...info,frameUrl:origin+'/'+locale+path},origin).framePageAtResponse,alias);
 for(const path of ['/','/en','/es'])assert.equal(publicApiReadDiagnostic({...info,frameUrl:origin+path},origin).framePageAtResponse,'public-home');
});
test('arbitrary query, credentials, private routes and noncanonical URLs never become known aliases or output text',()=>{
 for(const suffix of ['/api/app/bootstrap?token=SYNTHETIC_PRIVATE','/api/app/bootstrap?view=portrait&token=SYNTHETIC_PRIVATE','/api/app/bootstrap?view=portrait&view=portrait','/api/app/bootstrap?','/api/app/bootstrap#SYNTHETIC_PRIVATE','/api/private/SYNTHETIC_PRIVATE']) {
  const result=publicApiReadDiagnostic({...info,url:origin+suffix},origin);assert.equal(result.apiKind,'unclassified');assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC_PRIVATE|token=|\/api\/|3100/);
 }
 assert.equal(publicApiReadDiagnostic({...info,url:'http://SYNTHETIC_PRIVATE@127.0.0.1:3100/api/app/bootstrap'},origin).apiKind,'unclassified');
 for(const url of ['https://example.test/api/app/bootstrap',origin+'/images/test.png','invalid',' '+info.url])assert.equal(publicApiReadDiagnostic({...info,url},origin),null);
 assert.equal(publicApiReadDiagnostic(info,'https://holistichouse.vercel.app'),null);
 for(const frameUrl of [origin+'/en/academy?token=SYNTHETIC_PRIVATE',origin+'/en/app/portrait','https://example.test/en/academy','invalid','']) {
  const result=publicApiReadDiagnostic({...info,frameUrl},origin);assert.equal(result.framePageAtResponse,'unclassified');assert.equal(result.status,503);
 }
 const result=publicApiReadDiagnostic({...info,status:'PRIVATE',method:'PRIVATE',resourceType:'PRIVATE'},origin);
 assert.equal(result.status,'unclassified');assert.equal(result.method,'OTHER');assert.equal(result.resourceType,'unclassified');assert.doesNotMatch(JSON.stringify(result),/PRIVATE/);
});
test('response observer is capped, passive, records detached frames and never registers routes or error filters',()=>{
 const observations=[],callbacks=[];const page={on:(name,fn)=>{assert.equal(name,'response');callbacks.push(fn)},route:()=>assert.fail('No routing'),goto:()=>assert.fail('No navigation')};
 attachPublicApiReadDiagnostics(page,origin,observations);assert.equal(callbacks.length,1);
 const response=(status=503,detached=false)=>({status:()=>status,request:()=>({url:()=>info.url,method:()=> 'GET',resourceType:()=> 'fetch',isNavigationRequest:()=>false,frame:()=>{if(detached)throw Error('PRIVATE');return{url:()=>info.frameUrl}}})});
 callbacks[0](response(401));callbacks[0](response(503,true));
 assert.equal(observations[0].status,401);assert.equal(observations[1].status,503);assert.equal(observations[1].framePageAtResponse,'unclassified');
 callbacks[0]({request:()=>{throw Error('PRIVATE')}});assert.deepEqual(observations[2],{observerState:'unavailable'});
 for(let i=0;i<50;i++)callbacks[0](response());assert.equal(observations.length,40);assert.doesNotMatch(JSON.stringify(observations),/PRIVATE|\/api\/|3100/);
});
test('observer additions erase to exact current main script and preserve all console/page/provider fatal gates',()=>{
 let source=removeAnonymousPortraitAdditions(readFileSync(new URL('../scripts/verify-public-services-production.mjs',import.meta.url),'utf8'));
 assert.match(source,/attachPublicApiReadDiagnostics\(page, origin, diagnostics.apiReadObservations\)/);
 assert.match(source,/assert.deepEqual\(diagnostics.console.filter\(\(entry\) => entry.type === "error"\), \[\]/);
 // Sequential C moves only this navigation under the helper's route guard.
 const hubCall='              await verifyFreeDiagnosisHub(hub, expect, {origin, locale});\n';
 assert.doesNotMatch(source,/await hub\.goto\(/);assert.equal(source.split(hubCall).length-1,1);
 source=source.replace(hubCall,'              await hub.goto(origin + "/" + locale + "/services/free-consultation", {waitUntil: "domcontentloaded"});\n'+hubCall);
 source=source.replace('import { attachPublicApiReadDiagnostics } from "./helpers/public-api-read-diagnostics.mjs";\n','')
  .replace('console: [], apiReadObservations: [], pageErrors: []','console: [], pageErrors: []')
  .replace('    attachPublicApiReadDiagnostics(page, origin, diagnostics.apiReadObservations);\n','');
 const bytes=Buffer.from(source);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'473ae326dbe3e8d6e36c1a8894860d0aca7cfdc0');
});
