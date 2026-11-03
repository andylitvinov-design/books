import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  telegramDiagnosticV2Script,telegramV2CoachingLink,
  TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS,
} from '../lib/crm/telegram-diagnostic-v2.mjs'
import {transitionTelegramDiagnostic} from '../lib/crm/telegram-diagnostic.mjs'
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const TOPICS=['business','wellbeing','relationships','other']
const langs=['en','ru','es']
const state=(row,consentAt='2026-10-27T00:00:00Z')=>({
  stage:row.stage,locale:row.locale,flowVersion:row.flowVersion,
  topic:row.topic,consentAt,
})
const photo={photoFileId:'AgACAgQAAxk0123456789',photoBytes:204800}
test('CRM shows exactly the six outgoing Telegram V2 texts and buttons, no duplicated source',()=>{
  for(const lang of langs)for(const topic of TOPICS){
    const choices=TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS[lang]
    const steps=telegramDiagnosticV2Script(lang,topic)
    const event=(rawText,extra={})=>({rawText,locale:lang,...extra})
    const out=[]
    let row=transitionTelegramDiagnostic(null,event('/start hhreview_'+lang))
    out.push(row)
    row=transitionTelegramDiagnostic(state(row,null),event(choices.yes))
    out.push(row)
    row=transitionTelegramDiagnostic(state(row),event(choices[topic]))
    out.push(row)
    row=transitionTelegramDiagnostic(state(row),event('',photo))
    out.push(row)
    row=transitionTelegramDiagnostic(state(row),event('Non-sensitive test goal, difficulty and details'))
    out.push(row)
    row=transitionTelegramDiagnostic(state(row),event('',photo))
    out.push(row)
    assert.deepEqual(steps.map(x=>x.stage),['consent','focus','photo','question','drawing','done'])
    assert.deepEqual(steps.map(x=>x.text),out.map(x=>x.reply))
    assert.deepEqual(steps.map(x=>x.buttons),out.map(x=>x.keyboard.flat()))
    assert.deepEqual(steps[0].buttons,[choices.yes],lang+' shows a single start button')
    assert.equal(steps[5].link,telegramV2CoachingLink(lang,topic))
    assert.equal(steps[4].buttons.length,1)
    assert.equal(steps[5].buttons.length,0)
    assert.equal(steps.length,6)
    assert.ok(!steps.some(x=>x.buttons.some(k=>k.startsWith('/'))))
  }
})
test('skip photo and skip drawing display the real alternate wording and same safe link',()=>{
  for(const lang of langs){
    const keys=TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS[lang]
    const first=transitionTelegramDiagnostic(null,{rawText:'/start hhreview_'+lang,locale:lang})
    const consent=transitionTelegramDiagnostic(state(first,null),{rawText:keys.yes,locale:lang})
    const focus=transitionTelegramDiagnostic(state(consent),{rawText:keys.business,locale:lang})
    const skipped=transitionTelegramDiagnostic(state(focus),{rawText:keys.skipPhoto,locale:lang})
    const steps=telegramDiagnosticV2Script(lang,'business')
    assert.equal(skipped.reply,steps[3].withoutPhotoText)
    const drawing=transitionTelegramDiagnostic(state(skipped),{rawText:'Non-sensitive goal and obstacle',locale:lang})
    const finish=transitionTelegramDiagnostic(state(drawing),{rawText:keys.skipDrawing,locale:lang})
    assert.equal(finish.reply,steps[5].text)
  }
})
test('CRM defaults to canonical owner-authored six-step viewer; generic examples remain collapsed and never edit Telegram',()=>{
  const editor=source('components/app/crm-salesbot.jsx')
  const viewer=source('components/app/crm-telegram-diagnostic-script.jsx')
  const canonical=source('lib/crm/telegram-diagnostic-v2.mjs')
  assert.match(editor,/CrmTelegramDiagnosticScript locale=\{lang\}/)
  assert.match(editor,/<details className=\{styles\.extraTemplates\} data-salesbot-mode="dry_run">/)
  assert.doesNotMatch(editor,/<details className=\{styles\.extraTemplates\}[^>]*open(?:=|\s|>)/)
  assert.ok(editor.indexOf('<CrmTelegramDiagnosticScript')<editor.indexOf('<details className={styles.extraTemplates}'))
  assert.match(viewer,/telegramDiagnosticV2Script\(lang,topic\)/)
  assert.match(viewer,/data-telegram-canonical-v2="true"/)
  assert.match(viewer,/white-space:pre-wrap|styles\.fullText/)
  assert.match(viewer,/withoutPhotoText/)
  assert.doesNotMatch(viewer,/\/api\/app\/crm\/salesbot|fetch\(|sendMessage|onInsert|onSave|onPublish/)
  assert.match(canonical,/text:lang\.intro/)
  assert.match(canonical,/text:lang\.drawing/)
  assert.match(canonical,/lang\.final\.replace\('\{link\}',link\)/)
  assert.ok(canonical.includes('Приветствую! Спасибо за интерес к экспресс-диагностике.'))
  assert.ok(canonical.includes('Теперь самое важное чтобы я мог разобрать ситуацию'))
})
