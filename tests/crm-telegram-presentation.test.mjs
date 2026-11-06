import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  HOLISTIC_HOUSE_PRESENTATION_VIDEO,
  telegramPresentationOnStart,telegramPresentationMessage,
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

test('the welcome previews the approved film above the unchanged consent text', () => {
  assert.equal(HOLISTIC_HOUSE_PRESENTATION_VIDEO,
    'https://www.youtube.com/watch?v=G0Db6yOCMto')
  for (const locale of ['ru','en','es']) {
    const text='Welcome. Choose an action.'
    const greeting=telegramPresentationMessage(text,locale,true)
    assert.equal(greeting.text.endsWith(text),true)
    assert.equal(greeting.text.split(HOLISTIC_HOUSE_PRESENTATION_VIDEO).length,2)
    assert.equal(greeting.linkPreview.url,HOLISTIC_HOUSE_PRESENTATION_VIDEO)
    assert.equal(greeting.linkPreview.show_above_text,true)
    assert.equal(greeting.linkPreview.prefer_large_media,true)
    assert.equal(greeting.linkPreview.is_disabled,false)
    if(locale!=='ru')assert.match(greeting.text,/Russian audio|audio en ruso/)
  }
})

test('non-start and oversized prompts are unchanged', () => {
  assert.deepEqual(telegramPresentationMessage('Consent?', 'ru'),
    {text:'Consent?',linkPreview:null})
  assert.deepEqual(telegramPresentationMessage('Consent?', 'de',true),
    {text:'Consent?',linkPreview:null})
  const huge='A'.repeat(1150)
  assert.deepEqual(telegramPresentationMessage(huge, 'en',true),
    {text:huge,linkPreview:null})
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
