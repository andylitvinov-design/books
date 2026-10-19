import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  requestOwnerDocumentLink, prepareReportSession, tryCopyOwnerLink,
} from '../lib/consultations/owner-report-sharing.js'

const src = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

function assertOwnerEntryPoints(action,issuer){
  // #1074 publishes explicitly from the saved-report action; the separate
  // link issuer still opens an owner-only draft for review.
  assert.match(action,/await publishSavedClientReport\(clientId,recordId\)/)
  assert.match(action,/if\(!clientId\|\|!recordId\|\|publishing\)return/)
  assert.match(action,/onClick=\{publish\}/)
  assert.doesNotMatch(action,/prepareReportSession|window\.location\.assign/)
  assert.match(issuer,/const editor=await prepareReportSession\(clientId,recordId\)/)
  assert.match(issuer,/window\.location\.assign\(editor\)/)
  assert.match(issuer,/onClick=\{prepare\}/)
  assert.doesNotMatch(issuer,/publishSavedClientReport|publishClientSession/)
}

const CLIENT = '95f4d6cd-dde8-4577-a089-4a74665f3d5a'
const DOCUMENT = '12a2f7a6-4bfa-4574-b431-e6d0b33255be'
const SESSION = '1c5dfd6b-a4d2-4b6c-a775-3783669394ae'

test('requestOwnerDocumentLink uses the correct protected one-report route without exposing legacy cabinet access',async()=>{
  const calls=[]
  const fetcher=async(path,options)=>{
    calls.push({path,options})
    return {ok:true,json:async()=>({selector:'scoped',secret:'opaque-secret'})}
  }
  assert.deepEqual(await requestOwnerDocumentLink(DOCUMENT,'recommendation',fetcher),
    {selector:'scoped',secret:'opaque-secret'})
  assert.equal(calls[0].path,'/admin/api/documents/'+DOCUMENT+'/session-link')
  assert.equal(calls[0].options.method,'POST')
  assert.equal(calls[0].options.credentials,'same-origin')
  assert.equal(calls[0].options.cache,'no-store')
  assert.deepEqual(await requestOwnerDocumentLink(DOCUMENT,'payment',fetcher),
    {selector:'scoped',secret:'opaque-secret'})
  assert.equal(calls[1].path,'/admin/api/documents/'+DOCUMENT+'/client-link')
})

test('unpublished, changed, expired and unavailable codes are retained separately',async()=>{
  for(const code of ['SESSION_NOT_PUBLISHED','SESSION_REPORT_CHANGED','SESSION_LINK_EXPIRED','SESSION_UNAVAILABLE']){
    const fetcher=async()=>({ok:false,status:code==='SESSION_UNAVAILABLE'?404:409,json:async()=>({error:code})})
    await assert.rejects(requestOwnerDocumentLink(DOCUMENT,'recommendation',fetcher),
      error=>error.code===code&&error.status===(code==='SESSION_UNAVAILABLE'?404:409))
  }
  await assert.rejects(requestOwnerDocumentLink(DOCUMENT,'recommendation',
    async()=>({ok:true,json:async()=>({selector:'missing-secret'})})),
    {code:'LINK_RESPONSE_INVALID'})
})

test('iPhone clipboard denial preserves link for another direct user tap',async()=>{
  assert.equal(await tryCopyOwnerLink('https://example.invalid/ru/client/session/x#secret',null),false)
  assert.equal(await tryCopyOwnerLink('url',{writeText:async()=>{throw new Error('NotAllowedError')}}),false)
  const wrote=[]
  assert.equal(await tryCopyOwnerLink('url',{writeText:async x=>{wrote.push(x)}}),true)
  assert.deepEqual(wrote,['url'])
})

test('preparing a client report uses existing idempotent draft creation, never publishes',async()=>{
  const calls=[]
  const fetcher=async(path,options)=>{
    calls.push({path,options})
    return {ok:true,json:async()=>({id:SESSION,existing:true})}
  }
  const url=await prepareReportSession(CLIENT,DOCUMENT,fetcher)
  assert.equal(url,'/admin/clients/'+CLIENT+'/sessions/'+SESSION)
  assert.equal(calls.length,1)
  assert.equal(calls[0].path,'/api/admin/clients/'+CLIENT+'/sessions')
  assert.equal(calls[0].options.credentials,'same-origin')
  assert.deepEqual(JSON.parse(calls[0].options.body),{documentId:DOCUMENT})
  assert.doesNotMatch(calls[0].options.body,/publish|grant|secret|clientId/)
  await assert.rejects(prepareReportSession('',DOCUMENT,fetcher),/SESSION_CLIENT_MISSING/)
  await assert.rejects(prepareReportSession(CLIENT,DOCUMENT,
    async()=>({ok:false,json:async()=>({error:'SESSION_UNAVAILABLE'})})),/SESSION_UNAVAILABLE/)
  assert.equal(calls.length,1,'no extra creation after a missing client')
})

