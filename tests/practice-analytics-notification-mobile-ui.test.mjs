import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')
const ui=read('components/app/practice-analytics-subscriptions.jsx')
const css=read('components/app/practice-analytics-subscriptions.module.css')
const stats=read('components/app/practice-service-statistics.jsx')

test('stats are primary; messenger is an optional, clearly described collapsible feature',()=>{
  assert.match(stats,/PracticeAnalyticsSubscriptions locale=\{locale\}/)
  assert.match(ui,/Your views and clicks are shown above/)
  assert.match(ui,/Просмотры и клики показаны выше/)
  assert.match(ui,/Arriba puedes ver visitas y clics/)
  assert.match(ui,/aria-expanded=\{settingsOpen\}/)
  assert.match(ui,/settingsOpen&&<div className=\{styles\.settings\}/)
  assert.match(ui,/action\('preview'\)/)
  assert.match(ui,/preview&&<div className=\{styles\.preview\}/)
  assert.match(ui,/setSettingsOpen\(false\)/)
})

test('buttons replace oversized global-styled native radio controls, choices remain accessible',()=>{
  assert.doesNotMatch(ui,/type=["']radio["']/)
  assert.match(ui,/aria-pressed=\{channel===option\}/)
  assert.match(ui,/aria-pressed=\{frequency===option\}/)
  assert.match(ui,/\['telegram','whatsapp'\]/)
  assert.match(ui,/\['daily','weekly'\]/)
  assert.match(ui,/disabled=\{Boolean\(busy\)\|\|!consent\}/)
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css,/\.choice span \{white-space:nowrap\}/)
  assert.match(css,/@media\(max-width:430px\)/)
  assert.match(css,/@media\(max-width:340px\)/)
  assert.match(css,/\.consent input \{/)
  assert.match(css,/:focus-visible/)
})

test('copy never implies WhatsApp delivery is ready and retains provider and privacy guards',()=>{
  for(const phrase of ['WhatsApp sending unavailable','Отправка в WhatsApp недоступна','WhatsApp aún no envía informes']) {
    assert.ok(ui.includes(phrase),phrase)
  }
  for(const phrase of ['telegramVerified','telegramSendingEnabled','telegramLinkAvailable','begin_telegram',
    'MESSENGER_CONTACT_NOTICE_VERSION','consentVersion:VERSION','action:\'disable\'','send_now']) {
    assert.ok(ui.includes(phrase),phrase)
  }
  assert.match(ui,/Only counts and public service titles/)
  assert.match(ui,/Никаких имён, диагнозов/)
  assert.match(ui,/Sin datos de clientes/)
})
