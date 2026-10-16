import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { synchronizeSavedReport } from '../lib/consultations/synchronize-saved-report.js'

const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const REPORT='b9ae1f6d-0cf2-4d46-aa80-b2aa37c86d22'
const SESSION='1ef902ca-37f8-4fd7-a720-8352f1d072e5'
const CLIENT='65067674-3aa7-40c8-8c4b-0a096732f9f1'
const original={id:REPORT,clientId:CLIENT,kind:'recommendation',status:'active',
  updatedAt:'2026-10-15T23:21:00Z'}

function fixture(options={}) {
  const calls=[]
  const draft={
    title:'Your personal consultation',summary:'Approved personal message',
    reportDocumentId:options.reportDocumentId===undefined?REPORT:options.reportDocumentId,
    plan:{focus:'',nextStep:'',takeaways:[],practices:[],
      additionalRecommendations:'',resources:[]},
    media:[{assetId:'synthetic-private-audio',scope:'client',role:'personal'}],
  }
  const state={owner:{status:options.archived?'archived':'draft',draft,draftRevision:3},
    persisted:options.persisted||original,published:null}
  const ops={
    async createClientSession(c,s,id,{documentId}) {
      calls.push(['create',id,documentId])
      assert.equal(id,CLIENT);assert.equal(documentId,REPORT)
      return {id:SESSION,existing:Boolean(options.existing)}
    },
    async getOwnerSession(c,s,id,sessionId) {
      calls.push(['read-owner'])
      assert.equal(sessionId,SESSION)
      return state.owner
    },
    async saveOwnerDraft(c,s,id,sessionId,{expectedRevision,draft:next}) {
      calls.push(['attach-source'])
      assert.equal(expectedRevision,3)
      assert.deepEqual(next.media,draft.media)
      assert.deepEqual(next.plan,draft.plan)
      state.owner={...state.owner,draft:next,draftRevision:4}
    },
    async publishClientSession(c,s,id,sessionId) {
      calls.push(['publish'])
      if(options.publishFail)throw new Error('PRIVATE_STORAGE_UNAVAILABLE')
      state.published={id:SESSION,status:'published',
        report:options.badPublished ? null:{id:REPORT},
        media:[...state.owner.draft.media]}
    },
    async getPublishedClientSession() {
      calls.push(['verify'])
      return state.published
    },
  }
  return {
    calls,state,
    args:{store:{findById:async id=>{calls.push(['read-record']);return state.persisted}},
      config:{synthetic:true},operations:ops},
  }
}

test('new saved report creates and privately publishes exactly once, no second form',async()=>{
  const f=fixture()
  const result=await synchronizeSavedReport(original,f.args)
  assert.deepEqual(result,{status:'published',sessionId:SESSION})
  assert.deepEqual(f.calls.map(([name])=>name),['read-record','create','read-owner','publish','verify'])
  assert.deepEqual(f.state.published.media,f.state.owner.draft.media)
})

test('editing existing published report refreshes fingerprint without rotating the existing invitation',async()=>{
  const f=fixture({existing:true})
  const result=await synchronizeSavedReport(original,f.args)
  assert.equal(result.sessionId,SESSION)
  assert.equal(f.calls.filter(([name])=>name==='create').length,1)
  assert.equal(f.calls.filter(([name])=>name==='publish').length,1)
  assert.ok(!f.calls.some(([name])=>['grant','rotate','send','notify'].includes(name)))
  assert.deepEqual(f.state.owner.draft.media,[{assetId:'synthetic-private-audio',scope:'client',role:'personal'}])
})

test('an empty existing session is linked to the exact report while preserving media and plan',async()=>{
  const f=fixture({reportDocumentId:null,existing:true})
  const result=await synchronizeSavedReport(original,f.args)
  assert.equal(result.status,'published')
  assert.deepEqual(f.calls.map(x=>x[0]),['read-record','create','read-owner','attach-source','publish','verify'])
  assert.equal(f.state.owner.draft.reportDocumentId,REPORT)
})

