import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('intake has short choices and an optional-depth switch, preserving required answers', () => {
  const form = read('components/coaching-intake-form.tsx')
  assert.match(form, /showMore \|\| COACHING_FIELDS\.some\(field => field\.group === group\.id && field\.required\)/)
  assert.match(form, /showMore \|\| field\.required/)
  assert.match(form, /showMore && group\.id === "session"/)
  assert.match(form, /className=\{styles\.moreToggle\}/)
  assert.match(form, /aria-expanded=\{showMore\}/)
  assert.match(form, /missing > 0/)
  assert.match(form, /contactConsent: true/)
  assert.match(form, /sendConsent/)
  for (const label of ['Бесплатно · €0', '30 мин · €50', '60 мин · €100', 'Отправить ответы',
    'Free · €0', 'Send answers', 'Gratis · €0', 'Enviar respuestas'])
    assert.ok(form.includes(label), label)
})

test('already staged contact stays staged and phone is optional, not a new required field', () => {
  const form = read('components/coaching-intake-form.tsx')
  assert.match(form, /parseDiagnosticStart\(sessionStorage\.getItem\(DIAGNOSTIC_START_KEY\), locale\)/)
  assert.match(form, /setReplyContact\(\{ email: staged\.email, phone: staged\.phone \}\)/)
  assert.match(form, /showPhone \|\| replyContact\.phone/)
  assert.match(form, /!replyContact\.email\.trim\(\) && !replyContact\.phone\.trim\(\)/)
  assert.match(form, /fetch\("\/api\/coaching-diagnostic"/)
  assert.doesNotMatch(form, /Telegram\.WebApp\.initData|URLSearchParams\([^)]*chat_id/ ,
    'public UI cannot assert a Telegram identity without server verification')
})

test('mobile choices fit one row and large photo hero is suppressed only for intake', () => {
  const css = read('components/coaching-intake-form.module.css')
  const page = read('app/[locale]/coaching/coaching-page.module.css')
  assert.match(css, /\.choiceGrid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(css, /\.moreToggle\{/)
  assert.match(css, /\.guestHint\{/)
  assert.match(page, /\.page:has\(\[data-coaching-intake\]\) \.heroImage\{display:none\}/)
})
