import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { generatePractitionerReportPdf } from '../lib/profile/practitioner-report-pdf.js'

const src = path => readFile(path, 'utf8')

test('both authorized cabinets expose Personal Analysis and the two existing first-party free services', async () => {
  const [google, route, legacy, legacyRoute, panel, style] = await Promise.all([
    src('components/app/app-workspace.jsx'),
    src('app/[locale]/app/[[...path]]/page.jsx'),
    src('components/client-cabinet.jsx'),
    src('app/[locale]/client/[selector]/page.js'),
    src('components/app/personal-analysis-panel.jsx'),
    src('components/app/personal-analysis.css'),
  ])
  assert.match(route, /'analysis'/)
  assert.match(google, /\['analysis', locale === 'ru' \? 'Личный анализ' : 'Personal analysis', '\/analysis'\]/)
  assert.match(google, /page === 'analysis' && <PersonalAnalysisPanel/)
  assert.match(google, /<Link href=\{root \+ '\/analysis'\}/)
  assert.match(google, /aria-current=\{page === 'analysis' \? 'page'/)
  assert.match(legacy, /client-cabinet-sections/)
  assert.match(legacy, /\?view=analysis/)
  assert.match(legacy, /<PersonalAnalysisPanel locale=\{locale\} reports=\{personalReports\} legacyReports=\{legacyReports\} selector=\{selector\}/)
  assert.match(legacy, /personalReports = assessments\.filter\(item => item\.kind === 'research_result'\)/)
  assert.match(legacy, /legacyReports = documents\.filter\(document => document\.type === 'report'\)/)
  assert.match(legacyRoute, /view = \(await searchParams\)\?\.view === 'analysis'/)
  assert.match(panel, /services\/free-situation-review/)
  assert.match(panel, /services\/dao-health-profile/)
  assert.match(panel, /Я — Цель — Проблема/)
  assert.match(panel, /У-Син/)
  assert.match(panel, /not a medical diagnosis/)
  assert.match(panel, /БЕСПЛАТНО/)
  assert.match(style, /@media \(max-width:760px\)/)
  assert.match(style, /\.hh-analysis-offers \{ grid-template-columns: 1fr/)
})

test('Google Cabinet lists only explicitly saved practitioner reports and downloads authenticated current versions', async () => {
  const [workspace, panel, flow, view] = await Promise.all([
    src('components/app/app-workspace.jsx'),
    src('components/app/personal-analysis-panel.jsx'),
    src('lib/app/report-flow.js'),
    src('components/app/shared-report-view.jsx'),
  ])
  assert.match(workspace, /reports=\{reportTimeline\(data\.savedReports\)\}/)
  assert.match(panel, /\/api\/app\/reports\//)
  assert.match(panel, /credentials: 'same-origin'/)
  assert.match(panel, /response\.ok/)
  assert.match(panel, /DownloadPractitionerReport/)
  assert.match(panel, /item\.available === false/)
  assert.match(flow, /bound_account_id/)
  assert.match(view, /save-intents/)
  assert.match(view, /Save this report to my Cabinet/)
  assert.match(view, /DownloadPractitionerReport report=\{report\}/)
  assert.doesNotMatch(view, /sessionStorage|localStorage/)
})

test('private client report download is isolated by the real cabinet authorization and returns no owner-only fields', async () => {
  const pathname = '../app/api/client/[selector]/assessments/[assessmentId]/route.js'
  const raw = (await readFile(new URL(pathname, import.meta.url), 'utf8'))
    .replace(/^import .* from .*\n/gm, '').replace(/^export /gm, '')
  let lookedUp = 0
  const header = { 'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow', 'Referrer-Policy':'no-referrer' }
  const factory = auth => new Function('NextResponse','authorizeCabinetRequest','clientAssessmentDetail','privateHeaders', raw + '\nreturn { GET }')(
    Response, auth, async (_store, clientId, id) => {
      lookedUp++
      assert.equal(clientId, 'client-a')
      assert.equal(id, 'test-report-a')
      return {
        id, title:'Synthetic Resource Report',kind:'research_result',occurredOn:'2026-10-10',
        description:'Safe client-visible text', originalResult:'Visible outcome',
        practitionerComment:'Private to this client', relatedDocuments:[{ id:'other-doc-id' }],
      }
    },header,
  ).GET
  const opts = { params: Promise.resolve({selector:'selector-a',assessmentId:'test-report-a'}) }
  const unauthorized = await factory(async () => undefined)(new Request('https://preview.invalid/api/client/selector-a/assessments/test-report-a'),opts)
  assert.equal(unauthorized.status,404)
  assert.equal(lookedUp,0)
  const permitted = await factory(async () => ({client:{id:'client-a'},store:{}}))(new Request('https://preview.invalid/api/client/selector-a/assessments/test-report-a'),opts)
  assert.equal(permitted.status,200)
  assert.match(permitted.headers.get('cache-control'),/private, no-store/)
  assert.equal(permitted.headers.get('referrer-policy'),'no-referrer')
  assert.match(permitted.headers.get('vary'),/Cookie/)
  const result = await permitted.json()
  assert.equal(result.report.originalResult,'Visible outcome')
  assert.equal(result.report.relatedDocuments,undefined)
  assert.equal(result.report.clientId,undefined)
  assert.equal(result.report.notes,undefined)
})

test('client-side PDF preserves bilingual private report fields without any third-party fetch', async () => {
  const originalDocument = globalThis.document
  const originalAtob = globalThis.atob
  let pages = 0
  globalThis.document = {
    createElement: name => {
      assert.equal(name,'canvas')
      return {
        width: 0, height: 0,
        getContext() {
          return {
            fillStyle: '', font: '',
            fillRect() {}, fillText() {},
            measureText(value) { return { width: String(value).length * 15 } },
          }
        },
        toDataURL() {
          pages++
          return 'data:image/jpeg;base64,' + Buffer.from([0xff,0xd8,0xff,0xd9]).toString('base64')
        },
      }
    },
  }
  globalThis.atob = source => Buffer.from(source,'base64').toString('binary')
  try {
    const pdf = await generatePractitionerReportPdf({
      title:'Персональный анализ У-Син',
      occurredOn:'2026-10-11',
      kind:'research_result',
      description:'Личный ресурс',
      originalResult:'Вода • Дерево • Огонь • Земля • Металл',
      practitionerComment:'Рекомендации для размышления',
    },'ru')
    assert.equal(pdf.type,'application/pdf')
    assert.ok(pages>=1)
    const bytes=Buffer.from(await pdf.arrayBuffer())
    assert.equal(bytes.subarray(0,8).toString('ascii'),'%PDF-1.4')
    assert.match(bytes.toString('latin1'),/\/Type \/Pages/)
  } finally {
    globalThis.document = originalDocument
    globalThis.atob = originalAtob
  }
})

test('Personal Analysis titles use verified current report sources without marking them read', async () => {
  const [api, flow, panel, oldCabinet, pdf] = await Promise.all([
    src('app/api/app/[...path]/route.js'),
    src('lib/app/report-flow.js'),
    src('components/app/personal-analysis-panel.jsx'),
    src('components/client-cabinet.jsx'),
    src('app/api/client/[selector]/documents/[id]/pdf/route.js'),
  ])
  assert.match(api, /joined === 'personal-analysis-reports'/)
  assert.match(api, /listPersonalAnalysisReports\(config, getPrescriptionStore\(\), actor\)/)
  assert.match(flow, /export async function listPersonalAnalysisReports/)
  const start = flow.indexOf('export async function listPersonalAnalysisReports')
  const end = flow.indexOf('export async function readSavedReport', start)
  const section = flow.slice(start, end)
  assert.ok(start >= 0 && end > start)
  assert.match(section, /where s\.account_id=\$1 and s\.removed_at is null/)
  assert.match(section, /\[actor\.id\]/)
  assert.match(section, /await liveSource\(store, row\)/)
  assert.match(section, /available: true, title: report\.title, kind: report\.kind/)
  assert.doesNotMatch(section, /update app\.saved_reports set opened_at/i)
  assert.doesNotMatch(section, /originalResult|practitionerComment|relatedDocumentIds/)
  assert.match(panel, /fetch\('\/api\/app\/personal-analysis-reports'/)
  assert.match(panel, /credentials: 'same-origin'/)
  assert.match(panel, /verified \?\? reports/)
  assert.match(panel, /item\.legacy \? t\.legacy/)
  // The old document store cannot render kind=report: never show 404 view/PDF links.
  assert.match(pdf, /access\.record\.kind === 'report'/)
  assert.match(oldCabinet, /document\.type === 'report' \? <span/)
  assert.match(oldCabinet, /Старый отчёт · попросите новую ссылку/)
  assert.match(panel, /https:\/\/t\.me\/AndyTherapist/)
})
