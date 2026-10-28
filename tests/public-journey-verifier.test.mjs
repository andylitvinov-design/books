import assert from 'node:assert/strict'
import test from 'node:test'
import { assertPublicJourneyRuntime, publicJourneyRequestDecision, installPublicJourneyFence,
  assertBusinessContextHandoff, assertHolisticContextHandoff, assertBusinessGenericSessionCard,
  assertBusinessOfferChoices, assertBusinessPaidFormatPrice } from '../scripts/helpers/public-journey-verifier.mjs'
import { publicJourneyRequestDiagnostic } from '../scripts/helpers/public-journey-verifier.mjs'

const origin = 'http://127.0.0.1:3100'
const env = { CI: 'true', NODE_ENV: 'production' }
test('diagnostic runtime fails closed before a browser can start', () => {
  assert.equal(assertPublicJourneyRuntime(origin, env), origin)
  for (const candidate of ['https://holistichouse.vercel.app', origin + '/', origin + '?x=1',
    'http://user@127.0.0.1:3100', 'http://127.0.0.1.evil.test:3100']) {
    assert.throws(() => assertPublicJourneyRuntime(candidate, env))
  }
  for (const candidate of [{}, { ...env, CI: 'false' }, { ...env, NODE_ENV: 'development' }, { ...env, VERCEL: '1' }]) {
    assert.throws(() => assertPublicJourneyRuntime(origin, candidate))
  }
})

test('only exact public local GET/HEAD routes and static assets pass', () => {
  const decide = (path, method = 'GET', extra = {}) => publicJourneyRequestDecision({ url: origin + path, method, ...extra }, origin)
  assert.equal(decide('/en/explore/business'), 'allow')
  assert.equal(decide('/ru/services/remote-energy-support?_rsc=synthetic'), 'allow')
  assert.equal(decide('/_next/static/chunk.js', 'HEAD'), 'allow')
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) assert.equal(decide('/en/holistic-support', method), 'write')
  for (const path of ['/api/service-enquiries', '/api/auth/signin/google', '/en/app', '/en/client?startTests=any', '/admin']) {
    assert.equal(decide(path), 'unplanned-route')
  }
  assert.equal(publicJourneyRequestDecision({ url: 'https://accounts.google.com', method: 'GET', navigation: true }, origin), 'external-navigation')
})

test('synthetic private text cannot leave in raw, encoded, double encoded or body form', () => {
  const privateText = 'Synthetic private goal only'
  for (const text of [privateText, encodeURIComponent(privateText), encodeURIComponent(encodeURIComponent(privateText)), privateText.replaceAll(' ', '+')]) {
    assert.equal(publicJourneyRequestDecision({ url: origin + '/en/holistic-support?q=' + text, method: 'GET' }, origin, [privateText]), 'private-text')
    assert.equal(publicJourneyRequestDecision({ url: origin + '/api/service-enquiries', method: 'POST', body: text }, origin, [privateText]), 'private-text')
  }
})

test('context-wide fence aborts writes/external navigation; cannot silently pass after blocking', async () => {
  let handler
  const actions = []
  const context = { route: async (pattern, callback) => { assert.equal(pattern, '**/*'); handler = callback } }
  const fence = await installPublicJourneyFence(context, origin)
  const send = async (url, method, navigation = false) => handler({
    request: () => ({ url: () => url, method: () => method, postData: () => '', isNavigationRequest: () => navigation }),
    continue: async () => actions.push('continue'), abort: async reason => actions.push(reason),
  })
  await send(origin + '/en/explore/business', 'GET', true)
  fence.assertNoSideEffects('safe')
  await send(origin + '/api/services/business-consulting', 'POST')
  await send('https://accounts.google.com', 'GET', true)
  assert.deepEqual(actions, ['continue', 'blockedbyclient', 'blockedbyclient'])
  assert.throws(() => fence.assertNoSideEffects('unsafe'), /no private-text, API, write or external navigation/)
})

test('Business requires exact visible editorial context and an untouched personal answer', () => {
  const valid={actualId:'money-beliefs',expectedId:'money-beliefs',actualTitle:'Goals & money beliefs',
    expectedTitle:'Goals & money beliefs',visible:true,personalAnswer:''}
  assertBusinessContextHandoff(valid,'positive')
  for (const change of [{actualId:null},{actualId:'decisions'},{actualTitle:''},{visible:false},{personalAnswer:'Invented answer'}])
    assert.throws(()=>assertBusinessContextHandoff({...valid,...change},'negative'))
})

