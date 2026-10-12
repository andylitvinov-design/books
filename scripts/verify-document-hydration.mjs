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
 // Complete cold dev compilation before opening a hydrated document. Compiling
 // the shared API route while that document hydrates triggers Fast Refresh and
 // replaces its server-component nonce with one from an RSC response, whose CSP
 // does not replace the document's policy. This is server readiness, not a retry
 // or an exception to the document/nonce assertions below.
 const warmup=await browser.newContext()
 try{
  for(const [path,status] of [['/api/app/bootstrap',401],['/api/app/guest/bootstrap',401],['/en/app',200],['/ru/app',200],['/en/client',200],['/ru/client',200],['/icon.svg',200]]){
   const response=await warmup.request.get(origin+path)
   assert.equal(response.status(),status,'isolated route must compile before browser acceptance: '+path)
  }
 }finally{await warmup.close()}
 for(const locale of ['en','ru'])for(const route of ['app','client']){
  const page=await browser.newPage(),path='/'+locale+'/'+route
  const documents=[]
  page.on('response',response=>{
   const request=response.request()
   if(request.isNavigationRequest()&&request.frame()===page.mainFrame())documents.push(response)
  })
  page.on('pageerror',error=>errors.push({path,message:error.message}))
  page.on('console',message=>{
   if(message.type()==='error'&&/hydrat(?:e|ed|ion)|server rendered HTML/i.test(message.text()))errors.push({path,message:message.text()})
  })
  await page.goto(origin+path)
  if(route==='app')await expect(page.getByRole('button',{name:locale==='ru'?'Продолжить с Google':'Continue with Google',exact:true})).toBeVisible()
  else await expect(page.locator('[data-prelogin-test-picker]')).toBeVisible()
  await page.waitForLoadState('networkidle')
  // Cold Next dev compilation can reload the document. Compare the live DOM
  // with its own navigation response, never the previous document's nonce.
  const response=documents.at(-1)
  assert.ok(response?.ok())
  assert.equal(response.url(),page.url())
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
  assert.equal(documents.at(-1),response,'document must remain stable during its assertions')
  console.log('DOCUMENT_HYDRATION_NAVIGATIONS',path,documents.length)
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
