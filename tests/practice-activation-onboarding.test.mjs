import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { hasActivatedPractice } from '../lib/practitioners/practice-activation.mjs'
import { validateServiceDraft } from '../lib/practitioners/contracts.js'

const source = name => readFile(new URL('../' + name, import.meta.url), 'utf8')
const owner = (status, displayName = 'Sample practitioner') => ({
  status, draftProfile: { displayName }, profile: {},
})
const offering = status => ({ status })

test('new client cannot access full Practice; saved profile or draft service does not unlock it', () => {
  assert.equal(hasActivatedPractice(null, []), false)
  assert.equal(hasActivatedPractice(owner('draft'), []), false)
  assert.equal(hasActivatedPractice(owner('draft'), [offering('submitted')]), false)
  assert.equal(hasActivatedPractice(owner('submitted'), []), false)
  assert.equal(hasActivatedPractice(owner('submitted'), [offering('draft')]), false)
  assert.equal(hasActivatedPractice(owner('submitted', ''), [offering('submitted')]), false)
})

test('submitted profile + first submitted service immediately unlock private workspace, without public auto-publishing', () => {
  assert.equal(hasActivatedPractice(owner('submitted'), [offering('submitted')]), true)
  assert.equal(hasActivatedPractice(owner('changes_requested'), [offering('changes_requested')]), true)
  assert.equal(hasActivatedPractice(owner('approved'), []), true, 'legacy approved practitioners keep access')
  for (const status of ['suspended','rejected','archived']) {
    assert.equal(hasActivatedPractice(owner(status), [offering('published')]), false)
  }
})

test('practice shows other masters first; short registration is opt-in and gates private tools', async () => {
  const [view, css, repo, route] = await Promise.all([
    source('components/app/practice-workspace.jsx'),
    source('components/app/practice-dashboard.css'),
    source('lib/practitioners/repository.js'),
    source('app/api/app/[...path]/route.js'),
  ])
  const gallery = view.indexOf('className="hh-practice-marketplace-cards"')
  const join = view.indexOf('className="hh-practice-join"')
  const form = view.indexOf('className="hh-practice-signup"')
  const requests = view.indexOf('<PracticeRequestsOverview requests={requests}')
  assert.ok(gallery > 0 && gallery < join && join < form && form < requests)
  assert.match(view, /const needsOnboarding=!data\.practiceActivated/)
  assert.match(view, /Начать свою практику/)
  assert.match(view, /needsOnboarding&&showSignup&&<div id="hh-practice-onboarding"/)
  assert.match(view, /!needsOnboarding&&<PracticeRequestsOverview/)
  assert.match(view, /!needsOnboarding&&activePanel&&<section/)
  assert.match(view, /!needsOnboarding&&\(ownerTools && <details/)
  assert.match(view, /type="email" readOnly value=\{contactEmail\}/)
  assert.match(view, /type="tel"/)
  assert.match(view, /action:'submit',profile:profileDraft,service:draft/)
  assert.match(view, /serviceId:service\?\.id\|\|null/)
  assert.match(css, /\.hh-practice-registration-grid/)
  assert.match(css, /@media\(max-width:600px\)/)
  assert.match(repo, /if\(!hasActivatedPractice\(practitioner,services\)\)return/)
  assert.match(repo, /practiceActivated:false/)
  assert.match(repo, /practiceActivated:true/)
  assert.match(repo, /async requireActivated\(actor\)/)
  assert.match(repo, /contactEmail:actor\.email\|\|''/)
  assert.match(repo, /async onboarding\(actor,input\)/)
  assert.match(repo, /transaction\(config,actor,async db=>/)
  assert.match(route, /await practiceRepo\.requireActivated\(actor\)/)
  assert.match(route, /!\['onboarding','profile','services'\]\.includes\(path\[1\]\)/)
})

test('first registration service can be free, contact-priced or fixed without implying approval', () => {
  const base = {
    copy: { en: { title: 'Personal Reiki introduction', shortDescription: 'A quiet first session.' } },
    areaKey: 'energy_spiritual', offeringType: 'session', deliveryFormat: 'online',
    languages: ['en'], durationMinutes: 30, whatsapp: '+14165551234',
  }
  for (const [pricingMode, confirmedPrice, currency] of [
    ['free', null, ''], ['contact', null, ''], ['fixed', 40, 'CAD'], ['from', 25, 'USD'],
  ]) {
    const service = validateServiceDraft({ ...base, pricingMode, confirmedPrice, currency }, { complete: true })
    assert.equal(service.pricingMode, pricingMode)
    assert.equal(service.confirmedPrice, confirmedPrice)
  }
})