test('saved report publishes explicitly while the separate link issuer keeps draft review and manual copy',()=>{
  const action=src('components/consultation-document-actions.jsx')
  const issuer=src('components/session-link-issuer.jsx')
  const result=src('components/consultation-result.jsx')
  const saved=src('components/admin-document-panels.jsx')
  const admin=src('app/admin/documents/[id]/page.js')
  const css=src('components/consultation-report.css')
  for(const component of [action,issuer]){
    assert.match(component,/requestOwnerDocumentLink/)
    assert.match(component,/tryCopyOwnerLink/)
    assert.match(component,/onFocus=\{event=>event\.target\.select\(\)\}/)
    assert.match(component,/readOnly/)
    assert.match(component,/Копировать ещё раз/)
    assert.match(component,/SESSION_NOT_PUBLISHED/)
    assert.match(component,/SESSION_UNAVAILABLE/)
  }
  assertOwnerEntryPoints(action,issuer)
  assert.match(result,/clientId=\{clientId\}/)
  assert.match(saved,/clientId=\{record\.clientId\}/)
  assert.match(admin,/clientId=\{record\.clientId\}/)
  assert.match(action,/status==='manual'/)
  assert.match(action,/status==='not-published'/)
  assert.match(action,/status==='expired'/)
  assert.match(action,/status==='unavailable'/)
  assert.match(action,/\{kind!=='payment'&&active&&clientId&&\s*<button[^>]*className="consultation-prepare-session"/)
  assert.match(css,/\.consultation-share-link-controls input/)
  assert.match(css,/font-size:16px/)
  assert.match(css,/min-height:46px/)
  assert.match(css,/@media\(max-width:520px\)/)
})

test('private server issues scoped invitation only after verifying published session and current report',()=>{
  const route=src('app/admin/api/documents/[id]/session-link/route.js')
  const prepare=src('app/api/admin/clients/[id]/sessions/route.js')
  const service=src('lib/clients/session-delivery-service.js')
  assert.match(route,/ownerDelivery\(request/)
  assert.match(route,/publishedOnly:true/)
  assert.match(route,/getPublishedClientSession/)
  assert.match(route,/published\?\.report\?\.id!==record\.id/)
  assert.match(route,/reportChanged\?'SESSION_REPORT_CHANGED':'SESSION_NOT_PUBLISHED'/)
  assert.match(route,/changeSessionGrant\(config,store,record\.clientId,row\.id,'copy'\)/)
  assert.doesNotMatch(route,/createClientSession|issuePrescriptionAccess|publishClientSession/)
  assert.match(prepare,/createClientSession/)
  assert.doesNotMatch(prepare,/publishClientSession/)
  assert.match(service,/if\(found\) return \{id:found\.id,existing:true\}/)
})


test('old iPhone owner session upgrades API cookie only through trusted same-origin bridge',async()=>{
  const calls=[]
  let count=0
  const fetcher=async(path,options)=>{
    calls.push({path,options})
    if(path==='/admin/api/recorder-auth') return {ok:true,status:200}
    count++
    if(count===1)return {ok:false,status:404,json:async()=>({error:'SESSION_UNAVAILABLE'})}
    return {ok:true,status:201,json:async()=>({id:SESSION,existing:true})}
  }
  const editor=await prepareReportSession(CLIENT,DOCUMENT,fetcher)
  assert.equal(editor,'/admin/clients/'+CLIENT+'/sessions/'+SESSION)
  assert.deepEqual(calls.map(call=>call.path),[
    '/api/admin/clients/'+CLIENT+'/sessions',
    '/admin/api/recorder-auth',
    '/api/admin/clients/'+CLIENT+'/sessions',
  ])
  assert.equal(calls[1].options.credentials,'same-origin')
  assert.equal(calls[1].options.method,'POST')
  assert.deepEqual(JSON.parse(calls[2].options.body),{documentId:DOCUMENT})
  assert.equal(calls.filter(call=>/publish|rotate|grant/.test(call.path)).length,0)
})

test('expired owner cookie cannot be upgraded through a failed bridge',async()=>{
  const calls=[]
  const fetcher=async(path,options)=>{
    calls.push(path)
    if(path==='/admin/api/recorder-auth')return {ok:false,status:401}
    return {ok:false,status:404,json:async()=>({error:'SESSION_UNAVAILABLE'})}
  }
  await assert.rejects(prepareReportSession(CLIENT,DOCUMENT,fetcher),/SESSION_UNAVAILABLE/)
  assert.equal(calls.length,2)
})


test('published session editor keeps the copy-again control and private link visible on iPhone',()=>{
 const studio=src('components/admin-session-studio.jsx')
 const css=src('components/client-session.module.css')
 assert.match(studio,/tryCopyOwnerLink\(url,navigator\.clipboard\)/)
 assert.match(studio,/tryCopyOwnerLink\(link,navigator\.clipboard\)/)
 assert.match(studio,/setLink\(url\)/)
 assert.match(studio,/className=\{styles\.sessionShareLinkReady\}/)
 assert.match(studio,/Копировать ещё раз/)
 assert.match(studio,/onFocus=\{e=>e\.target\.select\(\)\}/)
 assert.match(css,/\.sessionShareLinkReady\{/)
 assert.match(css,/@media\(max-width:540px\)/)
 assert.doesNotMatch(studio,/tryCopyOwnerLink[\s\S]*?case ['"]publish['"]/, 'copy retry does not publish')
})


test('owner entry contracts reject reversed publication/draft routes and wrong report identity',()=>{
  const action=src('components/consultation-document-actions.jsx')
  const issuer=src('components/session-link-issuer.jsx')
  for(const [before,after] of [
    ['await publishSavedClientReport(clientId,recordId)','await prepareReportSession(clientId,recordId)'],
    ['await publishSavedClientReport(clientId,recordId)','await publishSavedClientReport(recordId,clientId)'],
    ['onClick={publish}','onClick={copy}'],
  ]){
    assert.ok(action.includes(before),'action mutation target exists')
    assert.throws(()=>assertOwnerEntryPoints(action.replace(before,after),issuer),{name:'AssertionError'})
  }
  for(const [before,after] of [
    ['await prepareReportSession(clientId,recordId)','await publishSavedClientReport(clientId,recordId)'],
    ['window.location.assign(editor)','void editor'],
    ['onClick={prepare}','onClick={copy}'],
  ]){
    assert.ok(issuer.includes(before),'issuer mutation target exists')
    assert.throws(()=>assertOwnerEntryPoints(action,issuer.replace(before,after)),{name:'AssertionError'})
  }
})
