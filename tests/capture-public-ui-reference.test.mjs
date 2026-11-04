import test from 'node:test'
import assert from 'node:assert/strict'
import {parseCaptureArgs} from '../scripts/capture-public-ui-reference.mjs'

test('public capture defaults to safe guest-only loopback Practice and a reproducible viewport',()=>{
  const p=parseCaptureArgs([])
  assert.equal(p.route,'/ru/practice')
  assert.equal(p.width,390)
  assert.equal(p.height,844)
  assert.equal(p.origin,'http://127.0.0.1:3119')
  assert.equal(p.browser,'chromium')
})

test('capturing a legitimate public EN/RU/ES route uses known canonical/loopback origins',()=>{
  const p=parseCaptureArgs(['--origin=https://holistichouse.vercel.app','--route=/en/holistic-support/mobile','--width=430','--browser=webkit'])
  assert.equal(p.origin,'https://holistichouse.vercel.app')
  assert.equal(p.route,'/en/holistic-support/mobile')
  assert.equal(p.width,430)
  assert.equal(p.browser,'webkit')
})

test('never capture private reports, client accounts, auth/checkout or signed-in query tokens',()=>{
  for(const route of [
    '/ru/app/practice','/en/client','/en/admin','/ru/api/app/auth',
    '/es/checkout','/en/account','/ru/practice?ready=service','/ru/practice#private',
    '/ru/%2e%2e/admin','//other.site/ru/practice','/ru\\app\\private'
  ]) assert.throws(()=>parseCaptureArgs(['--route',route]),/routes|tokens|paths|forbidden/,route)
  for(const origin of ['https://not-our-site.example','http://holistichouse.vercel.app','https://holistichouse.vercel.app.evil.org']){
    assert.throws(()=>parseCaptureArgs(['--origin',origin]),/canonical public Holistic House/,origin)
  }
})

test('rejects unsupported browser engines and invalid screenshot sizes',()=>{
  assert.throws(()=>parseCaptureArgs(['--browser=firefox']),/chromium or webkit/)
  assert.throws(()=>parseCaptureArgs(['--width=200']),/supported/)
  assert.throws(()=>parseCaptureArgs(['--height=99999']),/supported/)
})