test('Holistic lost or stale context remains a hard failure, not a lazy-render waiver', () => {
  assertHolisticContextHandoff('Synthetic intention', 'Synthetic intention', 'positive')
  for (const actual of ['', 'Earlier question']) {
    assert.throws(() => assertHolisticContextHandoff(actual, 'Synthetic intention', 'negative'), /UNRESOLVED CONTRACT/)
  }
})

// Independent literal fixtures: changing the helper's price/choice contract must
// not make a future UI mismatch pass by importing the same expectations here.
const offerFixtures = {
  en: { cta: 'Explore a session', note: '30 min €50 · 60 min €100', heading: 'Three simple ways to begin',
    free: 'Free', times: ['Written review · no live call', '30-minute live session', '60-minute live session'],
    form: ['30 minutes · €50', '60 minutes · €100'] },
  ru: { cta: 'Выбрать сессию', note: '30 мин €50 · 60 мин €100', heading: 'Три способа начать',
    free: 'Бесплатно', times: ['Письменный разбор · без созвона', '30 минут · личная сессия', '60 минут · личная сессия'],
    form: ['30 минут · €50', '60 минут · €100'] },
  es: { cta: 'Explorar una sesión', note: '30 min €50 · 60 min €100', heading: 'Tres formas sencillas de comenzar',
    free: 'Gratis', times: ['Revisión escrita · sin llamada', '30 minutos · sesión individual', '60 minutos · sesión individual'],
    form: ['30 minutos · €50', '60 minutos · €100'] },
}
test('generic session CTA cannot mask an express promise or changed duration/price', () => {
  for (const [locale, fixture] of Object.entries(offerFixtures)) {
    const valid = { ...fixture, ctaVisible: true, noteVisible: true }
    assertBusinessGenericSessionCard(valid, locale, 'positive')
    for (const change of [{ cta: 'Book the 30-minute session' }, { cta: '' },
      { note: fixture.note.replace('€50', '€55') }, { note: fixture.note.replace('60', '30') },
      { note: '30 min €50' }, { ctaVisible: false }, { noteVisible: false }]) {
      assert.throws(() => assertBusinessGenericSessionCard({ ...valid, ...change }, locale, 'negative'))
    }
  }
  assert.throws(() => assertBusinessGenericSessionCard(offerFixtures.en, 'fr', 'negative'))
})
test('destination requires all three actual choices and exact advertised paid pairs', () => {
  for (const [locale, fixture] of Object.entries(offerFixtures)) {
    const offers = ['free', 'express', 'full'].map((kind, index) => ({
      kind, price: [fixture.free, '€50', '€100'][index], time: fixture.times[index],
      directOption: kind, directHref: '#business-direct-request',
      visible: true, priceVisible: true, timeVisible: true, directVisible: true,
    }))
    const valid = { heading: fixture.heading, headingVisible: true, offers }
    assertBusinessOfferChoices(valid, locale, 'positive')
    assert.throws(() => assertBusinessOfferChoices({ ...valid, heading: 'Express booking' }, locale, 'negative'))
    assert.throws(() => assertBusinessOfferChoices({ ...valid, headingVisible: false }, locale, 'negative'))
    for (const field of ['visible', 'priceVisible', 'timeVisible', 'directVisible']) {
      for (const index of [0, 1, 2]) {
        const hidden = offers.map((offer, i) => i === index ? { ...offer, [field]: false } : offer)
        assert.throws(() => assertBusinessOfferChoices({ ...valid, offers: hidden }, locale, 'negative'))
      }
    }
    for (const changed of [offers.slice(1), [offers[0], offers[1], offers[1]],
      offers.map((offer, i) => i === 2 ? { ...offer, price: '€50' } : offer),
      offers.map((offer, i) => i === 2 ? { ...offer, time: fixture.times[1] } : offer),
      offers.map((offer, i) => i === 1 ? { ...offer, directOption: 'full' } : offer),
      offers.map((offer, i) => i === 1 ? { ...offer, directHref: 'https://provider.example.test' } : offer)]) {
      assert.throws(() => assertBusinessOfferChoices({ ...valid, offers: changed }, locale, 'negative'))
    }
  }
})
test('explicit paid choice must reach matching form format, duration and price', () => {
  for (const [locale, fixture] of Object.entries(offerFixtures)) {
    for (const [index, format] of ['express', 'full'].entries()) {
      const valid = { format, text: fixture.form[index] }
      assertBusinessPaidFormatPrice(valid, format, locale, 'positive')
      for (const change of [{ format: 'free' }, { format: index ? 'express' : 'full' },
        { text: fixture.form[1 - index] }, { text: valid.text.replace(/€\d+/, '€500') }]) {
        assert.throws(() => assertBusinessPaidFormatPrice({ ...valid, ...change }, format, locale, 'negative'))
      }
    }
    assert.throws(() => assertBusinessPaidFormatPrice({ format: 'free', text: fixture.free }, 'free', locale, 'negative'))
  }
})

