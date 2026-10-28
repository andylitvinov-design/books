import assert from 'node:assert/strict';
import {types as nodeTypes} from 'node:util';
import {anonymousBootstrapDenial, anonymousCredentialClass} from './anonymous-bootstrap-fixture.mjs';

export const portraitBootstrapPattern='**/api/app/bootstrap**';
export const anonymousPortraitCopy=Object.freeze({
 en:{guest:'Choose your path. Start free.',google:'Continue with Google',googleName:/^G\s*Continue with Google$/,unavailable:"We couldn't open your space right now.",retry:'Try again'},
 ru:{guest:'Выберите свой путь. Начните бесплатно.',google:'Войти через Google',googleName:/^G\s*Войти через Google$/,unavailable:'Сейчас не удалось открыть ваше пространство.',retry:'Повторить'},
});
const browserHeaders=new Set(['accept','accept-encoding','accept-language','cache-control','connection','dnt','host','origin','pragma','priority','referer','user-agent',
 'sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','sec-fetch-dest','sec-fetch-mode','sec-fetch-site']);
const states=new WeakMap();
const descriptor=Object.getOwnPropertyDescriptor, define=Object.defineProperty;
const isProxy=nodeTypes.isProxy, isArray=Array.isArray;
const credentialClasses=new Set(['none','authorization','cookie','account-id','api-key','session','multiple','unclassified']);
const reasons=new Set(['outside-activation','request-shape','duplicate-request','headers-unavailable','header-boundary','header-context','observation-unavailable','response-observation-unavailable','console-observation-unavailable']);
// Closure state only. Unknown fixtures and hostile sinks never run getters/traps.
export function appendPortraitFixtureFailure(sink,fixture){
 try{
  if(!sink||typeof sink!=='object'||isProxy(sink)||!isArray(sink)||!fixture||typeof fixture!=='object'||isProxy(fixture))return;
  const state=states.get(fixture), length=descriptor(sink,'length')?.value;
  if(!state||!Number.isSafeInteger(length)||length<0||length>=16)return;
  const snapshot=state();
  if(snapshot.finished)return;
  define(sink,''+length,{value:snapshot,writable:true,enumerable:true,configurable:true});
 }catch{/* Diagnostics never replace the primary failure or cleanup. */}
}
const consoleText='Failed to load resource: the server responded with a status of 401 (Unauthorized)';

// Explicit anonymous UI fixture, not actual API/auth/configuration health.
// Never return account/course data; never forward a bootstrap request.
export function createAnonymousPortraitBootstrapFixture(page,origin,locale){
 assert.match(origin,/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);assert.equal(new URL(origin).origin,origin);assert.ok(Object.hasOwn(anonymousPortraitCopy,locale));
 const frameUrl=origin+'/'+locale+'/services',requestUrl=origin+'/api/app/bootstrap?view=portrait';
 let armed=false,finished=false,matchedRequest=null,denials=0,responses=0,responseStatus=null;
 const blocked=[],consoleEntries=[],decisions=[];
 const note=(reason,credentialClass='none')=>{try{if(decisions.length<16)decisions.push(Object.freeze(Object.assign(Object.create(null),{reason:reasons.has(reason)?reason:'unclassified',credentialClass:credentialClasses.has(credentialClass)?credentialClass:'unclassified'})));}catch{}};
 const deny=async(route,reason,credentialClass)=>{note(reason,credentialClass);blocked.push(reason);await route.abort('blockedbyclient')};
 const fixture={
  get denials(){return denials},get responses(){return responses},
  arm(){assert.equal(armed,false);assert.equal(page.url(),frameUrl);armed=true},
  async route(route){
   if(!armed||finished)return deny(route,'outside-activation');
   let request;
   try{
    request=route.request();
    if(request.url()!==requestUrl||request.method()!=='GET'||request.resourceType()!=='fetch'||request.isNavigationRequest()!==false||
      ![null,''].includes(request.postData())||request.frame().url()!==frameUrl)return deny(route,'request-shape');
    if(denials!==0)return deny(route,'duplicate-request');
    const headers=await request.allHeaders();
    if(!headers||typeof headers!=='object'||Array.isArray(headers))return deny(route,'headers-unavailable');
    const names=Object.keys(headers);
    if(new Set(names.map(name=>name.toLowerCase())).size!==names.length||names.some(name=>!browserHeaders.has(name.toLowerCase())))return deny(route,'header-boundary',anonymousCredentialClass(names));
    const value=key=>headers[names.find(name=>name.toLowerCase()===key)];
    if(value('host')!==undefined&&value('host')!==new URL(origin).host||value('origin')!==undefined&&value('origin')!==origin||
      value('referer')!==undefined&&value('referer')!==frameUrl||value('sec-fetch-site')!==undefined&&value('sec-fetch-site')!=='same-origin')return deny(route,'header-context');
   }catch{return deny(route,'observation-unavailable')}
   if(denials!==0)return deny(route,'duplicate-request');
   denials++;matchedRequest=request;
   await route.fulfill({...anonymousBootstrapDenial,headers:{...anonymousBootstrapDenial.headers}});
  },
  observeResponse(response){
   try{if(matchedRequest&&response.request()===matchedRequest){responses++;responseStatus=response.status()}}catch{blocked.push('response-observation-unavailable')}
  },
  observeConsole(message,entry){
   // Keep all messages in normal diagnostics. Classification happens only after
   // the actual fulfilled Request's 401 Response has been observed and checked.
   try{
    if(!armed||finished||!matchedRequest||message.type()!=='error'||message.text()!==consoleText)return;
    if(message.location().url===requestUrl)consoleEntries.push(entry)
   }catch{blocked.push('console-observation-unavailable')}
  },
  finish(approvedConsoleEntries){
   assert.equal(armed,true);assert.equal(finished,false);assert.equal(denials,1,'Exactly one explicit anonymous portrait probe');
   assert.equal(responses,1,'The actual fulfilled Request must produce exactly one observed Response');assert.equal(responseStatus,401);
   assert.deepEqual(blocked,[],'No spontaneous, private or unknown bootstrap request');assert.ok(consoleEntries.length<=1,'No duplicate expected denial console errors');
   for(const entry of consoleEntries)approvedConsoleEntries.add(entry);
   finished=true;
   return Object.freeze({fixture:'anonymous-portrait-denial',denials,responses,consoleErrors:consoleEntries.length});
  },
 };
 states.set(fixture,()=>Object.assign(Object.create(null),{
  armed,finished,denials:denials===0?0:denials===1?1:'unexpected',
  responses:Number.isSafeInteger(responses)&&responses>=0&&responses<=16?responses:'unexpected',
  responseStatus:responseStatus===null?null:Number.isInteger(responseStatus)&&responseStatus>=100&&responseStatus<=599?responseStatus:'unclassified',
  decisions:Object.setPrototypeOf(decisions.map(entry=>Object.assign(Object.create(null),{reason:entry.reason,credentialClass:entry.credentialClass})),null),
  blocked:Object.setPrototypeOf(blocked.slice(0,16).map(reason=>reasons.has(reason)?reason:'unclassified'),null),blockedTruncated:blocked.length>16,
 }));
 return fixture;
}
