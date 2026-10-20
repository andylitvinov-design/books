import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8')

test('single Growth Studio URL continues to the same protected page after sign-in',()=>{
  const page=read('app/admin/growth-studio/page.js')
  const login=read('app/admin/login/page.js')
  const auto=read('components/practitioner-auto-entry.jsx')
  const route=read('app/api/app/[...path]/route.js')
  assert.match(page,/requireAdminRequest\(\)/)
  assert.match(page,/redirect\('\/admin\/login\?next=growth-studio'\)/)
  assert.match(login,/params\?\.next === 'growth-studio' \? 'growth-studio' : null/)
  assert.match(login,/if \(await requireAdminRequest\(\)\) redirect\(next \? '\/admin\/growth-studio' : '\/admin'\)/)
  assert.match(login,/PractitionerAutoEntry locale=\{locale\} next=\{next\}/)
  assert.match(auto,/response\.redirectUrl !== '\/admin'/)
  assert.match(auto,/window\.location\.replace\(next === 'growth-studio' \? '\/admin\/growth-studio' : '\/admin'\)/)
  assert.match(auto,/continueTo: next === 'growth-studio' \? 'growth-studio' : 'practitioner'/)
  assert.match(route,/continueTo === 'growth-studio'/)
  assert.match(route,/\/admin\/login\?next=growth-studio/)
  assert.match(route,/issueTrustedAdminSession\(response/)
})

test('fixed, closed OAuth redirect target does not accept external URLs, arbitrary paths or secrets',()=>{
  const login=read('app/admin/login/page.js')
  const auto=read('components/practitioner-auto-entry.jsx')
  const route=read('app/api/app/[...path]/route.js')
  const allow=(route.match(/'growth-studio'\]\.includes\(continueTo\)/g)||[]).length
  assert.equal(allow,2,'start and callback must restrict the new continuation type')
  assert.match(route,/onlyKeys\(body, \['locale', 'intentId', 'serviceId', 'continueTo'/)
  assert.match(route,/requireSameOrigin\(request, config\)/)
  assert.doesNotMatch(login,/new URL\(params\?\.next|redirect\(params\?\.next\)/)
  assert.doesNotMatch(auto,/window\.location\.replace\(next\)|window\.location\.assign\(next\)/)
  assert.match(auto,/response\.redirectUrl !== '\/admin'/)
  assert.match(login,/params\?\.next === 'growth-studio'/)
})

test('ordinary practitioner login and existing OAuth choices are preserved',()=>{
  const login=read('app/admin/login/page.js')
  const auto=read('components/practitioner-auto-entry.jsx')
  const route=read('app/api/app/[...path]/route.js')
  assert.match(login,/redirect\(next \? '\/admin\/growth-studio' : '\/admin'\)/)
  assert.match(auto,/next = null/)
  assert.match(auto,/continueTo: next === 'growth-studio' \? 'growth-studio' : 'practitioner'/)
  assert.match(route,/continueTo === 'practitioner'/)
  assert.match(route,/\/admin\/login/)
  assert.match(route,/continueTo === 'my-tests'/)
  assert.match(route,/continueTo === 'my-courses'/)
})
