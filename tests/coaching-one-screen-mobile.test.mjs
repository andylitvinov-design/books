import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const source = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')

test('all three private coaching lesson variants share a fixed one-viewport layout', () => {
  const personal = source('components/app/personal-coaching.jsx')
  const tradition = source('components/app/tradition-coaching.jsx')
  const css = source('components/app/personal-coaching.module.css')
  const traditionCss = source('components/app/tradition-coaching.module.css')
  assert.match(personal, /data-coaching-one-question data-coaching-one-viewport/)
  assert.match(personal, /data-coaching-authored-followup data-coaching-one-viewport/)
  assert.match(tradition, /data-tradition-one-question data-coaching-one-viewport/)
  assert.match(css, /\.root\{[\s\S]*?height:100dvh/)
  assert.match(css, /\.session\[data-coaching-one-viewport\] \.questionArea\{[\s\S]*?overflow:hidden!important/)
  assert.match(traditionCss, /\.courseSession\[data-coaching-one-viewport\] \.courseScroll\{overflow:hidden!important/)
  assert.match(css, /\.session\[data-coaching-one-viewport\] \.footer\[data-coaching-messenger-footer\]/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.match(css, /@media\(max-height:650px\)/)
  assert.match(traditionCss, /@media\(max-width:350px\)/)
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(traditionCss, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
})

test('level artwork, sources and full explanations remain accessible without a scrolling lesson', () => {
  const tradition = source('components/app/tradition-coaching.jsx')
  const css = source('components/app/tradition-coaching.module.css')
  const chat = source('components/coaching-chat-thread.jsx')
  const chatCss = source('components/coaching-chat-thread.module.css')
  assert.match(tradition, /<TraditionStageArt stage=\{stageGuide\} lang=\{lang\} oneScreen\/>/)
  assert.match(tradition, /showDetails=compact\|\|oneScreen/)
  assert.match(tradition, /detailsRef\.current\?\.showModal\(\)/)
  assert.match(tradition, /<dialog ref=\{detailsRef\}/)
  assert.match(tradition, /stage\.description\?\.\[lang\]/)
  assert.match(tradition, /traditionStageSource\(stage\)/)
  assert.match(css, /\.compactStageCard/)
  assert.match(css, /\.stageDialog::backdrop/)
  assert.match(chat, /compact=false/)
  assert.match(chat, /detailRef\.current\?\.showModal\(\)/)
  assert.match(chat, /<dialog ref=\{detailRef\}/)
  assert.match(chatCss, /\.compactThread \.reply\{[\s\S]*?-webkit-line-clamp:2/)
  assert.match(chatCss, /\.compactThread \.userBubble\{display:flex/)
  for(const label of ['About this level','О смысле уровня','Sobre este nivel']){
    assert.ok(tradition.includes(label),label)
  }
})

test('composer controls stay visible and existing encrypted-save behavior is unchanged', () => {
  const personal=source('components/app/personal-coaching.jsx')
  const tradition=source('components/app/tradition-coaching.jsx')
  const shared=source('components/app/personal-coaching.module.css')
  const voice=source('components/app/coaching-question-voice.jsx')
  const voiceCss=source('components/app/tradition-coaching.module.css')
  for(const ui of [personal,tradition]){
    assert.match(ui, /data-coaching-messenger-footer/)
    assert.match(ui, /className=\{(?:styles|base)\.reportPop\}/)
    assert.match(ui, /aria-describedby=/)
    assert.match(ui, /onClick=\{\(\)=>(?:next|advance)\(false\)\}/)
  }
  assert.match(personal, /command\('answer',\{questionId:question\.id,answer\}\)/)
  assert.match(tradition, /await send\('answer',\{questionId:question\.id,answer\}\)/)
  assert.match(tradition, /busyRef\.current/)
  assert.match(shared, /\.session\[data-coaching-one-viewport\] \.footer \.reportPop\{/)
  assert.match(shared, /\.footerMessage\{/)
  assert.match(shared, /\.adaptiveMore\{/)
  assert.match(voice, /<SlidersHorizontal size=\{19\}/)
  assert.match(voiceCss, /\.voiceCompact \.voiceSettingsPanel\{[\s\S]*?position:absolute/)
  assert.match(voiceCss, /\.courseSession\[data-coaching-one-viewport\] \.courseScroll \[data-author-coaching-audio\]/)
})
