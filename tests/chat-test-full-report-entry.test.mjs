import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const chat = source('components/app/messenger-test-journey.jsx')
const entry = source('components/app/chat-full-report-entry.jsx')
const css = source('components/app/chat-full-report-entry.module.css')
const account = source('components/app/app-workspace.jsx')

test('chat result opens a full private report rather than the public score-only gate', () => {
  assert.match(chat, /<ChatFullReportEntry resultId=\{result\.id\} locale=\{locale\}/)
  assert.doesNotMatch(chat, /\/client\?result=/)
  assert.match(entry, /data-chat-test-full-report/)
  assert.match(entry, /appRequest\('save-intents', \{/)
  assert.match(entry, /sourceKind: 'guest_result'/)
  assert.match(entry, /sourceId: selectedId/)
  assert.match(entry, /operationId: crypto\.randomUUID\(\)/)
  assert.match(entry, /if \(intent\.signedIn\)/)
  assert.match(entry, /\/app\/continue\?intent=/)
  assert.match(entry, /&auto=1/)
})

test('unsigned visitor sees an accessible Google/Telegram auth dialog with exact result continuation', () => {
  assert.match(entry, /createPortal\(/)
  assert.match(entry, /role="dialog" aria-modal="true"/)
  assert.match(entry, /data-chat-report-google-login/)
  assert.match(entry, /appRequest\('auth\/providers'\)/)
  assert.match(entry, /value\?\.telegram === true/)
  assert.match(entry, /appRequest\('auth\/start', \{/)
  assert.match(entry, /locale: accountLocale, intentId/)
  assert.match(entry, /target\.protocol !== 'https:'/)
  assert.match(css, /\.backdrop \{position:fixed/)
  assert.match(css, /max-height:calc\(100dvh - 36px\)/)
  for (const label of ['Открыть полный отчёт', 'Open my full report', 'Abrir informe completo']) {
    assert.ok(entry.includes(label))
  }
  assert.doesNotMatch(entry, /sessionStorage\.setItem|localStorage\.setItem|\?score=|\?answers=/)
})

test('OAuth return opens the owner-scoped detailed report before optional onboarding promotions', () => {
  assert.match(account, /if\(saved\.sourceKind === 'guest_result'\) router\.replace\(destination\)/)
  assert.match(account, /if\(intent\.sourceKind === 'guest_result'\) router\.replace\(destination\)/)
  assert.match(account, /appFetch\('save-intents\/' \+ intentId \+ '\/commit'/)
  assert.match(account, /savedResourcePath\(locale,saved\.sourceKind,saved\.resource\.id\)/)
  assert.match(account, /appFetch\('results\/' \+ id\)/)
  assert.match(account, /<PersonalResultReport result=\{result\}/)
  assert.match(account, /<TestResultDiscussion key=\{result\.id/)
})


test('completed chat result opens the private report automatically after the user selects View result', () => {
  assert.match(chat, /<ChatFullReportEntry resultId=\{result\.id\} locale=\{locale\} autoOpen/)
  assert.match(entry, /autoOpen = false/)
  assert.match(entry, /openedAutomatically\.current === resultId/)
  assert.match(entry, /void openFullReport\(\)/)
  assert.match(entry, /\[autoOpen, resultId, openFullReport\]/)
  assert.match(chat, /data-hh-test-view-result disabled=\{busy \|\| !!operation\.current\} onClick=\{finish\}/)
})
