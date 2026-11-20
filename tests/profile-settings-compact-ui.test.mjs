import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync,readFileSync } from 'node:fs'
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8')
const hub=read('components/app/profile-hub-tabs.jsx')
const landing=read('components/app/profile-settings-landing.jsx')
const css=read('components/app/profile-settings-landing.module.css')
const app=read('components/app/app-workspace.jsx')
const subscription=read('components/app/subscription-access.jsx')

test('Approved Profile Settings mobile hero and cards open actual destinations',()=>{
  assert.match(hub,/<ProfileSettingsLanding locale=\{selected\}/)
  for(const hook of ['data-profile-settings-landing','data-profile-settings-photo-hero','data-profile-settings-overview','data-profile-settings-actions','data-profile-settings-privacy'])assert.ok(landing.includes(hook),hook)
  for(const item of ['account','messaging','plans','personal'])assert.ok(landing.includes("key:'"+item+"'"),item)
  for(const anchor of ['hh-settings-account','hh-settings-messengers','hh-settings-plans','hh-settings-more'])assert.ok(landing.includes('#'+anchor),anchor)
  for(const copy of ['Настройки профиля','Моя жизнь','Моя работа','Profile Settings','Ajustes del perfil'])assert.ok(landing.includes(copy),copy)
  assert.match(landing,/portrait\?space=reports/)
  assert.match(landing,/personality-profiles/)
  assert.match(landing,/language\+'\/practice'/)
  assert.doesNotMatch(landing,/onClick=|fetch\(|postMessage|checkout|autoPlay|localStorage|sessionStorage/)
})
test('Mobile visuals reuse approved lightweight existing photos, use 2-column layout and readable width adaptations',()=>{
  for(const name of ['reiki-approved-sunrise-v3.webp','profile-card-photos.webp','assessment-lotus.svg','course-journey-landscape.svg']){
    assert.ok(existsSync(new URL('../public/images/holistic-house/'+name,import.meta.url)),name)
    assert.ok(css.includes(name),name)
  }
  assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(css,/@media\(max-width:430px\)/)
  assert.match(css,/@media\(max-width:355px\)/)
  assert.match(css,/focus-visible/)
})
test('No loss of private settings, communications, payment guard or deep links',()=>{
  for(const id of ['hh-settings-account','hh-settings-messengers','hh-settings-plans','hh-settings-more'])assert.ok(app.includes('id="'+id+'"'),id)
  for(const component of ['<Preferences','<AccountLoginMethods','<MessengerNotificationSettings','<CommunicationPreferences','<ClientContactPhone','<SubscriptionSettings','<Privacy'])assert.ok(app.includes(component),component)
  assert.match(app,/hh-telegram-connect/)
  assert.match(app,/hh-phone-notifications/)
  assert.match(read('components/app/profile-settings-disclosure.jsx'),/visited &&/)
  for(const [key,amount] of [['free',0],['practice',5],['master',20],['pro',40]]){
    assert.ok(hub.includes("key: '"+key+"', amount: "+amount))
    assert.ok(subscription.includes("key: '"+key+"', amount: "+amount))
  }
  assert.match(subscription,/Checkout is paused|newPricingNotice/)
  assert.match(landing,/plans\.map\(/)
})
