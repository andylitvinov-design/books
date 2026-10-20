import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { spawnSync } from 'node:child_process'
import { sourceFunction } from './helpers/source-contract-runtime.mjs'
import { AppError, requireUUID } from '../lib/assessments/contracts.js'
import { legacyDocumentProjection, legacyDocumentSourceHash } from '../lib/app/legacy-document.js'
import { savedResourcePath } from '../lib/app/client-handoff.js'
import { reportPdfFilename } from '../lib/documents/report-filename.js'

const id = '30000000-0000-4000-8000-000000000001'

test('Google Cabinet opens the full canonical report via an account-verified server page', async () => {
  const [appPage, viewer, workspace, recommendation, receipt, css, profile, management] = await Promise.all([
    readFile('app/[locale]/app/[[...path]]/page.jsx', 'utf8'),
    readFile('app/[locale]/app/document-view/[id]/page.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('components/prescription-document.jsx', 'utf8'),
    readFile('components/payment-document.jsx', 'utf8'),
    readFile('components/app/saved-document-reader.css', 'utf8'),
    readFile('components/app/profile-domains.jsx', 'utf8'),
    readFile('components/app/saved-document-management.jsx', 'utf8'),
  ])
  assert.match(appPage, /path\[0\] === 'documents'/)
  assert.match(appPage, /\/app\/document-view\//)
  assert.doesNotMatch(workspace, /function SavedRecommendationDocument\(/)
  assert.doesNotMatch(workspace, /function SavedPaymentDocument\(/)
  assert.doesNotMatch(workspace, /function SavedDocumentPage\(/)
  assert.match(viewer, /await createRequestAuth\(\{ cookies: cookieJar \}, config\)\.verified\(\)/)
  assert.match(viewer, /readSavedDocument\(config, store, actor, id, locale\)/)
  assert.match(viewer, /<PrescriptionDocument document=\{saved\.document\} locale=\{locale\} embedded/)
  assert.match(viewer, /<PaymentDocument document=\{saved\.document\} locale=\{locale\} embedded/)
  assert.match(viewer, /data-canonical-saved-document/)
  assert.match(viewer, /robots: \{ index: false, follow: false \}/)
  assert.match(viewer, /referrer: 'no-referrer'/)
  assert.match(viewer, /SavedDocumentManagement/)
  assert.match(management, /appFetch\('documents\//)
  assert.match(profile, /\/app\/document-view\//)
  assert.match(recommendation, /embedded = false/)
  assert.match(recommendation, /canonical-report-analysis/)
  assert.match(recommendation, /canonical-report-notes/)
  assert.match(recommendation, /canonical-progress/)
  assert.match(recommendation, /canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure/)
  assert.match(recommendation, /fullSource/)
  assert.match(recommendation, /includeDistanceHomeopathy/)
  assert.match(receipt, /embedded = false/)
  assert.match(css, /@media \(max-width: 600px\)/)
  assert.match(css, /@media print/)
})

test('saved source projection contains complete report sections but no practitioner-only data', () => {
  const record = {
    id, clientId: '30000000-0000-4000-8000-000000000002', kind: 'prescription',
    status: 'active', dateIssued: '2026-10-13', patientName: 'Synthetic Client',
    recommendationType: 'homeopathy', analysis: 'SYNTHETIC_ANALYSIS_SECTION',
    additionalNotes: 'SYNTHETIC_NEXT_STEPS', includeDistanceHomeopathy: true,
    generalInstructions: 'SYNTHETIC_GENERAL_GUIDANCE',
    internalNotes: 'PRIVATE_PRACTITIONER_ONLY', followUp: '2026-10-15',
    items: [{ displayNameOverride: 'Synthetic selection', itemType: 'homeopathy' }],
  }
  const source = legacyDocumentProjection(record, 'ru')
  assert.equal(source.analysis, record.analysis)
  assert.equal(source.additionalNotes, record.additionalNotes)
  assert.equal(source.includeDistanceHomeopathy, true)
  assert.equal(source.generalInstructions, record.generalInstructions)
  assert.equal(source.followUp, record.followUp)
  assert.equal(source.items[0].displayName, 'Synthetic selection')
  assert.equal('internalNotes' in source, false)
  assert.equal('clientId' in source, false)
  assert.equal(savedResourcePath('ru', 'legacy_document', id), '/ru/app/document-view/' + id)
  assert.doesNotMatch(reportPdfFilename(source), /Synthetic Client|30000000/)
})

test('PDF endpoint is gated by verified account and content hash, not the legacy bearer link', async () => {
  const [route, readFlow] = await Promise.all([
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('lib/app/legacy-document-flow.js', 'utf8'),
  ])
  const gate = route.indexOf('const actor = await auth.verified()')
  const pdf = route.indexOf("path[2] === 'pdf'")
  assert.ok(gate >= 0 && pdf > gate)
  assert.match(route, /readSavedDocument\(config, store, actor, path\[1\], locale\)/)
  assert.match(route, /Content-Disposition/)
  assert.match(route, /\.\.\.PRIVATE_HEADERS/)
  assert.match(readFlow, /account_id=\$2/)
  assert.match(readFlow, /record\.clientId !== ref\.legacy_client_id/)
  assert.match(readFlow, /legacyDocumentSourceHash\(record\) !== ref\.source_hash/)
  assert.match(readFlow, /DOCUMENT_UNAVAILABLE/)
  assert.doesNotMatch(route.slice(pdf, pdf + 1700), /authorizePrescription\(/)
})


test('embedded canonical reader renders full source inside native inline disclosures without private fields', () => {
  for (const locale of ['en','ru']) {
    const record={id,clientId:'30000000-0000-4000-8000-000000000002',kind:'prescription',status:'active',
      dateIssued:'2026-10-13',patientName:'Synthetic Client',recommendationType:'homeopathy',
      analysis:'SYNTHETIC_ANALYSIS <script>unsafe()</script>',additionalNotes:'SYNTHETIC_NOTES',
      generalInstructions:'SYNTHETIC_GENERAL',includeDistanceHomeopathy:true,
      internalNotes:'PRIVATE_PRACTITIONER_ONLY',
      items:[{displayNameOverride:'Synthetic selection',itemType:'homeopathy',
        instructions:'SYNTHETIC_AUTHORED_INSTRUCTIONS'},{displayNameOverride:'Unknown synthetic selection',itemType:'homeopathy'}]}
    const document=legacyDocumentProjection(record,locale)
    // The public content catalog is replaced only at its data boundary. Execute
    // and SSR the actual canonical component with the real safe projection.
    document.items[0].remedySlug='synthetic-remedy'
    document.items[0].remedyPath=`/${locale}/homeopathy/remedies/synthetic-remedy`
    const rendered=spawnSync(process.execPath,[new URL('./helpers/render-saved-prescription.mjs',import.meta.url).pathname],{
      input:JSON.stringify({document,locale}),encoding:'utf8',env:{...process.env,NODE_OPTIONS:''},
    })
    assert.equal(rendered.status,0,rendered.stderr)
    const {html,calls}=JSON.parse(rendered.stdout)
    assert.match(html,/<section class="prescription-shell canonical-shell">/)
    assert.equal((html.match(/<details class="canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure"/g)||[]).length,2)
    const cards=[...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/g)].map(match=>match[1])
    assert.match(cards[0],/<summary class="canonical-remedy-unified-summary">/)
    const summary=cards[0].slice(0,cards[0].indexOf('</summary>'))
    assert.match(summary,/Synthetic selection/)
    assert.match(summary,/SYNTHETIC_AUTHORED_INSTRUCTIONS/)
    assert.match(cards[0],/SYNTHETIC_COMPLETE_LIBRARY_DESCRIPTION/)
    assert.match(cards[0],/src="\/synthetic-source\.jpg"/)
    assert.match(cards[0],new RegExp('href="/'+locale+'/homeopathy/remedies/synthetic-remedy"'))
    assert.match(cards[1],/canonical-remedy-unified-unavailable/)
    assert.equal(calls.length,1)
    assert.equal(calls[0].fullSource,true)
    assert.equal(calls[0].expandSupplementary,true)
    assert.equal(calls[0].variant,'book')
    assert.equal(calls[0].showEssence,false)
    assert.equal(calls[0].locale,locale)
    assert.equal(calls[0].sourceUrl,'https://example.invalid/source')
    assert.equal(calls[0].remedy.description,'SYNTHETIC_COMPLETE_LIBRARY_DESCRIPTION')
    for(const value of ['SYNTHETIC_ANALYSIS','SYNTHETIC_NOTES','SYNTHETIC_GENERAL','SYNTHETIC_DISTANCE_GUIDE'])
      assert.ok(html.includes(value),value+' must not be abbreviated away')
    assert.match(html,/data-distance-embedded="true" data-distance-report="true"/)
    assert.match(html,/&lt;script&gt;unsafe\(\)&lt;\/script&gt;/)
    assert.doesNotMatch(html,/<script>|PRIVATE_PRACTITIONER_ONLY|30000000-0000-4000-8000-000000000002/)
  }
})

test('saved document destinations cannot be changed into unverified paths', () => {
  for(const value of ['', '../settings',id+'/../settings','https://example.invalid',id+'?token=x'])
    assert.throws(()=>savedResourcePath('en','legacy_document',value),/Invalid saved resource destination/)
  assert.throws(()=>savedResourcePath('en','arbitrary-kind',id),/Invalid saved resource destination/)
  assert.equal(savedResourcePath('//external.invalid','legacy_document',id),'/en/app/document-view/'+id)
})


test('actual saved reader refuses wrong owners and changed source provenance before opening', async () => {
  const record={id,clientId:'30000000-0000-4000-8000-000000000002',kind:'prescription',status:'active',
    dateIssued:'2026-10-13',patientName:'Synthetic Client',recommendationType:'homeopathy',
    analysis:'SYNTHETIC_ANALYSIS',internalNotes:'PRIVATE_PRACTITIONER_ONLY',items:[]}
  const owner='30000000-0000-4000-8000-000000000003'
  async function attempt({actorId=owner,source=record,savedId=id}={}) {
    const queries=[]
    const reference={id,source_document_id:record.id,legacy_client_id:record.clientId,
      source_hash:legacyDocumentSourceHash(record),document_kind:'recommendation',occurred_on:'2026-10-13'}
    const reader=sourceFunction('lib/app/legacy-document-flow.js','readSavedDocument',{
      requireUUID,AppError,legacyDocumentSourceHash,legacyDocumentProjection,
      transaction:async (config,actor,callback)=>callback({query:async (sql,params)=>{
        queries.push(sql)
        assert.match(sql,/where id=\$1 and account_id=\$2 and removed_at is null/)
        assert.deepEqual(Array.from(params),[savedId,actor.id])
        return {rows:actor.id===owner?[reference]:[]}
      }}),
    })
    const store={findById:async sourceId=>{assert.equal(sourceId,record.id);return source}}
    let result,error
    try {result=await reader({},store,{id:actorId},savedId,'en')} catch(caught) {error=caught}
    return {result,error,queries}
  }
  const valid=await attempt()
  assert.equal(valid.error,undefined)
  assert.equal(valid.queries.length,2)
  assert.equal(valid.result.document.analysis,'SYNTHETIC_ANALYSIS')
  assert.equal('internalNotes' in valid.result.document,false)
  assert.equal('clientId' in valid.result.document,false)
  const other=await attempt({actorId:'30000000-0000-4000-8000-000000000004'})
  assert.match(other.error.message,/NOT_FOUND/)
  assert.equal(other.queries.length,1)
  for(const source of [null,{...record,status:'archived'},{...record,clientId:'another-client'},
    {...record,analysis:'CHANGED_SOURCE'}]) {
    const value=await attempt({source})
    assert.match(value.error.message,/DOCUMENT_UNAVAILABLE/)
    assert.equal(value.queries.length,1,'unavailable source must never be marked opened')
  }
  const invalid=await attempt({savedId:'../another-document'})
  assert.ok(invalid.error)
  assert.equal(invalid.queries.length,0)
})
