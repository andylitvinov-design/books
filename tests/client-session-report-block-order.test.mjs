import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

test('Cabinet save precedes recommended test cards and the final PDF module', () => {
  const page = read('components/client-session-page.jsx')
  const materials = page.indexOf('id="session-materials-title"')
  const tests = page.indexOf('id="session-recommended-tests"')
  const actions = page.indexOf('data-hh-report-next-actions')
  const pdf = page.indexOf("id={hasFullReport?'session-download':'session-report'}")
  assert.ok(materials > -1 && materials < actions && actions < tests && tests < pdf)
  assert.equal(page.split('id="session-recommended-tests"').length - 1, 1)
  assert.ok(page.includes('recommendedTests.map(test=><a key={test.key} className={styles.reportRecommendedTestCard}'))
  assert.ok(page.includes('href={test.href}'), 'preserves validated catalogue targets')
  const css = read('components/client-session.module.css')
  assert.ok(css.includes('.reportRecommendedTestList{'))
  assert.ok(css.includes('grid-template-columns:minmax(0,1fr)'), 'single column on mobile')
  assert.ok(css.includes('.reportRecommendedTestCard:focus-visible'))
})

test('original remedy photo, prescription and full source description are now one card before signature', () => {
  const document = read('components/prescription-document.jsx')
  const thumb = read('components/remedy-report-thumbnail.jsx')
  const card = document.indexOf('className="canonical-remedy canonical-remedy--unified"')
  const disclosure = document.indexOf('className="canonical-remedy-profile-disclosure canonical-remedy-unified-disclosure"')
  const signature = document.lastIndexOf('<DocumentSignature')
  assert.ok(card > 0 && disclosure > card && signature > disclosure)
  assert.ok(document.includes('RemedyReportThumbnail src={remedy?.primary_image} number={number}'))
  assert.ok(document.includes('canonical-remedy-unified-toggle'))
  assert.ok(document.includes('<RemedyContent locale={locale} remedy={remedy}'))
  assert.ok(document.includes('expandSupplementary fullSource'))
  assert.ok(document.includes('!embedded && recommendedTests.length > 0'))
  assert.doesNotMatch(document, /className="canonical-remedy-profiles"/)
  assert.match(thumb, /src=\{source\}/)
  assert.match(thumb, /canonical-remedy-number canonical-remedy-unified-index/)
  const css = read('components/consultation-report.css')
  assert.match(css, /Unified prescription \+ remedy library cards — 2026-10-19/)
  assert.match(css, /canonical-remedy-unified-thumb > img/)
})

test('existing guest, cabinet, saved and preview routes keep their shared document renderer', () => {
  const routes = [
    'app/[locale]/client/session/[shareSelector]/page.js',
    'app/[locale]/client/[selector]/sessions/[sessionId]/page.js',
    'app/[locale]/app/sessions/[id]/page.jsx',
    'app/admin/documents/[id]/session-preview/page.js',
  ]
  for (const route of routes) assert.ok(read(route).includes('<PrescriptionDocument'),route)
  assert.ok(read('lib/prescriptions/pdf.js').includes('recommendedTests'))
})