test('draft/revoked/unlinked reports are not automatically exposed',async()=>{
  for(const patch of [{status:'draft'},{status:'revoked'},{clientId:undefined},{kind:'report'},{kind:'payment'}]){
    const f=fixture()
    const result=await synchronizeSavedReport({...original,...patch},f.args)
    assert.ok(['skipped','unlinked'].includes(result.status))
    assert.equal(f.calls.length,0)
  }
})

test('wrong client, stale source or another consultation in the slot fails closed',async()=>{
  for(const options of [
    {persisted:{...original,clientId:'other-client'}},
    {persisted:{...original,updatedAt:'2026-10-15T23:22:00Z'}},
    {archived:true},
    {reportDocumentId:'a different report',existing:true},
  ]){
    const f=fixture(options)
    await assert.rejects(synchronizeSavedReport(original,f.args),
      /REPORT_VERSION_CHANGED|REPORT_SESSION_UNAVAILABLE|REPORT_SESSION_MISMATCH/)
    assert.ok(!f.calls.some(([name])=>name==='publish'))
  }
})

test('failed publication or missing verified published report is never reported as success',async()=>{
  for(const key of ['publishFail','badPublished']){
    const f=fixture({[key]:true})
    await assert.rejects(synchronizeSavedReport(original,f.args),
      /PRIVATE_STORAGE_UNAVAILABLE|REPORT_PUBLICATION_NOT_VERIFIED/)
  }
})

test('main consultation create/update and standalone edit save trigger private auto-publish',()=>{
  const consultation=src('app/admin/consultations/actions.js')
  const prescription=src('app/admin/prescriptions/actions.js')
  const page=src('app/admin/consultations/[id]/page.js')
  const result=src('components/consultation-result.jsx')
  const form=src('components/consultation-form.jsx')
  const publisher=src('lib/clients/report-auto-publish.js')
  assert.match(consultation,/autoPublishSavedClientReport\(pair\.recommendation,store\)/)
  assert.match(consultation,/await updateConsultation\(recommendation,payment,values,\{store\}\)/)
  assert.match(consultation,/values\.includeRecommendation[\s\S]*?autoPublishSavedClientReport\(result\.recommendation,store\)/)
  assert.match(consultation,/retryConsultationPublicationAction/)
  assert.match(prescription,/await store\.save\(record,existing\)[\s\S]*autoPublishSavedClientReport\(record,store\)/)
  assert.match(publisher,/deliveryEnabled\(\)/)
  assert.match(publisher,/inspectSavedClientReportPublication/)
  assert.match(page,/inspectSavedClientReportPublication\(recommendation,store\)/)
  assert.match(result,/publication==='published'/)
  assert.match(result,/Отчёт сохранён и опубликован для клиента/)
  assert.match(result,/Повторить публикацию отчёта/)
  assert.match(form,/Сохранить и опубликовать/)
  assert.match(form,/Save & publish privately/)
  assert.match(consultation,/publication=\$\{publication\.status\}/)
  assert.doesNotMatch(consultation,/changeSessionGrant\(/)
})

test('published snapshot remains one private client session, no public YouTube or Drive playback',()=>{
  const publisher=src('lib/clients/report-auto-publish.js')
  const synchronizer=src('lib/consultations/synchronize-saved-report.js')
  const route=src('app/admin/api/documents/[id]/session-link/route.js')
  const guest=src('app/[locale]/client/session/[shareSelector]/page.js')
  assert.match(publisher,/import 'server-only'/)
  assert.match(synchronizer,/getPublishedClientSession/)
  assert.match(synchronizer,/published\.report\?\.id!==record\.id/)
  assert.doesNotMatch(synchronizer,/changeSessionGrant|issuePrescriptionAccess|uploadToYouTube/)
  assert.match(route,/ownerDelivery/)
  assert.match(route,/changeSessionGrant/)
  assert.match(guest,/authorizeSessionGuest/)
})
