import {removeAnonymousPortraitAdditions} from './helpers/anonymous-portrait-source-normalization.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {createExpectedTestimonialPosterFixture,expectedTestimonialPoster,additionalTestimonialPoster,syntheticPosterSvg,assertSyntheticPosterObservation} from '../scripts/helpers/expected-testimonial-poster-fixture.mjs';
import {createFreeEntryGuard,verifyFreeDiagnosisHub} from '../scripts/helpers/free-entry-current-verifier.mjs';
const origin='http://127.0.0.1:3100',read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function route(overrides={},locale='en') {
 const calls=[];const request={url:()=>expectedTestimonialPoster,method:()=> 'GET',resourceType:()=> 'image',isNavigationRequest:()=>false,postData:()=>null,
  frame:()=>({url:()=>origin+'/'+locale+'/services/free-consultation'}),allHeaders:async()=>({accept:'image/avif,image/webp,*/*',referer:origin+'/', 'sec-fetch-dest':'image'}),...overrides};
 return{calls,request:()=>request,fulfill:async result=>calls.push({kind:'fulfill',result}),abort:async reason=>calls.push({kind:'abort',reason}),continue:async()=>assert.fail('No external continuation')};
}
test('one exact public metadata URL is locally fulfilled as inert 640 by 360 synthetic image in each localized hub',async()=>{
 for(const locale of ['en','ru','es']) {
  const fixture=createExpectedTestimonialPosterFixture(origin,locale),request=route({},locale);
  assert.equal(await fixture.tryFulfill(request),true);assert.equal(fixture.responses,1);assert.equal(request.calls.length,1);
  assert.deepEqual(request.calls[0],{kind:'fulfill',result:{status:200,contentType:'image/svg+xml',body:syntheticPosterSvg,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}});
 }
 assert.match(syntheticPosterSvg,/width="640" height="360" viewBox="0 0 640 360"/);
 assert.doesNotMatch(syntheticPosterSvg,/<script|<image|href=|foreignObject|onload|https?:\/\/(?!www.w3.org\/2000\/svg)/);
 for(const bad of ['https://holistichouse.vercel.app',origin+'/',origin+'/private'])assert.throws(()=>createExpectedTestimonialPosterFixture(bad,'en'));
 assert.throws(()=>createExpectedTestimonialPosterFixture(origin,'fr'));
});
test('query, foreign host, other images, private/auth/body/navigation/frame/header variants are denied',async()=>{
 const urls=[expectedTestimonialPoster+'?token=PRIVATE',expectedTestimonialPoster+'?',expectedTestimonialPoster+'#PRIVATE',expectedTestimonialPoster.replace('hqdefault','maxresdefault'),expectedTestimonialPoster.replace('m9RfDgK76PU','UNKNOWN_QA_ID'),expectedTestimonialPoster.replace('i.ytimg.com','img.youtube.com'),expectedTestimonialPoster.replace('https:','http:'),expectedTestimonialPoster.replace('https://','https://PRIVATE@'),' '+expectedTestimonialPoster,expectedTestimonialPoster.replace('/vi/','/extra/../vi/')];
 const variants=[...urls.map(url=>({url:()=>url})),...['POST','HEAD'].map(method=>({method:()=>method})),{resourceType:()=> 'fetch'},{isNavigationRequest:()=>true},{postData:()=> 'PRIVATE'},
 ...[origin+'/en/services/free-consultation?token=PRIVATE',origin+'/en/services/free-situation-review',origin+'/ru/services/free-consultation','https://example.test/en/services/free-consultation'].map(url=>({frame:()=>({url:()=>url})})),
 {frame:()=>{throw Error('PRIVATE')}},{allHeaders:undefined},{allHeaders:async()=>{throw Error('PRIVATE')}},{allHeaders:async()=>null},
 ...[{authorization:'PRIVATE'},{cookie:'PRIVATE'},{'x-private-marker':'PRIVATE'},{purpose:'prefetch'},{'sec-purpose':'prefetch'},{host:'example.test'},{origin:'https://example.test'},{referer:origin+'/en/app/portrait?token=PRIVATE'},{'sec-fetch-dest':'document'},{accept:'image/*',Accept:'PRIVATE'}].map(headers=>({allHeaders:async()=>headers}))];
 for(const variant of variants){const fixture=createExpectedTestimonialPosterFixture(origin,'en'),request=route(variant);assert.equal(await fixture.tryFulfill(request),false);assert.equal(fixture.responses,0);assert.deepEqual(request.calls,[])}
});
test('cap one is race safe; repeated expected requests and every unknown provider remain fatal in real guard',async()=>{
 const fixture=createExpectedTestimonialPosterFixture(origin,'en'),a=route(),b=route();assert.deepEqual((await Promise.all([fixture.tryFulfill(a),fixture.tryFulfill(b)])).sort(),[false,true]);assert.equal(fixture.responses,1);
 const guard=createFreeEntryGuard(origin,'en',{syntheticTestimonialPoster:true});await guard.route(route());await guard.route(route());assert.equal(guard.fixturePosters,1);assert.deepEqual(guard.blocked,['unexpected-provider']);
 for(const url of [expectedTestimonialPoster,expectedTestimonialPoster.replace('m9RfDgK76PU','UNKNOWN_QA_ID'),'https://www.youtube-nocookie.com/embed/s30Y42IwPcg','https://app.heygen.com/embeds/2c251709aba74fd96ae8be43257a080b']) {
  const closed=createFreeEntryGuard(origin,'en'),request=route({url:()=>url});await closed.route(request);assert.deepEqual(closed.blocked,['unexpected-provider']);assert.equal(closed.fixturePosters,0);
 }
 const unknown=createFreeEntryGuard(origin,'en',{syntheticTestimonialPoster:true});await unknown.route(route({url:()=>expectedTestimonialPoster.replace('m9RfDgK76PU','UNKNOWN_QA_ID')}));assert.deepEqual(unknown.blocked,['unexpected-provider']);
});
test('missing target, unrequested fixture, cap excess, wrong source, broken/one-pixel or non-16:9 images fail',()=>{
 const observed={targetCount:1,imageCount:1,requests:1,sourceMatches:true,complete:true,naturalWidth:640,naturalHeight:360,width:320,height:180};assertSyntheticPosterObservation(observed);
 for(const bad of [{targetCount:0},{targetCount:2},{imageCount:0},{requests:0},{requests:2},{sourceMatches:false},{complete:false},{naturalWidth:1,naturalHeight:1},{naturalWidth:1280},{width:1,height:1},{width:320,height:240},{width:NaN}])assert.throws(()=>assertSyntheticPosterObservation({...observed,...bad}));
});
test('pinned public metadata and current player declare this exact external poster and 16:9 frame, without narrative oracle',()=>{
 const metadata=read('components/personal-testimonials.tsx'),player=read('components/site-video-player.tsx'),page=read('app/[locale]/services/free-consultation/page.tsx');
 assert.match(metadata,/id: "m9RfDgK76PU", title: "[^"\n]+", language: "ru"/);
 const archived=metadata.match(/export const locallyArchivedVideoPosterIds = new Set\(\[([\s\S]*?)\]\)/)?.[1];assert.ok(archived);assert.doesNotMatch(archived,/m9RfDgK76PU/);
 assert.match(metadata,/data-testimonial-video-id=\{item.id\}/);assert.match(metadata,/video=\{\{ youtubeId: item.id, language: item.language, title: item.title \}\}/);assert.match(metadata,/\n        compact\n/);
 assert.match(page,/<main[^>]+data-free-consultation-hub>/);assert.match(page,/<PersonalTestimonials locale=\{lang\} variant="all" \/>/);
 assert.match(player,/compact \? "hq" : "maxres"/);assert.ok(player.includes('https://i.ytimg.com/vi/${video.youtubeId}/${poster === "maxres" ? "maxresdefault" : "hqdefault"}.jpg'));
 assert.match(player,/className="site-video-poster"[^\n]+unoptimized loading="lazy"/);assert.match(player,/naturalWidth <= 120/);
 assert.match(read('app/site-videos.css'),/\.site-video-frame\s*\{[^}]*width: 100%;[^}]*aspect-ratio: 16 \/ 9;/);
 const caller=read('scripts/verify-public-services-production.mjs');assert.match(caller,/browser.newContext\(\{ serviceWorkers: "block"/);assert.doesNotMatch(caller,/storageState/);
});
test('fixture is opt-in only for current hub and preserves paid, consent, privacy, provider and real-click gates',()=>{
 let helper=read('scripts/helpers/free-entry-current-verifier.mjs');
 // Erase this second-ID addition before retaining the original C/source oracle.
 assert.match(helper,/fixturePosterRequests\('5oj0BIbLT4w'\)/);
 assert.doesNotMatch(helper,/additionalCard\.scroll|additionalPoster\.scroll|additionalPoster\.evaluate\([^\n]*(?:src\s*=|loading\s*=)/);
 helper=helper.replace('createExpectedTestimonialPosterFixture, expectedTestimonialPoster, additionalTestimonialPoster, assertSyntheticPosterObservation','createExpectedTestimonialPosterFixture, expectedTestimonialPoster, assertSyntheticPosterObservation')
  .replace(', fixturePosterRequests:id=>posterFixture?.responsesFor(id)||0','')
  .replace("await expect.poll(()=>guard.fixturePosterRequests('m9RfDgK76PU')).toBe(1)",'await expect.poll(()=>guard.fixturePosters).toBe(1)')
  .replace("requests:guard.fixturePosterRequests('m9RfDgK76PU')})",'requests:guard.fixturePosters})');
 const secondStart=helper.indexOf('  // This second source-declared poster is fulfilled only if the browser asks;'),secondEnd=helper.indexOf('  for(let i=0;i<offerIds.length;i++)',secondStart);
 assert.ok(secondStart>0&&secondEnd>secondStart);helper=helper.slice(0,secondStart)+helper.slice(secondEnd);
 const optionalStart=helper.indexOf("  const additionalRequests=guard.fixturePosterRequests('5oj0BIbLT4w')"),optionalEnd=helper.indexOf('  assert.deepEqual(guard.blocked,[])',optionalStart);
 assert.ok(optionalStart>0&&optionalEnd>optionalStart);helper=helper.slice(0,optionalStart)+helper.slice(optionalEnd);
 const currentBytes=Buffer.from(helper);assert.equal(createHash('sha1').update('blob '+currentBytes.length+'\0').update(currentBytes).digest('hex'),'57d1a267bf96e76e19dbf55e2e92b6c66779f49a');
 assert.equal((helper.match(/syntheticTestimonialPoster:true/g)||[]).length,1);
 assert.match(helper,/await posterCard.scrollIntoViewIfNeeded\(\)/);assert.match(helper,/await expect.poll\(\(\)=>guard.fixturePosters\).toBe\(1\)/);assert.match(helper,/assertSyntheticPosterObservation\(\{\.\.\.posterState/);
 assert.doesNotMatch(helper,/force:\s*true|dispatchEvent|setChecked/);
 helper=helper.replace("import { createExpectedTestimonialPosterFixture, expectedTestimonialPoster, assertSyntheticPosterObservation } from './expected-testimonial-poster-fixture.mjs'\n",'')
  .replace('createFreeEntryGuard(origin, locale, {syntheticTestimonialPoster=false} = {})','createFreeEntryGuard(origin, locale)')
  .replace(' const posterFixture=syntheticTestimonialPoster===true?createExpectedTestimonialPosterFixture(origin,locale):null\n','')
  .replace(', get fixturePosters(){return posterFixture?.responses||0}','')
  .replace('  if (posterFixture && await posterFixture.tryFulfill(route)) return\n','')
  .replace('createFreeEntryGuard(origin,locale,{syntheticTestimonialPoster:true})','createFreeEntryGuard(origin,locale)');
 const movedNavigation='  await page.goto(origin + "/" + locale + "/services/free-consultation", {waitUntil: "domcontentloaded"});\n  assert.equal(page.url(),origin+\'/\'+locale+\'/services/free-consultation\')\n';
 assert.equal(helper.split(movedNavigation).length-1,1);helper=helper.replace(movedNavigation,'');
 helper=helper.replace('export async function verifyFreeDiagnosisHub(page, expect, {origin,locale}) {\n boundary(origin,locale)\n',"export async function verifyFreeDiagnosisHub(page, expect, {origin,locale}) {\n boundary(origin,locale)\n assert.equal(page.url(),origin+'/'+locale+'/services/free-consultation')\n");
 const start=helper.indexOf('  // One source-approved public poster is synthetic;'),end=helper.indexOf('  for(let i=0;i<offerIds.length;i++)',start);assert.ok(start>0&&end>start);helper=helper.slice(0,start)+helper.slice(end);
 const bytes=Buffer.from(helper);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'886a161002959b1fc6ff4548b7650ce9334dfcfe');
});

function actualHubCaller() {
 const main=read('scripts/verify-public-services-production.mjs');
 const start=main.indexOf('            const hub = await createPage(width);');
 const finish='            } finally { await hub.close(); }';
 const end=main.indexOf(finish,start);assert.ok(start>0&&end>start);
 const block=main.slice(start,end+finish.length);assert.doesNotMatch(block,/\.goto\(/);
 return runInNewContext('(async ({createPage,width,verifyFreeDiagnosisHub,expect,origin,locale,assertViewport,assertNoDevIssueOverlay})=>{'+block+'})');
}
test('actual main caller installs real guard before its sole navigation/first poster request and cleans up when goto throws',async()=>{
 for(const locale of ['en','ru','es'])for(const gotoThrows of [false,true]) {
  const events=[],failure=new Error(gotoThrows?'SYNTHETIC_GOTO_FAILURE':'SYNTHETIC_STOP_AFTER_NAVIGATION');let active,url='about:blank',gotos=0;
  const context={route:async(pattern,handler)=>{assert.equal(pattern,'**/*');assert.equal(active,undefined);active=handler;events.push('route')},
   unroute:async(pattern,handler)=>{assert.equal(pattern,'**/*');assert.equal(active,handler);active=undefined;events.push('unroute')}};
  const page={context:()=>context,url:()=>url,close:async()=>{assert.equal(active,undefined);events.push('close')},
   goto:async(destination,options)=>{
    gotos++;events.push('goto');assert.equal(typeof active,'function','Guard must exist before the first navigation request');
    assert.equal(destination,origin+'/'+locale+'/services/free-consultation');assert.equal(JSON.stringify(options),JSON.stringify({waitUntil:'domcontentloaded'}));url=destination;
    const document=route({url:()=>destination,resourceType:()=> 'document',isNavigationRequest:()=>true},locale);document.continue=async()=>document.calls.push({kind:'continue-local'});await active(document);assert.deepEqual(document.calls,[{kind:'continue-local'}]);events.push('local-document');
    const poster=route({},locale);await active(poster);assert.equal(poster.calls.length,1);assert.equal(poster.calls[0].kind,'fulfill');assert.equal(poster.calls[0].result.body,syntheticPosterSvg);events.push('poster');
    const denied=route({url:()=>expectedTestimonialPoster+'?token=PRIVATE'},locale);await active(denied);assert.deepEqual(denied.calls,[{kind:'abort',reason:'blockedbyclient'}]);events.push('denied');
    if(gotoThrows)throw failure;
   },locator:()=>{events.push('after-navigation');throw failure}};
  await assert.rejects(actualHubCaller()({createPage:async width=>{assert.equal(width,390);events.push('create');return page},width:390,verifyFreeDiagnosisHub,expect:()=>assert.fail('No DOM expectation before navigation'),origin,locale,
   assertViewport:()=>assert.fail('No later acceptance after synthetic stop'),assertNoDevIssueOverlay:()=>assert.fail('No later acceptance after synthetic stop')}),error=>error===failure);
  assert.equal(gotos,1);assert.equal(active,undefined);
  assert.deepEqual(events,['create','route','goto','local-document','poster','denied',...(gotoThrows?[]:['after-navigation']),'unroute','close']);
 }
});
test('C navigation move alone reconstructs the exact approved A main and helper owns exactly one destination',()=>{
 let main=removeAnonymousPortraitAdditions(read('scripts/verify-public-services-production.mjs'));
 assert.doesNotMatch(main,/await hub\.goto\(/);
 const anchor='              await verifyFreeDiagnosisHub(hub, expect, {origin, locale});\n';assert.equal(main.split(anchor).length-1,1);
 main=main.replace(anchor,'              await hub.goto(origin + "/" + locale + "/services/free-consultation", {waitUntil: "domcontentloaded"});\n'+anchor);
 const bytes=Buffer.from(main);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'9b97e4798aaf722d42b99f68f010335a0f790246');
 const helper=read('scripts/helpers/free-entry-current-verifier.mjs'),hub=helper.slice(helper.indexOf('export async function verifyFreeDiagnosisHub'));
 assert.equal((hub.match(/await page\.goto\(/g)||[]).length,1);
 assert.ok(hub.indexOf("await context.route('**/*',guard.route)")<hub.indexOf(' try {\n  await page.goto('));
 assert.ok(hub.indexOf('await page.goto(')<hub.indexOf("assert.equal(page.url(),origin+'/'+locale+'/services/free-consultation')"));
 assert.match(hub,/finally \{ if\(popup\) await popup.close\(\); await context.unroute\('\*\*\/\*',guard.route\) \}/);
});


test('second native-observed public poster has its own cap and cannot broaden unknown providers',async()=>{
 assert.equal(additionalTestimonialPoster,'https://i.ytimg.com/vi/5oj0BIbLT4w/hqdefault.jpg');
 const metadata=read('components/personal-testimonials.tsx');
 assert.match(metadata,/id: "5oj0BIbLT4w", title: "[^"\n]+", language: "ru"/);
 assert.doesNotMatch(metadata.match(/export const locallyArchivedVideoPosterIds = new Set\(\[([\s\S]*?)\]\)/)?.[1]||'',/5oj0BIbLT4w/);
 for(const locale of ['en','ru','es']) {
  const fixture=createExpectedTestimonialPosterFixture(origin,locale),first=route({},locale),second=route({url:()=>additionalTestimonialPoster},locale);
  assert.deepEqual(await Promise.all([fixture.tryFulfill(first),fixture.tryFulfill(second)]),[true,true]);assert.equal(fixture.responses,2);
  assert.equal(fixture.responsesFor('m9RfDgK76PU'),1);assert.equal(fixture.responsesFor('5oj0BIbLT4w'),1);
  assert.equal(first.calls[0].result.body,syntheticPosterSvg);assert.equal(second.calls[0].result.body,syntheticPosterSvg);
  assert.equal(await fixture.tryFulfill(route({},locale)),false);assert.equal(await fixture.tryFulfill(route({url:()=>additionalTestimonialPoster},locale)),false);
  assert.throws(()=>fixture.responsesFor('UNKNOWN_QA_ID'));
 }
 const fixture=createExpectedTestimonialPosterFixture(origin,'en');
 const pairs=await Promise.all([fixture.tryFulfill(route({url:()=>additionalTestimonialPoster})),fixture.tryFulfill(route({url:()=>additionalTestimonialPoster}))]);assert.deepEqual(pairs.sort(),[false,true]);
 assert.equal(fixture.responsesFor('m9RfDgK76PU'),0,'No unrelated first-ID load is manufactured by a second-ID request');
 for(const suffix of ['?token=PRIVATE','?','#PRIVATE'])assert.equal(await createExpectedTestimonialPosterFixture(origin,'en').tryFulfill(route({url:()=>additionalTestimonialPoster+suffix})),false);
 for(const headers of [{cookie:'PRIVATE'},{authorization:'PRIVATE'},{'x-private':'PRIVATE'}])assert.equal(await createExpectedTestimonialPosterFixture(origin,'en').tryFulfill(route({url:()=>additionalTestimonialPoster,allHeaders:async()=>headers})),false);
 const guard=createFreeEntryGuard(origin,'en',{syntheticTestimonialPoster:true});await guard.route(route({url:()=>additionalTestimonialPoster}));assert.equal(guard.fixturePosterRequests('5oj0BIbLT4w'),1);assert.equal(guard.fixturePosterRequests('m9RfDgK76PU'),0);
 const unknown=route({url:()=>additionalTestimonialPoster.replace('5oj0BIbLT4w','UNKNOWN_QA_ID')});await guard.route(unknown);assert.deepEqual(unknown.calls,[{kind:'abort',reason:'blockedbyclient'}]);assert.deepEqual(guard.blocked,['unexpected-provider']);
});
