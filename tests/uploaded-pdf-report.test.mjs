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
  assert.ok(route.indexOf('await auth.verified()')<route.indexOf('inlinePdf:'))
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
