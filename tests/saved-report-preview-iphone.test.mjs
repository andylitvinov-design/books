import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { buildPrescriptionPdf } from '../lib/prescriptions/pdf.js'
import { getRemedy } from '../data/remedies.js'
import { remedyDescriptionBlocks } from '../lib/documents/report-appendices.js'

const sourceFile=path=>readFileSync(path,'utf8')

test('saved consultation opens current private full report in the same Safari tab',()=>{
  const panel=sourceFile('components/admin-document-panels.jsx')
  const actions=sourceFile('components/consultation-document-actions.jsx')
  const history=sourceFile('app/admin/clients/[id]/page.js')
  const reader=sourceFile('app/admin/documents/[id]/view/page.js')
  const routes=sourceFile('lib/consultations/result-actions.js')
  const pdfRoute=sourceFile('app/admin/api/documents/[id]/pdf/route.js')
  assert.ok(panel.includes('className="saved-document-preview-open"'))
  assert.ok(panel.includes('/view?locale='))
  assert.match(actions,/className="consultation-action-primary" href=\{urls\.open\}/)
  assert.match(actions,/href=\{urls\.previewPdf\}/,'PDF preview remains a separate link')
  assert.doesNotMatch(actions,/target="_blank"/,'iOS should not require popups')
  assert.ok(history.includes("document.kind === 'report' ? '' : '/view'"),
    'stored recommendations navigate directly to the current owner reader')
  assert.match(reader,/requireAdminRequest\(\)/,'the full reader remains owner-only')
  assert.ok(routes.includes('/view?locale='))
  assert.match(pdfRoute,/buildPrescriptionPdf/,'PDF is regenerated on demand')
  assert.match(pdfRoute,/no-store/,'private PDF is not cached by a CDN')
})

test('all saved report actions give iOS a dated filename instead of pdf.pdf',()=>{
  const panel=sourceFile('components/admin-document-panels.jsx')
  const actions=sourceFile('components/consultation-document-actions.jsx')
  const result=sourceFile('components/consultation-result.jsx')
  const ownerPage=sourceFile('app/admin/documents/[id]/page.js')
  const reader=sourceFile('app/admin/documents/[id]/view/page.js')
  const helper=sourceFile('lib/documents/report-filename.js')
  assert.match(panel,/download=\{record\.kind === 'payment'/)
  assert.match(actions,/download=\{pdfFilename\}/)
  assert.match(result,/dateIssued=\{dateIssued\}/)
  assert.match(ownerPage,/dateIssued=\{record\.dateIssued\}/)
  assert.match(reader,/reportPdfFilename\(doc\)/)
  assert.match(helper,/HolisticHouse_Report_/)
})

test('Russian headline wraps naturally at word boundaries on an iPhone',()=>{
  const css=sourceFile('components/consultation-report.css')
  const index=css.indexOf('/* iOS Safari client report:')
  assert.ok(index>=0)
  const excerpt=css.slice(index)
  assert.match(excerpt,/\.canonical-report-heading h1 \{/)
  assert.match(excerpt,/hyphens: none/)
  assert.match(excerpt,/word-break: normal/)
  assert.match(excerpt,/max-width: none/)
  assert.match(excerpt,/background-position: center, right 7px bottom 10px/)
  assert.match(excerpt,/@media print/)
})

test('long signed reports can start the complete appendix in unused continuation space',()=>{
  const pdfCode=sourceFile('lib/prescriptions/pdf.js')
  assert.match(pdfCode,/appendixOnSignedContinuation = layouts\.length > 1 && y >= 384/)
  assert.match(pdfCode,/if \(appendixOnSignedContinuation\)/)
  assert.match(pdfCode,/if \(y < 330\) startPage\(\)/,
    'keep remedy photograph and first paragraphs together')
  const remedy=getRemedy('ru','veratrum-album')
  const entries=remedyDescriptionBlocks(remedy.description).filter(x=>x.kind!=='space')
  const last=remedy.description.trim().split(/\r?\n/).filter(Boolean).at(-1).trim()
  assert.equal(entries.at(-1).text,last,'no author source lines are deleted')
})

test('the saved record regenerates an access-controlled, signed PDF without leaking internal notes',()=>{
  const report={
    patientName:'Synthetic Example Client',
    dateIssued:'2026-10-14',
    analysis:'Before the session: 3/10\nAfter the session: 6/10\nTarget: 7/10 (not a measurement)',
    additionalNotes:'SYNTHETIC USER OBSERVATION. '.repeat(30),
    followUpDate:'2026-10-25',
    internalNotes:'PRIVATE-ONLY-MUST-NOT-LEAK',
    recommendationType:'homeopathy',
    items:[{displayName:'Veratrum Album',remedySlug:'veratrum-album',
      remedyPath:'/en/homeopathy/remedies/veratrum-album'}],
  }
  const pdf=buildPrescriptionPdf(report,'en','https://example.invalid').toString('latin1')
  assert.match(pdf,/^%PDF-1\.7/)
  assert.match(pdf,/\/Signature Do Q/)
  assert.match(pdf,/\/RemedyPhoto1 Do Q/)
  assert.match(pdf,/SELF-RATED PROGRESS/)
  assert.doesNotMatch(pdf,/PRIVATE-ONLY-MUST-NOT-LEAK/)
})
