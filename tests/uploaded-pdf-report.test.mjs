import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {normalizeDraft,clientPayload,emptySessionDraft,guestSessionProjection} from '../lib/clients/delivery-model.js'
const id='12345678-1234-4234-9234-123456789abc'
const item={assetId:id,scope:'client',title:'Report',transcript:'',role:'additional'}
const base={...emptySessionDraft(),reportFormat:'pdf',reportLocale:'ru',primaryPdfAssetId:id,media:[item]}
test('PDF mode persists only a client-owned published asset reference and never a generated report',()=>{
  const draft=normalizeDraft(base)
  assert.equal(clientPayload(draft).primaryPdfAssetId,id)
  assert.equal(clientPayload(draft).reportDocumentId,null)
  assert.equal(clientPayload(draft).reportFormat,'pdf')
  assert.equal(guestSessionProjection({...clientPayload(draft),id,occurredOn:'2026-11-24',report:null}).primaryPdfAssetId,id)
  assert.throws(()=>normalizeDraft({...base,reportDocumentId:id}))
  assert.throws(()=>normalizeDraft({...base,media:[{...item,scope:'practitioner'}]}))
  assert.throws(()=>normalizeDraft({...base,media:[{...item,role:'hidden'}]}))
  assert.throws(()=>normalizeDraft({...base,media:[]}))
  assert.throws(()=>normalizeDraft({...base,reportLocale:'xx'}))
  assert.equal(normalizeDraft({...base,primaryPdfAssetId:null,media:[]}).primaryPdfAssetId,null)
  assert.equal(Object.hasOwn(normalizeDraft(emptySessionDraft()),'reportFormat'),false)
})
test('publication defaults closed, saved media route authenticates before inline streaming',()=>{
  const source=readFileSync(new URL('../lib/clients/session-delivery-service.js',import.meta.url),'utf8')
  assert.match(source,/HH_PDF_REPORT_GOOGLE_CRM_READY/)
  assert.match(source,/PRIMARY_PDF_REQUIRED/)
  const route=readFileSync(new URL('../app/api/app/saved-sessions/[id]/media/[assetId]/route.js',import.meta.url),'utf8')
  const verified=route.indexOf('await auth.verified()'), stream=route.indexOf('inlinePdf:')
  assert.ok(verified>=0 && stream>verified,'verified account before inline PDF streaming')
  assert.match(route,/saved\.session\.primaryPdfAssetId===assetId/)
})

import {listClientReportDirectory} from '../lib/consultations/report-directory.js'
test('uploaded PDF and generated reports share the searchable and paginated archive',async()=>{
  const clientId='12345678-1234-4234-9234-123456789abc'
  const store={listClients:async()=>[{id:clientId,fullName:'Test client',status:'active',preferredLocale:'en'}],
    listClientDocuments:async()=>[{id:'generated',clientId,kind:'prescription',status:'active',dateIssued:'2026-11-23'}]}
  const listPdfSessions=async()=>[{id:'pdf',reportFormat:'pdf',reportLocale:'ru',title:'PDF',occurredOn:'2026-11-24',status:'draft'},{id:'unrelated',title:'Other session',occurredOn:'2026-11-24'}]
  const first=await listClientReportDirectory(store,{query:'test',pageSize:1,listPdfSessions})
  assert.equal(first.totalReports,2)
  assert.equal(first.rows[0].reportType,'pdf')
  assert.equal(first.rows[0].reportLocale,'ru')
  const second=await listClientReportDirectory(store,{page:2,pageSize:1,listPdfSessions})
  assert.equal(second.rows[0].reportType,'remedies')
})


test('uploaded PDF placement is validated and sealed, never exposed by guest projection',()=>{
 const goalId='12345678-1234-4234-9234-123456789abc'
 const draft=normalizeDraft({...base,programPlacement:{program:'goal',week:2,goalId}})
 assert.deepEqual(clientPayload(draft).programPlacement,{program:'goal',week:2,goalId})
 assert.equal(guestSessionProjection({...clientPayload(draft),id,occurredOn:'2026-11-24',report:null}).programPlacement,undefined)
 assert.throws(()=>normalizeDraft({...base,programPlacement:{program:'goal',week:9,goalId}}))
 assert.throws(()=>normalizeDraft({...base,programPlacement:{program:'clarity',week:1,goalId}}))
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 assert.match(read('components/pdf-report-start-form.jsx'),/<ReportProgramPicker/)
 assert.match(read('lib/app/daybook-report-index.js'),/session\.reportFormat==='pdf'\?'pdf'/)
 assert.match(read('app/[locale]/app/sessions/[id]/page.jsx'),/record\?\.programPlacement\?\?pdfPlacement/)
})


test('legacy cabinet cannot expose original PDF content or direct asset bytes',()=>{
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
 const page=read('app/[locale]/client/[selector]/sessions/[sessionId]/page.js')
 const route=read('app/api/client/[selector]/sessions/[sessionId]/media/[assetId]/route.js')
 assert.ok(page.indexOf("if(session.reportFormat==='pdf')return")>=0)
 assert.ok(page.indexOf("if(session.reportFormat==='pdf')return")<page.indexOf('<ClientSessionPage'))
 const gate=route.indexOf("if(session.reportFormat==='pdf')return privateJson")
 assert.ok(gate>=0&&gate<route.indexOf('const library='))
 assert.match(route,/export const HEAD=handle/)
 assert.match(route,/export const GET=handle/)
 assert.match(route,/export const POST=handle/)
})
