import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const file = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const hub = file('components/app/profile-hub-tabs.jsx')
const workspace = file('components/app/app-workspace.jsx')
const subscription = file('components/app/subscription-access.jsx')
test('Profile settings reuses the real video and centers navigation above and below it', () => {
  assert.match(hub, /current === 'today' \|\| settingsMode/)
  assert.match(hub, /video controls playsInline preload="none"/)
  assert.match(hub, /settingsTabs/)
  assert.match(hub, /settingsQuickActions/)
  assert.match(workspace, /page !== 'runs' && page !== 'settings'/)
})
test('four announced prices are visible without a false purchase or paid entitlement', () => {
  for (const [key, amount] of [['free',0],['practice',5],['master',20],['pro',40]]) {
    assert.match(hub, new RegExp("key: '" + key + "', amount: " + amount))
    assert.match(subscription, new RegExp("key: '" + key + "', amount: " + amount))
  }
  assert.match(subscription, /Checkout is paused|newPricingNotice/)
  assert.match(subscription, /data-announced-packages/)
})
test('long settings are lazy but their original protected modules remain accessible', () => {
  const accord = file('components/app/profile-settings-disclosure.jsx')
  assert.match(accord, /visited &&/)
  for (const id of ['hh-settings-account','hh-settings-messengers','hh-settings-plans','hh-settings-more'])
    assert.ok(workspace.includes(id), 'missing ' + id)
  for (const component of ['<Preferences','<MessengerNotificationSettings','<SubscriptionSettings','<CommunicationPreferences','<ClientContactPhone','<Privacy'])
    assert.ok(workspace.includes(component), 'missing ' + component)
  assert.match(workspace, /hh-telegram-connect/)
})
