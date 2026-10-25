import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const editor = read('components/app/simple-service-editor.jsx')
const css = read('components/app/simple-service-editor.module.css')
const servicesCss = read('components/app/my-services-dashboard.module.css')
const practiceCss = read('components/app/practice-dashboard.css')

test('mobile service authoring has full-width work surface without nested panel frames', () => {
  assert.match(css, /@media\(max-width:650px\)/)
  assert.match(css, /\.quickForm\{[\s\S]*?width:100%;max-width:none;[\s\S]*?border:0;/)
  assert.match(css, /\.stagePanel\{gap:5px;padding:0;border:0;/)
  assert.match(servicesCss, /\.dashboard:has\(\[data-service-composer-focus\]\)\{[\s\S]*?width:100%;max-width:none;border:0/)
  assert.match(practiceCss, /\[data-practice-detail-panel="services"\]:has\(\[data-service-slide-editor\]\)/)
  assert.match(practiceCss, /width:100%;max-width:none;margin:0;padding:0/)
})

test('first service slide is compact and touch controls remain accessible on iPhone', () => {
  assert.match(editor, /data-service-slide="presentation"/)
  assert.match(editor, /data-service-visual-canvas/)
  assert.match(css, /\.photoCanvas\{aspect-ratio:auto;height:89px\}/)
  assert.match(css, /\.photoButton\{[\s\S]*?min-height:44px/)
  assert.match(css, /\.visualTitle input\{[\s\S]*?font:650 16px/)
  assert.match(css, /\.visualSummary textarea\{[\s\S]*?font:500 16px/)
  assert.match(css, /\.stageTabs button strong\{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis/)
  assert.match(css, /@media\(max-width:355px\)/)
  assert.match(css, /\.previewCta\{display:none\}/)
  assert.match(editor, /c\.previewCtaNote/) // Still available in full desktop preview.
})

test('all three steps, photo/video uploads, translations and real moderation actions remain wired', () => {
  for (const stage of ['presentation','booking','details']) {
    assert.ok(editor.includes('data-service-slide="' + stage + '"'))
  }
  assert.match(editor, /data-service-stage=\{stage\}/)
  assert.match(editor, /aria-label=\{label\}/)
  assert.match(editor, /<PracticePhotoUpload mode="service" value=\{photos\}/)
  assert.match(editor, /<PracticeVideoField locale=\{locale\}/)
  assert.match(editor, /value=\{activeLanguage\}/)
  assert.match(editor, /data-service-step-controls/)
  assert.match(editor, /data-service-save-actions/)
  assert.match(editor, /onSave\(item\?\.id\|\|null,makePayload\(\),item\?\.revision\)/)
  assert.match(editor, /onSaveAndSubmit\(item\?\.id\|\|null,makePayload\(\),item\?\.revision\)/)
  assert.match(editor, /onPause\(item\)/)
})

test('fixed mobile action dock remains above app nav; disables during uploads and releases when keyboard opens', () => {
  assert.match(editor, /data-service-editor-footer/)
  assert.match(editor, /disabled=\{locked\} onClick=\{saveDraft\}/)
  assert.match(editor, /const locked=busy\|\|videoBusy\|\|photoBusy/)
  assert.match(css, /\.footerControls\{[\s\S]*?position:fixed;z-index:45/)
  assert.match(css, /bottom:calc\(74px \+ env\(safe-area-inset-bottom,0px\)\)/)
  assert.match(css, /\.footerControls\.stepNavigation/) // CSS nested selectors keep controls in the dock.
  assert.match(css, /\.footerControls:has\(\.stepNavigation>button:first-child:disabled\)/)
  assert.match(css, /\.quickForm:has\(:is\(input,textarea,select\):focus\) \.footerControls\{[\s\S]*?position:static/)
  assert.match(css, /\.footerControls \.actions>\.submit\{[\s\S]*?background:#812c49!important/)
})
