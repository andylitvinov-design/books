import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateProfile, validateServiceDraft } from '../lib/practitioners/contracts.js'

test('R2 practitioner contracts require a complete moderated public profile', () => {
  const profile = validateProfile({
    displayName:'Synthetic Master', professionalTitle:'Somatic practitioner',
    shortBio:'A synthetic profile used only for contract testing.', fullBio:'',
    languages:['en'], city:'', region:'', country:'', formats:['online'],
    areas:['body_somatic'], methods:[], yearsExperience:2, websiteUrl:'', socialUrls:[], photoPath:'',
  }, { complete:true })
  assert.equal(profile.displayName,'Synthetic Master')
  assert.deepEqual(profile.areas,['body_somatic'])
})

test('R2 service publication requires bilingual copy and safe service enums', () => {
  const service = validateServiceDraft({
    copy:{
      en:{title:'Session',shortDescription:'English description',description:'English description'},
      ru:{title:'Сессия',shortDescription:'Русское описание',description:'Русское описание'},
    },
    areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',
    locationLabel:'',languages:['en','ru'],pricingMode:'contact',confirmedPrice:null,
    currency:'',durationMinutes:60,imagePath:'',
  }, { complete:true })
  assert.equal(service.pricingMode,'contact')
  assert.equal(service.durationMinutes,60)
})

test('R2 supports a true free service without fake zero-price currency', () => {
  const service = validateServiceDraft({
    copy:{
      en:{title:'Free introduction',shortDescription:'Meet the practitioner',description:'Meet the practitioner'},
      ru:{title:'Бесплатное знакомство',shortDescription:'Знакомство с практиком',description:'Знакомство с практиком'},
    },
    areaKey:'personal_development',offeringType:'session',deliveryFormat:'online',
    locationLabel:'',languages:['en','ru'],pricingMode:'free',confirmedPrice:null,
    currency:'',durationMinutes:30,imagePath:'',
  }, { complete:true })
  assert.equal(service.pricingMode,'free')
  assert.equal(service.confirmedPrice,null)
  assert.equal(service.currency,'')
  assert.throws(() => validateServiceDraft({
    ...service,
    confirmedPrice:0,
  }, { complete:true }), error => error?.code === 'INVALID_PRICE')
  assert.throws(() => validateServiceDraft({
    ...service,
    pricingMode:'contact',
    confirmedPrice:25,
    currency:'CAD',
  }, { complete:true }), error => error?.code === 'INVALID_PRICE')
})

test('R2 migration preserves original Andy and service identities and adds scoped RLS', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261005164140_hh_master_network_r2.sql', import.meta.url),'utf8')
  const hardening = await readFile(new URL('../supabase/migrations/20261005165044_hh_master_network_r2_policy_hardening.sql', import.meta.url),'utf8')
  const freeService = await readFile(new URL('../supabase/migrations/20261005181659_master_onboarding_free_service.sql', import.meta.url),'utf8')
  for (const id of [
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76',
    'fcef611f-e68b-5b30-b9f4-b0aa5614654d',
    '7d0b3c10-b426-5c1b-8c61-b83312095a54',
    'b6b60244-7473-54b4-8130-de0442ca8fe8',
  ]) assert.match(sql,new RegExp(id))
  assert.match(sql,/practitioner_credentials/)
  assert.match(hardening,/consultation_requests_backend_read/)
  assert.match(hardening,/trusted_auth_user_id=\(select auth\.uid\(\)\)/)
  assert.match(hardening,/hh\.moderator/)
  assert.match(freeService,/pricing_mode in \('free','contact','fixed','from'\)/)
  assert.match(freeService,/pricing_mode <> 'free' or \(confirmed_price is null and currency is null\)/)
})

test('R2 UI exposes My Practice, public Masters and moderation without changing personal nav', async () => {
  const [workspace, practice, moderation, route, repository, services] = await Promise.all([
    readFile(new URL('../components/app/app-workspace.jsx',import.meta.url),'utf8'),
    readFile(new URL('../components/app/practice-workspace.jsx',import.meta.url),'utf8'),
    readFile(new URL('../components/practitioner-moderation.jsx',import.meta.url),'utf8'),
    readFile(new URL('../app/api/app/[...path]/route.js',import.meta.url),'utf8'),
    readFile(new URL('../lib/practitioners/repository.js',import.meta.url),'utf8'),
    readFile(new URL('../app/[locale]/services/page.tsx',import.meta.url),'utf8'),
  ])
  assert.match(workspace,/My Practice/)
  assert.match(workspace,/data\.services/)
  assert.match(practice,/Become a Master/)
  assert.match(practice,/Shared result excerpt/)
  assert.match(moderation,/Credentials/)
  assert.match(moderation,/Set Partner/)
  assert.match(practice,/Submit profile \+ free service for review/)
  assert.match(practice,/pricingMode:'free'/)
  assert.match(route,/practice\/onboarding/)
  assert.match(repository,/async onboarding\(actor,input\)/)
  assert.match(repository,/pricingMode:'free'/)
  assert.match(services,/Request free service/)
})
