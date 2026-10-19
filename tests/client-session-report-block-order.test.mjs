import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')

function componentSource(source, name) {
  const start = source.indexOf('export function ' + name + '(')
  const end = source.indexOf('\n}', start)
  assert.ok(start >= 0 && end > start, name + ' must have a bounded component body')
  return source.slice(start, end + 2)
}

function assertVoicePlacement(report, document) {
  const canonical = componentSource(document, 'PrescriptionDocument')
  const cover = canonical.indexOf('className="canonical-report-cover"')
  const coverEnd = canonical.indexOf('</header>\n      </div>', cover)
  const audio = canonical.indexOf('{afterCover}')
  const analysis = canonical.indexOf('className="canonical-general canonical-report-analysis"')
  assert.ok(cover >= 0 && coverEnd > cover && audio > coverEnd && analysis > audio,
    'embedded voice belongs after the closed cover and before analysis')
  assert.equal(canonical.split('{afterCover}').length - 1, 1)
  const voice = componentSource(report, 'ClientSessionVoiceMessage')
  assert.equal((voice.match(/id="session-message"/g) || []).length, 1)
  assert.match(voice, /item\.kind==='audio'&&item\.role!=='hidden'/)
  assert.match(voice, /!item\.role\|\|item\.role==='personal'/)
  assert.match(voice, /if\(!audio\.length\)return null/)
  assert.equal((voice.match(/audio\.map\(item=><PrivatePlayer/g) || []).length, 1)
  const page = componentSource(report, 'ClientSessionPage')
  assert.equal((page.match(/<ClientSessionVoiceMessage\b/g) || []).length, 2,
    'only the mutually exclusive full-report and fallback voice slots remain')
  assert.match(page, /!audioEmbedded&&!hasFullReport&&<ClientSessionVoiceMessage/)
  assert.match(page, /!audioEmbedded&&hasFullReport&&<ClientSessionVoiceMessage/)
  assert.doesNotMatch(page, /id="session-message"|personalAudio\.map\(/,
    'the session shell must not independently render a second voice player')
}

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

test('appendix shows an instruction and original photos, then the signed footer', () => {
  const document = read('components/prescription-document.jsx')
  assert.ok(document.includes('Нажмите на карточку, чтобы прочесть описание препарата.'))
  assert.ok(document.includes("{locale === 'ru' ? 'Приложение.' : 'Appendix.'}"))
  assert.ok(document.includes('className="canonical-remedy-profile-thumb"'))
  assert.ok(document.includes('img src={remedy.primary_image} alt=""'))
  assert.ok(document.indexOf('className="canonical-remedy-profiles"') < document.lastIndexOf('<DocumentSignature'))
  assert.ok(document.includes('!embedded && recommendedTests.length > 0'))
  const css = read('components/consultation-report.css')
  assert.ok(css.includes('.canonical-remedy-profile-thumb img'))
  assert.ok(css.includes('.canonical-remedy-appendix-print-hint {display:none;}'))
  assert.ok(css.includes('.canonical-remedy-profile-thumb {display:none!important;}'))
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

test('private voice message appears once after the cover and before analysis in all four client views',()=>{
  const report=read('components/client-session-page.jsx')
  const document=read('components/prescription-document.jsx')
  assertVoicePlacement(report, document)
  assert.match(read('components/client-session.module.css'),
    /@media print\s*\{\s*\.reportVoiceSection\s*\{display:none!important/,
    'private voice controls remain absent from printed reports')
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

test('voice-placement contract rejects moved audio, duplicate fallback playback and hidden assets',()=>{
  const report=read('components/client-session-page.jsx')
  const document=read('components/prescription-document.jsx')
  const moved=document.replace('{afterCover}','').replace('{groups.map((group)', '{afterCover}\n      {groups.map((group)')
  assert.notEqual(moved,document)
  assert.throws(()=>assertVoicePlacement(report,moved), /after the closed cover and before analysis/)
  const duplicate=report.replace('!audioEmbedded&&hasFullReport&&<ClientSessionVoiceMessage',
    'hasFullReport&&<ClientSessionVoiceMessage')
  assert.notEqual(duplicate,report)
  assert.throws(()=>assertVoicePlacement(duplicate,document), /!audioEmbedded/)
  const hidden=report.replace("item.kind==='audio'&&item.role!=='hidden'", "item.kind==='audio'")
  assert.notEqual(hidden,report)
  assert.throws(()=>assertVoicePlacement(hidden,document), /hidden/)
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