test('only the exact source-proven guest gallery GET can receive a synthetic anonymous response', async () => {
  const fixtures={anonymousTalismans:true}
  const request={url:origin+'/api/holistic-support/talismans',method:'GET'}
  assert.equal(publicJourneyRequestDecision(request,origin,[],fixtures),'synthetic-anonymous-talismans')
  assert.equal(publicJourneyRequestDecision(request,origin),'unplanned-route','fixture is explicit, never a default API waiver')
  for(const change of [{method:'POST'},{method:'DELETE'},{method:'HEAD'},{body:'private'},
    {navigation:true},{url:request.url+'?id=anything'},{url:request.url+'#anything'},
    {url:request.url+'/'},{url:'https://holistichouse.vercel.app/api/holistic-support/talismans'}])
    assert.notEqual(publicJourneyRequestDecision({...request,...change},origin,[],fixtures),'synthetic-anonymous-talismans')
  assert.equal(publicJourneyRequestDecision({...request,body:'PRIVATE'},origin,['PRIVATE'],fixtures),'private-text')
  let handler,fulfilled,continued=0
  const fence=await installPublicJourneyFence({route:async(_,fn)=>{handler=fn}},origin,[],fixtures)
  await handler({request:()=>({url:()=>request.url,method:()=>request.method,postData:()=>'',isNavigationRequest:()=>false}),
    continue:async()=>{continued++},abort:async()=>assert.fail('expected isolated401'),fulfill:async data=>{fulfilled=data}})
  assert.equal(continued,0,'private endpoint never hits a backend')
  assert.deepEqual(fulfilled,{status:401,contentType:'application/json',body:'{"error":"UNAUTHENTICATED"}'})
  assert.equal(fence.summary().anonymousTalismanReads,1)
  assert.doesNotMatch(fulfilled.body,/items|imageUrl|saved|success/)
  fence.assertNoSideEffects('synthetic guest')
})

test('request evidence is bounded and never includes arbitrary paths, query, body or headers', async () => {
  const sample={url:origin+'/private/SENSITIVE?q=SECRET',method:'POST',body:'BODY_SECRET',navigation:false,
    resourceType:'fetch',prefetch:true,headers:{authorization:'TOKEN'}}
  const diagnostic=publicJourneyRequestDiagnostic(sample,'unplanned-route')
  assert.equal(diagnostic.path,'[redacted]')
  assert.doesNotMatch(JSON.stringify(diagnostic),/SENSITIVE|SECRET|TOKEN|authorization|\?q=/)
  const known=origin+'/academy/reiki-yggdrasil/source/advanced-runes.png?question=SECRET'
  assert.equal(publicJourneyRequestDiagnostic({...sample,url:known},'unplanned-route').path,
    '/academy/reiki-yggdrasil/source/advanced-runes.png')
  assert.equal(publicJourneyRequestDiagnostic({...sample,url:known},'private-text').path,'[redacted]')
  assert.equal(publicJourneyRequestDecision({url:known,method:'GET'},origin),'unplanned-route','diagnostic visibility is NOT an asset allowlist')
  let handler
  const fence=await installPublicJourneyFence({route:async(_,fn)=>{handler=fn}},origin)
  for(let i=0;i<25;i++)await handler({request:()=>({url:()=>sample.url,method:()=>sample.method,postData:()=>sample.body,
    isNavigationRequest:()=>false,resourceType:()=>sample.resourceType,headers:()=>sample.headers}),
    continue:async()=>assert.fail('unexpected forwarding'),abort:async()=>{},fulfill:async()=>assert.fail('unknown API cannot be stubbed as success')})
  assert.equal(fence.summary().requestDiagnostics.length,20)
  assert.throws(()=>fence.assertNoSideEffects('still fatal'),/no private-text, API, write or external navigation/)
  assert.doesNotMatch(JSON.stringify(fence.summary()),/SENSITIVE|SECRET|TOKEN/)
})