test('private voice message appears once after the signed cover in all four client views',()=>{
  const report=read('components/client-session-page.jsx')
  const document=read('components/prescription-document.jsx')
  const cover=document.indexOf('className="canonical-report-cover"')
  const audio=document.indexOf('{afterCover}')
  const analysis=document.indexOf('className="canonical-general canonical-report-analysis"')
  assert.ok(cover>=0&&audio>cover&&analysis>audio)
  assert.equal((report.match(/id="session-message"/g)||[]).length,1)
  assert.match(report,/export function ClientSessionVoiceMessage/)
  assert.match(report,/audioEmbedded/)
  for(const path of [
    'app/[locale]/client/session/[shareSelector]/page.js',
    'app/[locale]/client/[selector]/sessions/[sessionId]/page.js',
    'app/[locale]/app/sessions/[id]/page.jsx',
    'app/admin/documents/[id]/session-preview/page.js',
  ]){
    const source=read(path)
    assert.match(source,/afterCover=\{<ClientSessionVoiceMessage/,path)
    assert.match(source,/audioEmbedded=/,path)
  }
})
test('practitioner report editor places audio before analysis and library at the bottom',()=>{
  const edit=read('app/admin/consultations/[id]/edit/page.js')
  assert.ok(edit.indexOf('placement="video"')>-1)
  assert.ok(edit.indexOf('placement="video"')<edit.indexOf('placement="audio"'))
  assert.ok(edit.indexOf('placement="audio"')<edit.indexOf('id="edit-recommendation"'))
  assert.ok(edit.indexOf('placement="materials"')>edit.indexOf('id="edit-recommendation"'))
  const editor=read('components/report-video-materials-editor.jsx')
  assert.match(editor,/placement='all'/)
  assert.ok(editor.indexOf("placement==='video'")<editor.indexOf("placement==='audio'"))
  assert.ok(editor.indexOf("placement==='audio'")<editor.indexOf('id="report-video-materials-editor"'))
  const studio=read('components/admin-session-studio.jsx')
  assert.ok(studio.indexOf('Private session recordings')<studio.indexOf('Shared library materials'))
  assert.ok(studio.indexOf('Shared library materials')<studio.indexOf('id="session-publication"'))
})


test('welcome video is a private selection above the signed report; audio remains after cover',()=>{
  const report=read('components/client-session-page.jsx')
  const recorder=read('components/session-audio-recorder.jsx')
  const takes=read('components/session-recording-review.jsx')
  assert.ok(report.indexOf('id="session-video"') < report.indexOf('id="session-report"'))
  assert.match(report,/hasVideoWelcome\?\(ru\?'Видеоприветствие':'Video welcome'\)/)
  assert.match(report,/session\.media/)
  assert.match(recorder,/videoOnly\?'video\/mp4,video\/quicktime,\.mp4,\.mov'/)
  assert.match(recorder,/reviewFirst:scope==='client'/)
  assert.match(takes,/kindFilter==='all'\|\|item\.kind===kindFilter/)
  assert.match(takes,/role:visible\?'personal':'hidden'/)
})

test('each unified prescription contains its own description, before guidance, notes and follow-up', () => {
  const document = read('components/prescription-document.jsx')
  const prescriptionStart = document.indexOf('      {groups.map((group) => <section className="canonical-remedy-group"')
  const remedyGroupsEnd = document.indexOf('      </section>)}', prescriptionStart)
  const inlineDescription = document.indexOf('className="canonical-remedy-profile-content"', prescriptionStart)
  const guidance = document.indexOf('      {guidance && <section className="canonical-guidance"')
  const notes = document.indexOf('      {document.additionalNotes &&')
  const followUp = document.indexOf('      {followUpSession &&')
  assert.ok(prescriptionStart > 0 && inlineDescription > prescriptionStart)
  assert.ok(inlineDescription < remedyGroupsEnd && remedyGroupsEnd < guidance && guidance < notes && notes < followUp)
  assert.equal(document.split('className="canonical-remedy-profiles"').length - 1, 0)
  assert.match(document, /canonical-remedy-unified-toggle/)
  assert.match(document, /'Описание' : 'Details'/)
})

test('mobile report uses tighter medicine and appendix rows while leaving practitioner details visible', () => {
  const css = read('components/consultation-report.css')
  const start = css.indexOf('Report prescriptions + immediately-following appendix, compact pass 2026-10-19')
  assert.ok(start > 0)
  const mobile = css.slice(start)
  assert.match(mobile, /@media screen and \(max-width: 700px\)/)
  assert.match(mobile, /grid-template-columns: minmax\(0, 1fr\) auto/)
  assert.match(mobile, /\.canonical-remedy > a\.canonical-remedy-profile-action\s*\{/)
  assert.match(mobile, /grid-row: 1/)
  assert.match(mobile, /min-height: 44px/)
  assert.match(mobile, /\.canonical-remedy-profile-action-short\s*\{[\s\S]*?display: inline/)
  assert.match(mobile, /\.canonical-remedy-fields dd\s*\{[\s\S]*?font-size: 13px/)
  assert.match(mobile, /\.canonical-remedy-profile-thumb\s*\{[\s\S]*?width: 46px/)
  assert.match(mobile, /break-before: auto/)
  const coastal = read('components/client-session.module.css')
  const coastalStart = coastal.indexOf('Coastal client report: honor the compact prescription and appendix layout')
  assert.ok(coastalStart > 0, 'the private report theme must not enlarge the shared compact layout')
  const theme = coastal.slice(coastalStart)
  assert.match(theme, /\.canonical-remedy\)\s*\{[\s\S]*?display:grid/)
  assert.match(theme, /\.canonical-remedy-schedule\)\s*\{[\s\S]*?background:transparent/)
  assert.match(theme, /\.canonical-remedy > a\.canonical-remedy-profile-action\)\s*\{[\s\S]*?grid-row:1/)
  assert.match(theme, /\.prescription-shell \.canonical-document--editorial \.canonical-remedy-title h3\)\s*\{[\s\S]*?font-size:16px/)
  assert.doesNotMatch(mobile, /display:\s*none[^;}]*\}\s*\/\*\s*authored/)
})

