import test from 'node:test'
import {parseReportMaterialIds} from '../lib/consultations/report-material-staging.js'
import {parseDaoResourceScore} from '../lib/consultations/dao-resource-stage.js'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const record = { id:'report-1', clientId:'client-1', kind:'recommendation', status:'active', updatedAt:'revision-1' }
function actions(path, bindings, names) {
  const source = src(path).replace(/^import .*$/gm, '').replace(/^export /gm, '')
  return new Function(...Object.keys(bindings), source + '\nreturn {'+names.join(',')+'}')(...Object.values(bindings))
}
function fixture() {
  const state = { published:{ media:['approved'], summary:'approved' }, draft:{ media:['approved','unpublished'], summary:'unpublished' }, saves:0, materialLookups:0, materialStages:0 }
  const store = { findById:async()=>record, save:async()=>{state.saves++} }
  const bindings = {
    redirect:url=>{throw Object.assign(new Error('redirect'),{url})}, requireAdminRequest:async()=>true,
    getPrescriptionStore:()=>store, consultationSavingAvailable:()=>true,
    createConsultation:async()=>{state.saves++;return {recommendation:record}},
    updateConsultation:async()=>{state.saves++;return {recommendation:record}},
    createPrescription:()=>record, updatePrescription:()=>record,
    changeDocumentStatus:async()=>{},
    parseReportMaterialIds, parseDaoResourceScore,
    transaction:async()=>{state.materialLookups++;throw new Error('UNEXPECTED_MATERIAL_LOOKUP')},
    stageReportMaterials:async()=>{state.materialStages++;throw new Error('UNEXPECTED_MATERIAL_STAGING')},
    // Any reintroduced publication is a hard failure, including whole pending draft publication.
    autoPublishSavedClientReport:async()=>{throw new Error('UNAPPROVED_PUBLICATION')},
  }
  const data = new FormData(); data.set('languagePreference','en');data.set('clientId','client-1');data.set('itemsJson','[]');data.set('includeRecommendation','on');data.set('recommendationRevision','revision-1')
  return {state,bindings,data}
}
for (const name of ['createConsultationAction','updateConsultationAction']) test(`${name} saves source without publishing pending media/materials`,async()=>{
  const f=fixture();const before=structuredClone(f.state);const a=actions('app/admin/consultations/actions.js',f.bindings,[name]);
  await assert.rejects(name.startsWith('create')?a[name](null,f.data):a[name](record.id,null,f.data),e=>e.url===`/admin/consultations/${record.id}`)
  assert.equal(f.state.saves,1);assert.equal(f.state.materialLookups,0);assert.equal(f.state.materialStages,0);assert.deepEqual(f.state.published,before.published);assert.deepEqual(f.state.draft,before.draft)
})
for (const name of ['createPrescriptionAction','updatePrescriptionAction']) test(`${name} keeps published projection unchanged`,async()=>{
  const f=fixture();const before=structuredClone(f.state);const a=actions('app/admin/prescriptions/actions.js',f.bindings,[name]);
  await assert.rejects(name.startsWith('create')?a[name](f.data):a[name](record.id,f.data),e=>e.url===`/admin/prescriptions/${record.id}`)
  assert.equal(f.state.saves,1);assert.equal(f.state.materialLookups,0);assert.equal(f.state.materialStages,0);assert.deepEqual(f.state.published,before.published);assert.deepEqual(f.state.draft,before.draft)
})
test('ordinary save actions retain authorization and stale consultation protection',async()=>{
  const f=fixture();f.bindings.requireAdminRequest=async()=>false
  const a=actions('app/admin/consultations/actions.js',f.bindings,['createConsultationAction']);assert.match((await a.createConsultationAction(null,f.data)).error,/sign in/);assert.equal(f.state.saves,0)
  f.bindings.requireAdminRequest=async()=>true;f.data.set('recommendationRevision','stale')
  const b=actions('app/admin/consultations/actions.js',f.bindings,['updateConsultationAction']);assert.match((await b.updateConsultationAction(record.id,null,f.data)).error,/changed/);assert.equal(f.state.saves,0)
})
test('no ordinary Save or retry shortcut can invoke publisher; only read-only status remains',()=>{
  for(const p of ['app/admin/consultations/actions.js','app/admin/prescriptions/actions.js','lib/clients/report-auto-publish.js']) assert.doesNotMatch(src(p),/autoPublishSavedClientReport|synchronizeSavedReport|publishClientSession|retry\w+PublicationAction/)
  assert.equal(existsSync(new URL('../lib/consultations/synchronize-saved-report.js',import.meta.url)),false)
  assert.match(src('lib/clients/report-auto-publish.js'),/inspectSavedClientReportPublication/)
  assert.doesNotMatch(src('components/consultation-form.jsx'),/Save & publish|Сохранить и опубликовать/)
  assert.match(src('components/consultation-form.jsx'),/Saving does not publish changes/)
  assert.match(src('components/consultation-document-actions.jsx'),/publishSavedClientReport/)
  assert.match(src('app/[locale]/client/session/[shareSelector]/page.js'),/authorizeSessionGuest/)
})

