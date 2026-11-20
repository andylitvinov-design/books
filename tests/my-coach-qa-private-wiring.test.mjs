import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
const api=read('app/api/app/my-coach/qa/route.js')
const repo=read('lib/app/my-coach-qa-store.js')
const sql=read('supabase/migrations/20261120053500_hh_my_coach_quality_receipts_v1.sql')
const page=read('app/admin/coaching-quality/page.jsx')
const css=read('app/admin/coaching-quality/page.module.css')

test('owner-only page is protected, no-index and renders without JSX parse errors',()=>{
  assert.match(page,/if\(!await requireAdminRequest\(\)\)redirect\('\/admin\/login'\)/)
  assert.match(page,/robots:\{index:false,follow:false\}/)
  assert.match(page,/readOwnerMyCoachQa\(getAppConfig\(\)\)/)
  const parsed=ts.createSourceFile('page.jsx',page,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX)
  assert.equal(parsed.parseDiagnostics.length,0)
  assert.match(css,/@media\(max-width:600px\)/)
})

test('server route is same-origin, verified-account and fully opt-in',()=>{
  assert.match(api,/requireSameOrigin\(request,config\)/)
  assert.match(api,/await auth\.verified\(\)/)
  assert.match(api,/normalizeMyCoachQaIntent\(raw\)/)
  assert.match(api,/HH_MY_COACH_QA_ENABLED/)
  assert.match(api,/input\.action!=='revoke'/)
  assert.match(api,/recordMyCoachQaIntent\(config,actor,raw\)/)
  assert.match(api,/readBody\(request,600\)/)
  assert.doesNotMatch(api,/console\.log|transcript|responseText|providerToken/)
})

test('server audit only exposed internally, not via client route',()=>{
  assert.match(repo,/recordMyCoachServerAudit/)
  assert.match(repo,/distillServerCoachEvidence\(audit,\{personaId,methodId\}\)/)
  assert.match(repo,/where account_id=\$1 and session_id=\$2 and persona_id=\$3 and method_id=\$4/)
  assert.doesNotMatch(api,/recordMyCoachServerAudit|evidence|coveragePercent/)
})

test('migration uses strong account-scoped RLS, revocation and no public grants',()=>{
  assert.match(sql,/on delete cascade/)
  assert.match(sql,/revoke all on app_private\.my_coach_qa_sessions from public,anon,authenticated/)
  assert.match(sql,/force row level security/)
  assert.match(sql,/for insert to hh_app_backend with check/)
  assert.match(sql,/for update to hh_app_backend using/)
  assert.match(sql,/for delete to hh_app_backend using/)
  assert.match(sql,/account_id=\(select auth\.uid\(\)\)/)
  assert.match(sql,/current_setting\('hh\.my_coach_qa_admin',true\)='owner_verified'/)
  assert.doesNotMatch(sql,/grant\s+all\s+on/i)
  assert.doesNotMatch(sql,/create\s+.*\s+security\s+definer/i)
})

test('admin must set transaction-scoped guarded predicate only after auth on page',()=>{
  assert.match(repo,/set_config\('hh\.my_coach_qa_admin','owner_verified',true\)/)
  assert.match(repo,/\},\{server:true\}\)/)
  assert.match(repo,/summarizeMyCoachQaCohort\(result.rows\)/)
  assert.match(repo,/verified_turn_observed=true/)
  assert.match(page,/Качество коучинга/)
})

test('admin CSS module scopes semantic table selectors under a local class',()=>{
  assert.match(css,/\.tableScroll table\{/)
  assert.match(css,/\.tableScroll th,\.tableScroll td\{/)
  assert.match(css,/\.tableScroll thead th\{/)
  assert.doesNotMatch(css,/(?:^|})\s*(?:table|thead|tbody|th|td|tr)\s*(?:\{|,)/m)
})
