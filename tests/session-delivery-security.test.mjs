import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
const root=new URL('../',import.meta.url);
const source=await readFile(new URL('lib/clients/session-delivery-storage.js',root),'utf8');
const load=(src,names,values,result)=>new Function(...names,src.replace(/^import .*\n/gm,'').replace(/^export \{client as privateStorageClient, sniff as sniffPrivateMedia\}\r?\n/gm,'').replace(/export /g,'')+'\nreturn '+result)(...values);
class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
function storageFixture({size=512,mime='audio/mp4',status='pending',split=false,removedDuringValidation=false}={}){
 let updates=0,attached=0;const asset={id:'asset',status,object_key:'fake',max_bytes:512,mime:'audio/mp4'};
 const storage={info:async()=>({data:{size,contentType:mime}}),createSignedUrl:async()=>({data:{signedUrl:'https://synthetic.invalid/file'}})};
 const transaction=async(c,a,fn)=>fn({query:async(sql)=>{
  if(sql.startsWith('select *'))return {rows:[asset]};
  if(sql.startsWith('update')){updates++;if(removedDuringValidation)return {rowCount:0};asset.status='ready';return {rowCount:1}};
  return {rows:[{status:'removed'}]};
 }});
 const header=Uint8Array.from([0,0,0,24,102,116,121,112,77,52,65,32]);
 const fetch=async()=>({ok:true,body:new ReadableStream({start(c){if(split){c.enqueue(header.slice(0,5));c.enqueue(header.slice(5))}else c.enqueue(header);c.close()}})});
 const complete=load(source,['AppError','transaction','createClient','PRIVATE_MEDIA_BUCKET','SESSION_MEDIA_TYPES','validUuid','getOwnerSession','attachSessionAsset','getSessionAsset','fetch'],[AppError,transaction,()=>({storage:{from:()=>storage}}),'private',{},()=>true,async()=>({}),async()=>{attached++;return {attached:true}},()=>{},fetch],'completePrivateMedia');
 return {run:()=>complete({secretKey:'synthetic',supabaseUrl:'https://synthetic.invalid'},null,'a','b','asset'),stats:()=>({updates,attached})};
}
test('truncated and oversized objects cannot finalize',async()=>{for(const size of [127,511,513]){const f=storageFixture({size});await assert.rejects(f.run(),{code:'MEDIA_SIZE_NOT_ALLOWED'});assert.deepEqual(f.stats(),{updates:0,attached:0})}});
test('wrong MIME cannot finalize',async()=>{const f=storageFixture({mime:'text/html'});await assert.rejects(f.run(),{code:'MEDIA_TYPE_NOT_ALLOWED'})});
test('fragmented valid header finalizes exactly once',async()=>{const f=storageFixture({split:true});await f.run();assert.deepEqual(f.stats(),{updates:1,attached:1})});
test('ready repeat finalization avoids storage mutation',async()=>{const f=storageFixture({status:'ready'});await f.run();assert.deepEqual(f.stats(),{updates:0,attached:1})});
test('concurrent tombstone prevents attachment after sniffing',async()=>{const f=storageFixture({removedDuringValidation:true});await assert.rejects(f.run(),{code:'MEDIA_UNAVAILABLE'});assert.deepEqual(f.stats(),{updates:1,attached:0})});
const service=await readFile(new URL('lib/clients/session-delivery-service.js',root),'utf8');
const {createHash}=await import('node:crypto');
function reportFixture(changed){
 const original={id:'document-a',clientId:'client-a',status:'active',kind:'recommendation',content:'published'};
 const payload={reportDocumentId:'document-a',reportFingerprint:createHash('sha256').update(JSON.stringify(original)).digest('hex')};
 const row={id:'session-a',legacy_client_id:'client-a',status:'published',published_payload:'synthetic'};
 const record=changed?{...original,content:'unpublished edit'}:original;
 const get=load(service,['createHash','AppError','transaction','openSealed','seal','validUuid'],[createHash,AppError,async(c,a,fn)=>fn({query:async()=>({rows:[row]})}),()=>payload,()=>{},()=>true],'getPublishedSessionReport');
 return ()=>get({}, {findClientById:async()=>({status:'active'}),findById:async()=>record},'client-a','session-a');
}
test('published report helper returns exact fingerprint-validated record',async()=>{assert.equal((await reportFixture(false)()).content,'published')});
test('unpublished report edit is denied instead of rendered',async()=>{await assert.rejects(reportFixture(true)(),{code:'SESSION_UNAVAILABLE'})});
function intentFixture(overrides={}){
 const existing={id:'intent',legacy_client_id:'client-a',session_id:'session-a',scope:'practitioner',mime:'audio/mp4',asset_kind:'audio',max_bytes:512,status:'pending',object_key:'same-key',created_at:new Date().toISOString(),...overrides};let signed=0;
 const create=load(source,['AppError','transaction','createClient','PRIVATE_MEDIA_BUCKET','SESSION_MEDIA_TYPES','validUuid','getOwnerSession','configuredVideoUploadStore'],[AppError,async(c,a,fn)=>fn({query:async()=>({rows:[existing]})}),()=>({storage:{from:()=>({createSignedUploadUrl:async()=>{signed++;return {data:{token:'synthetic'}}}})}}),'private',{'audio/mp4':{kind:'audio',max:20_000_000}},()=>true,async()=>({status:'draft'}),()=>null],'createPrivateMediaIntent');
 return {run:()=>create({secretKey:'synthetic',supabaseUrl:'https://synthetic.invalid'},null,'client-a','session-a',{intentId:'intent',mime:'audio/mp4',kind:'audio',scope:'practitioner',bytes:512}),signed:()=>signed};
}
test('reused intent rejects client, session, scope, MIME, kind and byte mismatches',async()=>{
 for(const mismatch of [{legacy_client_id:'other'},{session_id:'other'},{scope:'client'},{mime:'video/mp4'},{asset_kind:'video'},{max_bytes:513},{status:'removed'}]){
  const f=intentFixture(mismatch);await assert.rejects(f.run(),{code:'MEDIA_UNAVAILABLE'});assert.equal(f.signed(),0)
 }
});
test('matching intent returns same private object key',async()=>{const result=await intentFixture().run();assert.equal(result.assetId,'intent');assert.equal(result.objectKey,'same-key')});
test('old pending intent cannot refresh into cleanup window',async()=>{const f=intentFixture({created_at:new Date(Date.now()-22*3600_000).toISOString()});await assert.rejects(f.run(),{code:'MEDIA_INTENT_EXPIRED'});assert.equal(f.signed(),0)});
function cleanupFixture(failRemove=false){
 const events=[];
 const cleanup=load(source,['AppError','transaction','createClient','PRIVATE_MEDIA_BUCKET','getOwnerSession'],[AppError,async(c,a,fn)=>{const result=await fn({query:async(sql)=>{if(sql.startsWith('update')){events.push('claim');assert.ok(sql.includes('ready_at is null'));return {rows:[{object_key:'pending-only'}]}};events.push('delete-tombstone');assert.ok(sql.includes("status='removed' and object_key=any("));return {}}});events.push('commit');return result},()=>({storage:{from:()=>({remove:async keys=>{events.push('remove-storage');assert.deepEqual(keys,['pending-only']);return {error:failRemove?new Error('offline'):null}}})}}),'private',async()=>({})],'cleanupPendingSessionMedia');
 return {run:()=>cleanup({secretKey:'synthetic'},null,'a','b'),events};
}
test('cleanup commits claim before object deletion, then removes successful tombstones',async()=>{const f=cleanupFixture();await f.run();assert.deepEqual(f.events,['claim','commit','remove-storage','delete-tombstone','commit'])});
test('failed object deletion retains tombstone for retry',async()=>{const f=cleanupFixture(true);await assert.rejects(f.run(),{code:'MEDIA_CLEANUP_RETRY_REQUIRED'});assert.deepEqual(f.events,['claim','commit','remove-storage'])});
const guestRoute=await readFile(new URL('app/api/client-session-viewer/[selector]/media/[assetId]/route.js',root),'utf8');
const cabinetRoute=await readFile(new URL('app/api/client/[selector]/sessions/[sessionId]/media/[assetId]/route.js',root),'utf8');
function routeFixture(src,{denied=false,media=[{assetId:'asset',scope:'client'}],wrongSession=false,sharedReady=false,assetId='asset'}={}){
 let streams=0,auths=0,sharedStreams=0;
 const json=(body,status=200)=>Response.json(body,{status});
 const auth=async()=>{auths++;if(denied)throw new AppError('SESSION_UNAVAILABLE',404);return {client:{id:'client-a'},clientId:'client-a',sessionId:'session-a',session:{media}}};
 const published=async(c,s,clientId,sessionId)=>{assert.equal(clientId,'client-a');if(wrongSession)throw new AppError('SESSION_UNAVAILABLE',404);return {media}};
 const handle=load(src,['privateDelivery','privateJson','smallJson','authorizeSessionGuest','readSessionViewerCookie','authorizeCabinetRequest','getPublishedClientSession','privateMediaStream','GRANULES_GUIDE_ID','sharedGranulesGuideReady','streamSharedGranulesGuide'],[async fn=>{try{return await fn({config:{},store:{}})}catch(e){return json({error:e.code},e.status)}},json,async()=>{},auth,()=>({}),auth,published,async(c,client,session,asset)=>{streams++;assert.equal(client,'client-a');assert.equal(session,'session-a');assert.equal(asset,'asset');return new Response('synthetic')},'homeopathy-granules-ru-v2',()=>sharedReady,async()=>{sharedStreams++;return new Response('educational')}],'handle');
 return {run:method=>handle(new Request('https://synthetic.invalid/media',{method}),{params:{selector:'selector',sessionId:'session-a',assetId}}),stats:()=>({streams,auths}),sharedStreams:()=>sharedStreams};
}
test('guest and cabinet GET HEAD POST all stop before stream when authorization denies',async()=>{
 for(const src of [guestRoute,cabinetRoute])for(const method of ['GET','HEAD','POST']){
  const f=routeFixture(src,{denied:true});assert.equal((await f.run(method)).status,404);assert.deepEqual(f.stats(),{streams:0,auths:1})
 }
});
test('guest and cabinet reject unpublished, foreign and practitioner media for every method',async()=>{
 for(const src of [guestRoute,cabinetRoute])for(const media of [[],[{assetId:'foreign',scope:'client'}],[{assetId:'asset',scope:'practitioner'}]])for(const method of ['GET','HEAD','POST']){
  const f=routeFixture(src,{media});assert.equal((await f.run(method)).status,404);assert.equal(f.stats().streams,0)
 }
});
test('shared educational video is never an authorization bypass and stays hidden until explicitly ready',async()=>{
 for(const src of [guestRoute,cabinetRoute]){
  for(const method of ['GET','HEAD','POST']){
   const denied=routeFixture(src,{denied:true,sharedReady:true,assetId:'homeopathy-granules-ru-v2',media:[]});
   assert.equal((await denied.run(method)).status,404);
   assert.equal(denied.sharedStreams(),0);
   const off=routeFixture(src,{sharedReady:false,assetId:'homeopathy-granules-ru-v2',media:[]});
   assert.equal((await off.run(method)).status,404);
   assert.equal(off.sharedStreams(),0);
   const ready=routeFixture(src,{sharedReady:true,assetId:'homeopathy-granules-ru-v2',media:[]});
   const response=await ready.run(method);
   assert.equal(response.status,200);
   assert.equal(ready.sharedStreams(),method==='POST'?0:1);
   assert.equal(ready.stats().auths,1);
  }
 }
});
test('cabinet rejects other session before invoking stream',async()=>{const f=routeFixture(cabinetRoute,{wrongSession:true});assert.equal((await f.run('GET')).status,404);assert.equal(f.stats().streams,0)});
test('each client stream request reauthorizes and POST contains only app-relative URL',async()=>{
 for(const src of [guestRoute,cabinetRoute]){
  const f=routeFixture(src);await f.run('GET');await f.run('HEAD');const result=await (await f.run('POST')).json();assert.ok(result.url.startsWith('/api/'));assert.equal(result.url.includes('supabase'),false);assert.deepEqual(f.stats(),{streams:2,auths:3})
 }
});
function streamFixture({range=null,status=206,upstreamHeaders={'content-range':'bytes 0-9/512','content-length':'10'},method='GET',signedUrl='https://synthetic.invalid/storage?token=secret'}={}){
 let fetched=0,cancelled=false;const body=new ReadableStream({start(c){c.enqueue(new Uint8Array(10))},cancel(){cancelled=true}});
 const request=new Request('https://app.invalid/media',{method,headers:range?{Range:range}:{}});
 const stream=load(source,['AppError','getSessionAsset','createClient','PRIVATE_MEDIA_BUCKET','fetch'],[AppError,async()=>({mime:'audio/mp4',bytes:512,object_key:'secret-key'}),()=>({storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl}})})}}),'private',async(url,options)=>{fetched++;assert.equal(options.signal,request.signal);assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');return {status,headers:new Headers({...upstreamHeaders,location:signedUrl,'set-cookie':'private=secret'}),body}}],'privateMediaStream');
 return {run:()=>stream({secretKey:'synthetic',supabaseUrl:'https://synthetic.invalid'},'client','session','asset',request),stats:()=>({fetched,cancelled}),body};
}
test('stream rejects malformed/multiple/unsafe ranges before upstream fetch',async()=>{
 for(const range of ['bytes=0-1,4-5','bytes=-','bytes=-0','bytes=10-2','bytes=9007199254740993-','items=0-3']){const f=streamFixture({range});const response=await f.run();assert.equal(response.status,416);assert.equal(f.stats().fetched,0);assert.equal(response.headers.get('content-range'),'bytes */512')}
});
test('stream passes through body without buffering and never returns Storage URL or upstream cookies',async()=>{
 const f=streamFixture({range:'bytes=0-9'}),response=await f.run();assert.equal(response.body,f.body);assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),'bytes 0-9/512');assert.equal(response.headers.get('content-length'),'10');assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('location'),null);assert.equal(response.headers.get('set-cookie'),null);assert.equal(JSON.stringify([...response.headers]).includes('secret'),false);await response.body.cancel()
});
test('HEAD has no body and cancels any upstream body',async()=>{const f=streamFixture({method:'HEAD',status:200,upstreamHeaders:{'content-length':'512'}});const response=await f.run();assert.equal(response.body,null);assert.equal(f.stats().cancelled,true)});
test('unexpected signed origin is denied without fetching',async()=>{const f=streamFixture({signedUrl:'https://other.invalid/private'});await assert.rejects(f.run(),{code:'MEDIA_STORAGE_UNAVAILABLE'});assert.equal(f.stats().fetched,0)});
test('unsatisfiable range is local 416 with zero body length',async()=>{const f=streamFixture({range:'bytes=512-'}),r=await f.run();assert.equal(r.status,416);assert.equal(r.headers.get('content-length'),'0');assert.equal(f.stats().fetched,0)});
test('partial upstream responses require exact span total and consistent length',async()=>{
 for(const headers of [{},{'content-range':'bytes 0-9/513','content-length':'10'},{'content-range':'bytes 1-9/512','content-length':'9'},{'content-range':'bytes 0-8/512','content-length':'9'},{'content-range':'bytes 0-9/512','content-length':'9'},{'content-range':'bytes 0-9/512','content-length':'abc'}]){
  const f=streamFixture({range:'bytes=0-9',upstreamHeaders:headers});await assert.rejects(f.run(),{code:'MEDIA_STORAGE_UNAVAILABLE'});assert.equal(f.stats().cancelled,true)
 }
});
test('suffix open-ended and oversized-end ranges accept exact effective span',async()=>{
 for(const [range,contentRange,length] of [['bytes=-10','bytes 502-511/512','10'],['bytes=500-','bytes 500-511/512','12'],['bytes=500-999','bytes 500-511/512','12']]){
  const f=streamFixture({range,upstreamHeaders:{'content-range':contentRange,'content-length':length}}),r=await f.run();assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),contentRange);await r.body.cancel()
 }
});
test('upstream 416 never forwards error body length or location',async()=>{const f=streamFixture({range:'bytes=0-9',status:416,upstreamHeaders:{'content-length':'187','content-range':'bytes */999'}}),r=await f.run();assert.equal(r.status,416);assert.equal(r.body,null);assert.equal(r.headers.get('content-length'),'0');assert.equal(r.headers.get('content-range'),'bytes */512');assert.equal(r.headers.get('location'),null);assert.equal(f.stats().cancelled,true)});
test('full upstream response with wrong length is rejected',async()=>{const f=streamFixture({status:200,upstreamHeaders:{'content-length':'511'}});await assert.rejects(f.run(),{code:'MEDIA_STORAGE_UNAVAILABLE'});assert.equal(f.stats().cancelled,true)});


test('private PDF validation checks actual PDF signature, not only the browser MIME',()=>{
 const header=load(source,[],[],'headerMatches')
 const pdf=new Uint8Array([37,80,68,70,45,49,46,55,10,37,0,0])
 const html=new Uint8Array([60,104,116,109,108,62,0,0,0,0,0,0])
 assert.equal(header(pdf,'application/pdf'),true)
 assert.equal(header(html,'application/pdf'),false)
})
