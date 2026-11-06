import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HOLISTIC_HOUSE_PRESENTATION_VIDEO, APPROVED_HOLISTIC_HOUSE_PRESENTATIONS,
  approvedTelegramPresentation, telegramPresentationOnStart,telegramPresentationMessage,
} from '../lib/crm/telegram-presentation.mjs'

test('the introduction is eligible only for the correct Start command', () => {
  for (const value of ['/start',' /start ','/start@holistichouse_bot',
    '/start hhreview_ru','/start hhreview_en','/start hhreview_es',
    '/START HHREVIEW_RU']) assert.equal(telegramPresentationOnStart(value),true,value)
  for (const value of ['/ai','/stop','привет','ау','/help','/video',
    '/start video','/start hhservice_123','/start hhnews_en',
    '/start random','/start\nhhreview_ru extra'])
    assert.equal(telegramPresentationOnStart(value),false,value)
})

test('only the approved Russian film appears above the same signed-first-start greeting', () => {
  assert.equal(HOLISTIC_HOUSE_PRESENTATION_VIDEO,
    'https://www.youtube.com/watch?v=G0Db6yOCMto')
  const approved=approvedTelegramPresentation('ru')
  assert.equal(approved?.youtubeId,'G0Db6yOCMto')
  assert.equal(approved?.locale,'ru')
  assert.ok(approved.durationSeconds>=70)
  assert.equal(Object.isFrozen(APPROVED_HOLISTIC_HOUSE_PRESENTATIONS),true)
  const text='Добро пожаловать. Выберите действие.'
  const greeting=telegramPresentationMessage(text,'ru',true)
  assert.equal(greeting.text.endsWith(text),true)
  assert.equal(greeting.text.split(HOLISTIC_HOUSE_PRESENTATION_VIDEO).length,2)
  assert.equal(greeting.linkPreview.url,HOLISTIC_HOUSE_PRESENTATION_VIDEO)
  assert.equal(greeting.linkPreview.show_above_text,true)
  assert.equal(greeting.linkPreview.prefer_large_media,true)
  assert.equal(greeting.linkPreview.is_disabled,false)
})

test('English and Spanish can only show their OWN reviewed permanent presentation films', () => {
  const russianId='G0Db6yOCMto'
  for (const locale of ['en','es']) {
    assert.equal(APPROVED_HOLISTIC_HOUSE_PRESENTATIONS[locale],null)
    assert.equal(approvedTelegramPresentation(locale),null)
    const text=locale==='en'?'Welcome! Choose an option.':'¡Bienvenido! Elige una opción.'
    for(const first of [true,false]){
      const message=telegramPresentationMessage(text,locale,first)
      assert.deepEqual(message,{text,linkPreview:null})
      assert.equal(JSON.stringify(message).includes(russianId),false)
    }
  }
  assert.equal(approvedTelegramPresentation('EN'),null)
  assert.equal(approvedTelegramPresentation('__proto__'),null)
  assert.equal(approvedTelegramPresentation('de'),null)
  assert.equal(telegramPresentationMessage('Hi','en',true).linkPreview,null)
})

test('non-start, unknown locale and oversized RU greetings remain plain text', () => {
  assert.deepEqual(telegramPresentationMessage('Consent?', 'ru'),
    {text:'Consent?',linkPreview:null})
  assert.deepEqual(telegramPresentationMessage('Consent?', 'de',true),
    {text:'Consent?',linkPreview:null})
  const huge='A'.repeat(1150)
  assert.deepEqual(telegramPresentationMessage(huge, 'ru',true),
    {text:huge,linkPreview:null})
})

test('website and Telegram share the same approved-locale source; AI-chat has no cross-language Russian preview', () => {
  const home=readFileSync(new URL('../components/home-presentation-video-section.tsx',import.meta.url),'utf8')
  const chat=readFileSync(new URL('../components/holistic-agent-chat.tsx',import.meta.url),'utf8')
  assert.match(home,/approvedTelegramPresentation\("ru"\)\?\.youtubeId/)
  assert.match(home,/approvedTelegramPresentation\("en"\)\?\.youtubeId/)
  assert.match(home,/locale === "en" && !approvedEnglishYoutubeId/)
  assert.doesNotMatch(chat,/G0Db6yOCMto/)
})

test('the signed webhook gates the first Start on persisted CRM session state', () => {
  const webhook=readFileSync(new URL('../lib/crm/messenger-webhook.js',import.meta.url),'utf8')
  const provider=readFileSync(new URL('../lib/crm/messenger-provider.js',import.meta.url),'utf8')
  const route=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8')
  assert.match(webhook,/presentationFirstStart:\s*!previous\s*&&\s*telegramPublicStartRequested\(rawStop\)/)
  assert.match(route,/intake\.presentationFirstStart===true\s*&&\s*telegramPresentationOnStart\(event\.rawText\)/)
  assert.match(provider,/telegramPresentationMessage\(text,locale,presentation\)/)
  assert.match(provider,/body\.link_preview_options=welcome\.linkPreview/)
})
