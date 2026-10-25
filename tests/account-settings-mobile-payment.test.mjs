import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = async (path) => readFile(new URL('../' + path, import.meta.url), 'utf8')
const workspace = await source('app/[locale]/app/[[...path]]/workspace.css')
const manual = await source('components/app/manual-billing-request.module.css')
const plans = await source('components/app/subscription-access.module.css')
const markup = await source('components/app/manual-billing-request.jsx')
const subscription = await source('components/app/subscription-access.jsx')

test('account settings text-field styling must not enlarge radios', () => {
  // The old .hh-app input:not([type=checkbox]) selector gave every radio
  // width:100%, min-height:46px and padding:11px on iPhone.
  assert.match(workspace, /\.hh-app input:not\(\[type='checkbox'\]\):not\(\[type='radio'\]\),/)
  assert.doesNotMatch(workspace, /\.hh-app input:not\(\[type='checkbox'\]\)\s*,/)
  assert.match(markup, /<input type="radio" name=\{'manual-method-'\+planId\}/)
  assert.match(subscription, /<input type="radio" name=\{groupId\}/)
})

test('manual payment options keep a bounded circle beside readable text at narrow widths', () => {
  assert.match(manual, /\.panel\{[^}]*min-width:0;[^}]*width:100%;max-width:100%/)
  assert.match(manual, /\.option\{[^}]*min-width:0;/)
  assert.match(manual, /\.option input\[type='radio'\]\{[^}]*flex:0 0 18px;[^}]*max-width:18px;[^}]*min-height:18px;height:18px;[^}]*padding:0;/)
  assert.match(manual, /\.option span\{[^}]*grid-template-columns:minmax\(0,1fr\);flex:1 1 auto;[^}]*min-width:0;/)
  assert.match(manual, /@media\(max-width:560px\)\{[^}]*\.grid\{grid-template-columns:minmax\(0,1fr\)\}/)
  assert.match(manual, /\.actions button,\.actions a\{width:100%\}/)
})

test('subscription settings cards also protect their radio sizes and nested payment panel', () => {
  assert.match(plans, /\.settings\{[^}]*min-width:0;width:100%;max-width:960px/)
  assert.match(plans, /\.purchase\{[^}]*min-width:0/)
  assert.match(plans, /\.planHeading input\[type='radio'\]\{[^}]*flex:0 0 20px;[^}]*max-width:20px;[^}]*min-height:20px;height:20px;[^}]*padding:0;/)
  assert.match(plans, /@media\(max-width:620px\)\{\.planGrid\{grid-template-columns:minmax\(0,1fr\)\}\}/)
})

test('payment availability and order verification gates remain unchanged', () => {
  assert.match(subscription, /!canStartCheckout\(status, phase, planId\) && <ManualBillingRequest/)
  assert.match(markup, /This is not checkout\. No funds are charged/)
  assert.match(markup, /data-manual-order-status/)
  assert.match(markup, /\/api\/app\/manual-billing\/orders/)
})
