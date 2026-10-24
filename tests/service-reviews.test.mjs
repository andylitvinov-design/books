import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const migration='supabase/migrations/20261017170000_hh_service_reviews.sql'

test('service reviews persist with ownership, unique membership and RLS',async()=>{
  const sql=await readFile(migration,'utf8')
  assert.match(sql,/unique\(service_id,reviewer_account_id\)/i)
  assert.match(sql,/alter table app\.service_reviews enable row level security/i)
  assert.match(sql,/alter table app\.service_reviews force row level security/i)
  assert.match(sql,/revoke all on app\.service_reviews from public,anon,authenticated,hh_app_inbox/i)
  assert.match(sql,/grant update\(display_name,rating,body,updated_at\) on app\.service_reviews to hh_app_backend/i)
  assert.doesNotMatch(sql,/grant update\(.*status.*\).*hh_app_backend/i)
  assert.match(sql,/reviewer_account_id=\(select auth\.uid\(\)\)/)
  assert.match(sql,/p\.trusted_auth_user_id is distinct from \(select auth\.uid\(\)\)/)
  assert.match(sql,/status='published' or/)
})
test('public reads are scoped and posting requires verified, same-origin membership',async()=>{
  const [route,repository,component,page]=await Promise.all([
    readFile('app/api/marketplace/reviews/route.js','utf8'),
    readFile('lib/practitioners/reviews.js','utf8'),
    readFile('components/service-reviews.tsx','utf8'),
    readFile('app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx','utf8'),
  ])
  assert.match(route,/auth\.verified\(\)/)
  assert.match(route,/requireSameOrigin\(request,config\)/)
  assert.match(route,/consumeRate\(config/)
  assert.match(route,/PRIVATE_HEADERS/)
  assert.match(repository,/await account\(db,actor\)/)
  assert.match(repository,/service_id=\$1 and status='published'/)
  assert.match(repository,/reviewer_account_id=\$2/)
  assert.match(repository,/SELF_REVIEW_NOT_ALLOWED/)
  assert.match(repository,/REVIEW_MODERATED/)
  assert.match(repository,/Array\.from\(body\)\.length<50/)
  assert.match(component,/minLength=\{50\}/)
  assert.match(component,/disabled=\{saving\|\|bodyCharacterCount<50\}/)
  assert.match(component,/COPY=\{[\s\S]*en:\{/)
  assert.match(component,/ru:\{/)
  assert.match(component,/es:\{/)
  assert.match(component,/href=\{"\/"\+\(language==="es"\?"en":language\)\+"\/app"\}/)
  assert.match(page,/<ServiceReviews serviceId=\{service\.id\} locale=\{locale\}/)
  assert.match(page,/<Link href="#reviews">/)
})
function assertServerChild(result){
  assert.equal(result.error,undefined,'Child could not start')
  assert.equal(result.signal,null,'Child was terminated')
  assert.equal(result.status,0,result.stdout+result.stderr)
  assert.match(result.stdout,/^# tests [1-9]\d*$/m, 'Child must actually execute tests')
  assert.match(result.stdout,/^ok \d+ - validation trims names, keeps display content and rejects spoofed ratings$/m, 'Pure server contract must execute')
}
test('server-only wrapper rejects failed, skipped, missing and interrupted child results',()=>{
  const success={status:0,signal:null,stdout:'ok 3 - validation trims names, keeps display content and rejects spoofed ratings\n# tests 3\n',stderr:''}
  assert.doesNotThrow(()=>assertServerChild(success))
  for(const failed of [
    {...success,status:1}, {...success,status:null}, {...success,signal:'SIGTERM'},
    {...success,error:new Error('SPAWN_FAILED')}, {...success,stdout:''},
    {...success,stdout:'# tests 0\n'},
    {...success,stdout:success.stdout.replace('ratings\n','ratings # SKIP\n')},
    {...success,stdout:success.stdout.replace('ratings\n','ratings # TODO\n')}, {...success,stdout:'ok 1 - unrelated test\n# tests 1\n'},
  ])assert.throws(()=>assertServerChild(failed))
})
if(!process.execArgv.includes('--conditions=react-server')){
  test('service review validation (server-only contract)',()=>{
    // Inheriting NODE_TEST_CONTEXT makes Node silently skip a nested --test run with status 0.
    const env={...process.env};delete env.NODE_TEST_CONTEXT
    const result=spawnSync(process.execPath,['--conditions=react-server','--test','--test-reporter=tap',fileURLToPath(import.meta.url)],{encoding:'utf8',env})
    assertServerChild(result)
  })
}else{
  const {checkReviewInput}=await import('../lib/practitioners/reviews.js')
  const base={serviceId:'11111111-1111-4111-8111-111111111111',rating:5,displayName:' Example Person ',body:'A detailed first-hand account of the session and how it felt afterward.'}
  test('validation trims names, keeps display content and rejects spoofed ratings',()=>{
    const clean=checkReviewInput(base)
    assert.equal(clean.displayName,'Example Person')
    assert.equal(clean.rating,5)
    for(const body of ['x'.repeat(49),'🌱'.repeat(49)])assert.throws(()=>checkReviewInput({...base,body}),/INVALID_REVIEW/)
    assert.equal(checkReviewInput({...base,body:'🌱'.repeat(50)}).body,'🌱'.repeat(50))
    for(const rating of [0,6,2.2,'5',null]){
      assert.throws(()=>checkReviewInput({...base,rating}),/INVALID_RATING/)
    }
    assert.throws(()=>checkReviewInput({...base,serviceId:'fake'}),/INVALID_ID/)
    assert.throws(()=>checkReviewInput({...base,body:'bad'}),/INVALID_REVIEW/)
    // The old 47-character fixture fails the minimum-length guard before PII checks.
    assert.throws(()=>checkReviewInput({...base,body:'Email me at test@example.com for results, please.'}),/INVALID_REVIEW/)
    for(const suffix of [' Email fictional@example.test for further details.', ' Contact +1 (416) 555-0123 for further details.', ' Disallowed control: \u0001']){
      const body=base.body+suffix
      assert.ok(Array.from(body).length>=50&&body.length<=1200,'PII fixture must reach the content filter')
      assert.throws(()=>checkReviewInput({...base,body}),error=>error.code==='REVIEW_PERSONAL_DATA'&&error.status===422)
    }
  })
}
