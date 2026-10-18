import test from 'node:test'
import assert from 'node:assert/strict'
import { cabinetArchiveRedirect } from '../lib/app/cabinet-redirect.js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

for (const locale of ['en', 'ru']) for (const method of ['GET', 'HEAD']) {
  test(locale + ' archive redirect is a fixed same-origin destination for ' + method, () => {
    for (const suffix of ['', '/', '?next=https://example.invalid&token=ignored']) {
      const result = cabinetArchiveRedirect('https://house.example/' + locale + '/app/analysis' + suffix, method)
      assert.equal(result.href, 'https://house.example/' + locale + '/app/portrait#personal-reports')
      assert.equal(result.search, '')
    }
  })
}
test('mutations, current routes, unsupported locales and unrelated paths do not redirect', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
    assert.equal(cabinetArchiveRedirect('https://house.example/en/app/analysis', method), null)
  for (const path of ['/', '/en/app/portrait', '/en/app/analysis/id', '/es/app/analysis', '/en/app/analysis-other', '/api/app/analysis', '/en/client/analysis', '//en/app/analysis'])
    assert.equal(cabinetArchiveRedirect('https://house.example' + path), null)
})

test('actual middleware redirects before rendering and retains every private response header', () => {
  const source=readFileSync(new URL('../middleware.ts',import.meta.url),'utf8')
    .replace(/^import .*\n/gm,'').replaceAll(': string','').replaceAll(': NextRequest','')
    .replace('export function middleware','function middleware').replace('export const config','const config')
  const response=(status,url)=>({status,headers:new Headers(url?{location:url.href}:{} )})
  const NextResponse={redirect:(url,status)=>response(status,url),next:()=>response(200)}
  const middleware=new Function('NextResponse','crypto','canonicalRedirectTarget','privateMigrationBridge','cabinetArchiveRedirect',source+';return middleware')(NextResponse,{randomUUID},()=>null,()=>null,cabinetArchiveRedirect)
  for(const locale of ['en','ru']) for(const method of ['GET','HEAD']) {
    const url='https://house.example/'+locale+'/app/analysis?next=https://evil.invalid'
    const result=middleware({url,method,nextUrl:new URL(url),headers:new Headers(),cookies:{get:()=>undefined}})
    assert.equal(result.status,307)
    assert.equal(result.headers.get('location'),'/'+locale+'/app/portrait#personal-reports')
    assert.match(result.headers.get('cache-control'),/private, no-store/)
    assert.equal(result.headers.get('referrer-policy'),'no-referrer')
    assert.equal(result.headers.get('x-frame-options'),'DENY')
    assert.equal(result.headers.get('x-content-type-options'),'nosniff')
    assert.equal(result.headers.get('x-robots-tag'),'noindex, nofollow, noarchive')
    assert.match(result.headers.get('content-security-policy'),/frame-src 'none'/)
    assert.match(result.headers.get('content-security-policy'),/connect-src 'self';/)
  }
})