test('materials editor retains a draft-only entry while report preview offers direct publication',async()=>{
  const {prepareReportSession}=await import('../lib/consultations/owner-report-sharing.js')
  const calls=[];const session='a18b8d2a-e6e3-4b11-baad-f9401a2c16a3'
  const url=await prepareReportSession('client-1','report-1',async(path,options)=>{
    calls.push({path,...options});return {ok:true,status:200,json:async()=>({id:session})}
  })
  assert.equal(url,`/admin/clients/client-1/sessions/${session}`)
  assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/admin/clients/client-1/sessions')
  assert.deepEqual(JSON.parse(calls[0].body),{documentId:'report-1'})
  assert.equal(calls[0].credentials,'same-origin');assert.equal(calls[0].method,'POST')
  const action=src('components/consultation-document-actions.jsx')
  assert.match(action,/await publishSavedClientReport\(clientId,recordId\)/)
  assert.match(action,/\{kind!=='payment'&&active&&clientId&&\s*<button[^>]*className="consultation-prepare-session"/)
  assert.match(action,/ru\?'Опубликовать':'Publish'/)
  assert.doesNotMatch(action,/Review and publish client page|Проверить и опубликовать страницу клиента|window\.location\.assign/)
  const editor=src('components/report-video-materials-editor.jsx')
  assert.match(editor,/!editorUrl&&<button/)
  assert.match(editor,/window\.location\.assign\(await prepareReportSession\(clientId,documentId\)\)/)
  assert.doesNotMatch(editor,/action:['"]publish|publishClientSession/)
})

const SESSION_ID='a18b8d2a-e6e3-4b11-baad-f9401a2c16a3'
const HASH='f'.repeat(64)
function ownerPublishFixture({reportId='report-1',sourceId='report-1',revision=4,postStatus=200}={}) {
  const calls=[]
  const fetcher=async(path,options={})=>{
    calls.push({path,...options})
    if(path==='/api/admin/clients/client-1/sessions')return {
      ok:true,status:201,json:async()=>({id:SESSION_ID}),
    }
    if(path===`/api/admin/clients/client-1/sessions/${SESSION_ID}` && options.method==='GET')return {
      ok:true,status:200,json:async()=>({session:{
        draftRevision:revision,draft:{reportDocumentId:reportId},
        publicationSource:{reportDocumentId:sourceId,reportFingerprint:HASH},
      }}),
    }
    if(path===`/api/admin/clients/client-1/sessions/${SESSION_ID}` && options.method==='POST')return {
      ok:postStatus===200,status:postStatus,json:async()=>postStatus===200?
        ({id:SESSION_ID,revision}):({error:'REPORT_VERSION_CHANGED'}),
    }
    throw new Error('Unexpected fetch: '+path)
  }
  return {calls,fetcher}
}

test('one tap publishes directly using the exact owner report fingerprint and draft revision',async()=>{
  const {publishSavedClientReport}=await import('../lib/consultations/owner-report-sharing.js')
  const f=ownerPublishFixture()
  const result=await publishSavedClientReport('client-1','report-1',f.fetcher)
  assert.deepEqual(result,{sessionId:SESSION_ID,revision:4})
  assert.deepEqual(f.calls.map(x=>x.method),['POST','GET','POST'])
  assert.equal(f.calls[0].credentials,'same-origin')
  assert.equal(f.calls[1].cache,'no-store')
  const request=JSON.parse(f.calls[2].body)
  assert.deepEqual(request,{action:'publish',expectedRevision:4,
    expectedReportDocumentId:'report-1',expectedReportFingerprint:HASH})
  assert.equal(f.calls[2].credentials,'same-origin')
  assert.equal(f.calls[2].cache,'no-store')
})

test('one tap refuses to publish a different report attached to the same session',async()=>{
  const {publishSavedClientReport}=await import('../lib/consultations/owner-report-sharing.js')
  for(const options of [{reportId:'other-report'},{sourceId:'other-report'},{revision:0}]){
    const f=ownerPublishFixture(options)
    await assert.rejects(publishSavedClientReport('client-1','report-1',f.fetcher),
      /REPORT_SESSION_MISMATCH|PUBLICATION_REVIEW_REQUIRED/)
    assert.deepEqual(f.calls.map(x=>x.method),['POST','GET'])
  }
})

test('concurrent report edit blocks publication and surfaces its version conflict',async()=>{
  const {publishSavedClientReport}=await import('../lib/consultations/owner-report-sharing.js')
  const f=ownerPublishFixture({postStatus:409})
  await assert.rejects(publishSavedClientReport('client-1','report-1',f.fetcher),
    e=>e.code==='REPORT_VERSION_CHANGED'&&e.status===409)
  assert.deepEqual(f.calls.map(x=>x.method),['POST','GET','POST'])
})

for(const name of ['createConsultationAction','updateConsultationAction']) test(`${name} validates the actual optional Dao parser before saving`,async()=>{
  for(const invalid of ['-1','10.1','4.55','not-a-score']){
    const f=fixture(),before=structuredClone(f.state)
    f.data.set('daoResourceScore',invalid)
    const a=actions('app/admin/consultations/actions.js',f.bindings,[name])
    const result=await (name.startsWith('create')?a[name](null,f.data):a[name](record.id,null,f.data))
    assert.equal(result.error,'Enter a Wu Xing resource score from 0 to 10 with at most one decimal place.')
    assert.deepEqual(f.state,before,'invalid input must neither save nor publish')
  }
})

test('new consultation rejects malformed material IDs before saving or invoking delivery services',async()=>{
  for(const invalid of ['not-json','["not-a-uuid"]','{}']){
    const f=fixture(),before=structuredClone(f.state)
    f.data.set('materialIdsJson',invalid)
    const a=actions('app/admin/consultations/actions.js',f.bindings,['createConsultationAction'])
    const result=await a.createConsultationAction(null,f.data)
    assert.equal(result.error,'The selected materials are unavailable. Refresh the library selection and try again.')
    assert.deepEqual(f.state,before)
  }
})
