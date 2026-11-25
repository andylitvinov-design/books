import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const read=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
const [picker,style,subscription,subscriptionStyle,billing,globals]=await Promise.all([
  read('components/app/subscription-compact-picker.jsx'),
  read('components/app/subscription-compact-picker.module.css'),
  read('components/app/subscription-access.jsx'),
  read('components/app/subscription-access.module.css'),
  read('lib/billing/public-plan.js'),
  read('app/globals.css')
])
test('one user-invoked dialog replaces repeated inline pricing',()=>{
  assert.match(picker,/<dialog\b/)
  assert.match(picker,/\.showModal\(\)/)
  assert.match(picker,/window\.location\.hash==='#hh-settings-plans'/)
  assert.match(subscription,/<SubscriptionCompactPicker locale=\{locale\}/)
  assert.match(globals,/\[data-profile-active="settings"\] #hh-settings-overview-plans\{display:none\}/)
  assert.doesNotMatch(subscription.slice(subscription.indexOf('export function SubscriptionSettings()')),/<PlanSelection t=\{t\}/)
})
test('four announced plans stay display-only, without unsafe legacy charge',()=>{
  for(const [id,amount] of [['free',0],['practice',5],['master',20],['pro',40]]){
    assert.ok(picker.includes("id:'"+id+"'"),id)
    assert.ok(picker.includes('amount:'+amount),String(amount))
  }
  assert.match(picker,/yearly:'Yearly · coming soon'/)
  assert.match(picker,/aria-disabled="true"/)
  assert.match(picker,/disabled=\{chosen!=='free'\}/)
  assert.doesNotMatch(picker,/startCheckout|requestBilling|window\.location\.assign|checkout\.stripe\.com/)
  assert.match(billing,/PURCHASABLE_PLAN_KEYS = Object\.freeze\(\['advanced', 'premium'\]\)/)
})
test('mobile scrolling remains within the picker and total stays in view',()=>{
  assert.match(style,/height:100dvh/)
  assert.match(style,/\.body\{[^}]*overflow-y:auto/)
  assert.match(style,/\.footer\{[^}]*flex:none/)
  assert.match(style,/safe-area-inset-bottom/)
  assert.match(picker,/aria-live="polite"/)
  assert.match(subscription,/<details className=\{styles\.settingsExtra\}>/)
})
