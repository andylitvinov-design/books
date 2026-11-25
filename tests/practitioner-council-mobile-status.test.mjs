import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('owner daily report CTA reports pending state on mobile instead of silently ignoring a tap',()=>{
  const button=read('app/admin/telegram-setup/send-daily-council-button.jsx')
  assert.match(button,/^'use client'/)
  assert.match(button,/import \{useFormStatus\} from 'react-dom'/)
  assert.match(button,/const \{pending\}=useFormStatus\(\)/)
  assert.match(button,/disabled=\{disabled\|\|pending\}/)
  assert.match(button,/aria-busy=\{pending\}/)
  assert.match(button,/aria-live="polite"/)
  assert.match(button,/Sending report…/)
  assert.match(button,/Отправляем отчёт…/)
  assert.match(button,/Do not submit again/)
})

test('accepted today cannot trigger another report but keeps the real model statuses visible',()=>{
  const page=read('app/admin/telegram-setup/page.js')
  const setup=read('lib/practitioners/telegram-owner-setup.js')
  assert.match(page,/getTorontoCompletedPeriod\(\)\.today/)
  assert.match(page,/state\.council\?\.date===todayToronto/)
  assert.match(page,/state\.council\?\.status==='accepted'/)
  assert.match(page,/!acceptedToday&&!activeSendingToday/)
  assert.match(page,/acceptedToday\s*\?\s*<div className=\{styles\.sentNotice\}/)
  assert.match(page,/state\.council\.gemini/)
  assert.match(page,/state\.council\.mistral/)
  assert.match(page,/https:\/\/t\.me\/Andydotbot/)
  assert.match(setup,/active_claim:council\.active_claim===true/)
  assert.match(setup,/claimed_at>now\(\)-interval '15 minutes'/)
  assert.match(setup,/chatgpt:council\.model_outcomes\?\.chatgpt/)
})

test('redirect after Council submission anchors to result beside original CTA, not top of long screen',()=>{
  const actions=read('app/admin/telegram-setup/actions.js')
  const page=read('app/admin/telegram-setup/page.js')
  assert.match(actions,/status\.startsWith\('council_'\)\?'#daily-council-report'/)
  assert.match(actions,/'council_sent','council_partial','council_duplicate'/)
  assert.match(page,/id="daily-council-report"/)
  assert.match(page,/dailyResult&&<p className=\{styles\.result\} role="status">/)
  assert.match(page,/displayResult&&!dailyResult/)
  assert.match(page,/action=\{sendDailyCouncilReportAction\}/)
})

test('no new bot, paid provider, manual public endpoint or Cron replacement is introduced',()=>{
  const route=read('app/api/internal/council-archive-telegram/route.js')
  const page=read('app/admin/telegram-setup/page.js')
  const config=JSON.parse(read('vercel.json'))
  assert.match(route,/cronAuthorized\(request,process\.env\)/)
  assert.match(page,/requireAdminRequest\(\)/)
  assert.doesNotMatch(page,/chat_id|apiKey|OPENROUTER_API_KEY/)
  assert.deepEqual(config.crons.filter(x=>x.path.includes('council-archive-telegram')),
    [{path:'/api/internal/council-archive-telegram',schedule:'0 21 * * *'}])
  const css=read('app/admin/telegram-setup/telegram-setup.module.css')
  assert.match(css,/\.sendPanel\{scroll-margin-top:/)
  assert.match(css,/\.botLink\{[^}]*min-height:44px/)
})
