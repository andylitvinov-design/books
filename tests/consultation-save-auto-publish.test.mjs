import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
const src = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
const record = { id:'report-1', clientId:'client-1', kind:'recommendation', status:'active', updatedAt:'revision-1' }
function actions(path, bindings, names) {
  const source = src(path).replace(/^import .*$/gm, '').replace(/^export /gm, '')
  return new Function(...Object.keys(bindings), source + '\nreturn {'+names.join(',')+'}')(...Object.values(bindings))
}
function fixture() {
  const state = { published:{ media:['approved'], summary:'approved' }, draft:{ media:['approved','unpublished'], summary:'unpublished' }, saves:0 }
  const store = { findById:async()=>record, save:async()=>{state.saves++} }
  const bindings = {
    redirect:url=>{throw Object.assign(new Error('redirect'),{url})}, requireAdminRequest:async()=>true,
    getPrescriptionStore:()=>store, consultationSavingAvailable:()=>true,
    createConsultation:async()=>{state.saves++;return {recommendation:record}},
    updateConsultation:async()=>{state.saves++;return {recommendation:record}},
    createPrescription:()=>record, updatePrescription:()=>record,
    changeDocumentStatus:async()=>{},
    // Any reintroduced publication is a hard failure, including whole pending draft publication.
    autoPublishSavedClientReport:async()=>{throw new Error('UNAPPROVED_PUBLICATION')},
  }
  const data = new FormData(); data.set('languagePreference','en');data.set('clientId','client-1');data.set('itemsJson','[]');data.set('includeRecommendation','on');data.set('recommendationRevision','revision-1')
  return {state,bindings,data}
}
for (const name of ['createConsultationAction','updateConsultationAction']) test(`${name} saves source without publishing pending media/materials`,async()=>{
  const f=fixture();const before=structuredClone(f.state);const a=actions('app/admin/consultations/actions.js',f.bindings,[name]);
  await assert.rejects(name.startsWith('create')?a[name](null,f.data):a[name](record.id,null,f.data),e=>e.url===`/admin/consultations/${record.id}`)
  assert.equal(f.state.saves,1);assert.deepEqual(f.state.published,before.published);assert.deepEqual(f.state.draft,before.draft)
})
for (const name of ['createPrescriptionAction','updatePrescriptionAction']) test(`${name} keeps published projection unchanged`,async()=>{
  const f=fixture();const before=structuredClone(f.state);const a=actions('app/admin/prescriptions/actions.js',f.bindings,[name]);
  await assert.rejects(name.startsWith('create')?a[name](f.data):a[name](record.id,f.data),e=>e.url===`/admin/prescriptions/${record.id}`)
  assert.equal(f.state.saves,1);assert.deepEqual(f.state.published,before.published);assert.deepEqual(f.state.draft,before.draft)
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
  assert.match(src('components/consultation-document-actions.jsx'),/prepareReportSession/)
  assert.match(src('app/[locale]/client/session/[shareSelector]/page.js'),/authorizeSessionGuest/)
})

test('review entry is immediately available and prepares only the exact owner draft',async()=>{
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
  assert.match(action,/\{kind!=='payment'&&active&&clientId&&\s*<button[^>]*className="consultation-prepare-session"/)
  assert.match(action,/await prepareReportSession\(clientId,recordId\)/)
  const editor=src('components/report-video-materials-editor.jsx')
  assert.match(editor,/!editorUrl&&<button/)
  assert.match(editor,/window\.location\.assign\(await prepareReportSession\(clientId,documentId\)\)/)
  assert.doesNotMatch(editor,/action:['"]publish|publishClientSession/)
})
