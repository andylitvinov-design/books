import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { parseReportMaterialIds, stageReportMaterials } from '../lib/consultations/report-material-staging.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('both new and edit reports converge on the consultation form and material blocks', () => {
  const entry = read('app/admin/reports/new/page.js')
  const fresh = read('app/admin/consultations/new/page.js')
  const edit = read('app/admin/consultations/[id]/edit/page.js')
  assert.match(entry, /\/admin\/consultations\/new/)
  assert.match(fresh, /<ConsultationForm\b/)
  assert.match(edit, /<ConsultationForm\b/)
  assert.match(fresh, /<NewReportMaterials/)
  assert.match(edit, /<ReportVideoMaterialsEditor/)
  assert.match(edit, /<SessionPhotoUploader/)
  assert.match(read('components/new-report-materials.jsx'), /form="consultation-report-form"/)
  assert.match(read('components/consultation-form.jsx'), /id="consultation-report-form"/)
})

test('reject malformed, duplicate, excessive and non-UUID material selections', () => {
  const id = randomUUID()
  assert.deepEqual(parseReportMaterialIds(null), [])
  assert.deepEqual(parseReportMaterialIds(''), [])
  assert.deepEqual(parseReportMaterialIds(JSON.stringify([id])), [id])
  for(const raw of ['not-json','{}',JSON.stringify([id,id]),JSON.stringify(['bad-id']),
    JSON.stringify(Array.from({length:25},()=>randomUUID()))])
    assert.throws(()=>parseReportMaterialIds(raw), /INVALID_SESSION_MATERIALS/)
})

test('stages selections without changing the existing draft or publishing', async () => {
  const report={id:randomUUID(),clientId:randomUUID()}, materialIds=[randomUUID()]
  const actions=[]
  const status=await stageReportMaterials({config:{},store:{},report,materialIds},{
    createSession:async (_cfg,_store,clientId,{documentId})=>{
      assert.equal(clientId,report.clientId);assert.equal(documentId,report.id)
      actions.push('create');return {id:randomUUID()}
    },
    getSession:async()=>{
      actions.push('get');return {draftRevision:2,draft:{
        reportDocumentId:report.id,title:'Preserve',summary:'Notes',media:[{assetId:randomUUID()}],
        plan:{focus:'Existing personal plan',resources:[]}}}
    },
    saveDraft:async (_config,_store,_client,_session,{expectedRevision,draft})=>{
      actions.push('save')
      assert.equal(expectedRevision,2)
      assert.equal(draft.title,'Preserve')
      assert.equal(draft.media.length,1)
      assert.equal(draft.plan.focus,'Existing personal plan')
      assert.deepEqual(draft.plan.materialIds,materialIds)
    },
  })
  assert.equal(status.status,'draft')
  assert.deepEqual(actions,['create','get','save'])
})

test('rejects draft associated with another report without mutation', async () => {
  const report={id:randomUUID(),clientId:randomUUID()}
  let wrote=false
  await assert.rejects(()=>stageReportMaterials({config:{},store:{},report,materialIds:[randomUUID()]},{
    createSession:async()=>({id:randomUUID()}),
    getSession:async()=>({draftRevision:1,draft:{reportDocumentId:randomUUID()}}),
    saveDraft:async()=>{wrote=true},
  }), /REPORT_SESSION_MISMATCH/)
  assert.equal(wrote,false)
})
