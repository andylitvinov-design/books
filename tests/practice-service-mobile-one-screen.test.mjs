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

test('first service slide matches approved large-cover iPhone design with accessible controls', () => {
  assert.match(editor, /data-service-slide="presentation"/)
  assert.match(editor, /data-service-visual-canvas/)
  assert.match(editor, /data-service-gallery-strip/)
  assert.match(editor, /data-service-goals/)
  assert.match(editor, /data-service-duration/)
  assert.match(editor, /data-service-detail-accordions/)
  assert.match(css, /\.photoCanvas\{height:clamp\(265px,75vw,320px\);aspect-ratio:auto/)
  assert.match(css, /\.photoButton\{[\s\S]*?min-height:44px/)
  assert.match(css, /\.visualTitle input\{height:49px;[\s\S]*?font:700 16px/)
  assert.match(css, /\.visualSummary textarea\{[\s\S]*?font:500 16px/)
  assert.match(css, /\.stageTabs button strong\{font:760 clamp\(10px,2\.8vw,12px\)[\s\S]*?white-space:normal/)
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

test('fixed emerald mobile action dock stays stable on first tap and above hidden app nav', () => {
  assert.match(editor, /data-service-editor-footer/)
  assert.match(editor, /disabled=\{locked\} onClick=\{saveDraft\}/)
  assert.match(editor, /const locked=busy\|\|videoBusy\|\|photoBusy/)
  assert.match(css, /\.footerControls\{[\s\S]*?position:fixed;z-index:75/)
  assert.match(css, /bottom:calc\(8px \+ env\(safe-area-inset-bottom,0px\)\)/)
  assert.match(css, /\.footerControls \.stepNavigation>span/) // CSS nested selectors keep controls in the dock.
  assert.match(css, /\.footerControls:has\(\.stepNavigation>button:first-child:disabled\)/)
  assert.match(css, /\.quickForm:has\(:is\(input,textarea,select\):focus\) \.footerControls\{position:fixed\}/)
  assert.match(css, /\.footerControls \.actions>\.submit\{[\s\S]*?background:linear-gradient\(110deg,#00a580,#007b67\)!important/)
})
