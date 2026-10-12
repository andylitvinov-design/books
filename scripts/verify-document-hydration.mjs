// Synthetic loopback-only document hydration and CSP regression.
import { chromium, webkit, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { assertIsolated } from '../tests/helpers/app-db-setup.mjs'

assertIsolated()
const origin=process.env.HH_TEST_APP_ORIGIN || 'http://127.0.0.1:3100'
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/)
const engine=process.env.HH_TEST_BROWSER==='webkit'?webkit:chromium
const browser=await engine.launch(process.env.HH_TEST_BROWSER_EXECUTABLE?{executablePath:process.env.HH_TEST_BROWSER_EXECUTABLE}:{})
const checks=[],errors=[],nonces=new Set()
try{
 for(const locale of ['en','ru'])for(const route of ['app','client']){
  const page=await browser.newPage(),path='/'+locale+'/'+route
  page.on('pageerror',error=>errors.push({path,message:error.message}))
  page.on('console',message=>{
   if(message.type()==='error'&&/hydrat(?:e|ed|ion)|server rendered HTML/i.test(message.text()))errors.push({path,message:message.text()})
  })
  const response=await page.goto(origin+path)
  assert.ok(response.ok())
  if(route==='app')await expect(page.getByRole('button',{name:locale==='ru'?'Продолжить с Google':'Continue with Google',exact:true})).toBeVisible()
  else await expect(page.locator('[data-prelogin-test-picker]')).toBeVisible()
  await page.waitForLoadState('networkidle')
  const policy=response.headers()['content-security-policy']
  const nonce=policy.match(/'nonce-([^']+)'/)?.[1]
  assert.match(nonce,/^[a-f0-9]{32}$/)
  assert.ok(!nonces.has(nonce),'CSP nonce must be unique per document')
  nonces.add(nonce)
  assert.ok(policy.includes("'strict-dynamic'"))
  assert.ok(!policy.split(';').find(d=>d.trim().startsWith('script-src')).includes("'unsafe-inline'"))
  const html=await response.text(),serialized=html.match(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)
  assert.ok(serialized,'server must include JSON-LD')
  assert.ok(serialized[0].includes('nonce="'+nonce+'"'))
  const rendered=await page.locator('head script[type="application/ld+json"]').evaluate(script=>({nonce:script.nonce,attribute:script.getAttribute('nonce'),schema:JSON.parse(script.textContent)}))
  assert.equal(rendered.nonce,nonce,'hydration must retain the CSP nonce property')
  assert.equal(rendered.attribute,'','browser must keep the nonce content attribute hidden')
  assert.deepEqual(rendered.schema,JSON.parse(serialized[1]),'hydration must retain the complete server JSON-LD')
  assert.equal(rendered.schema['@type'],'WebSite')
  assert.equal(rendered.schema.name,'Holistic House')
  assert.deepEqual(rendered.schema.inLanguage,['en','ru','es'])
  assert.equal(await page.locator('html').getAttribute('lang'),locale)
  await page.close()
  assert.deepEqual(errors,[])
  checks.push(path+' preserves unique CSP nonce and complete JSON-LD without hydration errors')
  console.log('PASS '+checks.at(-1))
 }
 assert.deepEqual(errors,[])
 const output='artifacts/app-r1/document-hydration-'+engine.name()
 await mkdir(output,{recursive:true})
 await writeFile(output+'/verification.json',JSON.stringify({commit:process.env.GITHUB_SHA,browser:await browser.version(),checks,production:'UNCHANGED'},null,2))
}finally{await browser.close()}
