import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { guestRoutePath, isGuestReference } from '../lib/app/guest-route.js'

const plan = '11111111-1111-4111-8111-111111111111'
const run = '22222222-2222-4222-8222-222222222222'
const result = '33333333-3333-4333-8333-333333333333'
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('completed single guest result survives a same-browser URL reload without revealing answers', () => {
  const path = guestRoutePath('https://holistichouse.vercel.app/ru/client?startTests=hh-current-state&name=unsafe#secret', {resultId:result})
  assert.equal(path, '/ru/client?result=' + result)
  assert.ok(!/name|startTests|secret|answers|score/.test(path))
  assert.equal(guestRoutePath('https://holistichouse.vercel.app'+path, {resultId: result}),path)
})

test('guest battery resumes the exact pending run and then the scored result', () => {
  const take = guestRoutePath('/en/client?startTests=hh-current-state,mini-ipip-20', {planId:plan,runId:run})
  assert.equal(take, '/en/client?plan='+plan+'&run='+run)
  const scored = guestRoutePath(take, {planId:plan,resultId:result})
  assert.equal(scored, '/en/client?plan='+plan+'&result='+result)
  const next = guestRoutePath(scored, {planId:plan})
  assert.equal(next, '/en/client?plan='+plan)
  assert.equal(guestRoutePath(scored,{}),'/en/client')
})

test('guest query rejects malformed, cross-origin, conflicting and non-UUID resume references', () => {
  assert.equal(isGuestReference(result),true)
  assert.equal(isGuestReference('personal-stress'),false)
  for (const value of ['javascript:alert(1)', '../../test', 'x', '', '00000000-0000-0000-0000-000000000000']) {
    assert.throws(() => guestRoutePath('/ru/client',{resultId:value}),/INVALID_GUEST_REFERENCE/)
  }
  assert.throws(()=>guestRoutePath('/ru/client',{runId:run,resultId:result}),/INVALID_GUEST_REFERENCE/)
  assert.throws(()=>guestRoutePath('/en/app',{resultId:result}),/INVALID_GUEST_ROUTE/)
})

test('guest Cabinet flow restores the same result, with an explicit opt-in save and a named free analysis', () => {
  const landing = source('components/app/cabinet-landing.jsx')
  const account = source('components/app/app-workspace.jsx')
  assert.match(landing,/requestedGuestResult = searchParams\.get\('result'\)/)
  assert.match(landing,/bootstrap\.results\.find\(\(item\) => item\.id === requestedGuestResult\)/)
  assert.match(landing,/setGuestResult\(result\)/)
  assert.match(landing,/replaceGuestRoute\(\{ planId:.*resultId: result\.id \}\)/)
  assert.match(landing,/onClick=\{saveToCabinet\}/)
  assert.match(landing,/sourceKind: 'guest_result'/)
  assert.match(landing,/GuestScaleInterpretation result=\{guestResult\}/)
  assert.match(account,/monitoringCatalogItem\(intent\?\.source\?\.definitionKey\)/)
  assert.match(account,/Сохранить результат и открыть бесплатный анализ/)
})
