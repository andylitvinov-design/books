import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  expressReportDate, expressReportScore, normalizeExpressReportContent,
  validateExpressReportCreate, validateExpressReportEdit,
  validateExpressReportTransition, requireExpressReportReady,
} from '../lib/practitioners/express-report-contracts.js'

const read = path => readFileSync(new URL('../'+path, import.meta.url), 'utf8')
const id = '12345678-1234-4234-8234-123456789abc'
const requestId = 'd1234567-1234-4234-8234-123456789abc'
const body = () => ({
  title: 'Situation review', situation: 'Career decision',
  findings: 'We mapped competing needs',
  resources: 'Support network', steps: 'Choose a next action',
  followUp: 'Check again in 2 weeks', progressBefore: '2.5', progressAfter: '6',
})
const create = () => ({
  operationId:id, requestId, language:'en', issuedOn:'2026-10-25', content:body(),
})

test('express report accepts EN/RU/ES, structured before/after scales, and real dates', () => {
  for (const language of ['en','ru','es']) {
    const record = validateExpressReportCreate({...create(),language})
    assert.equal(record.content.progressBefore,2.5)
    assert.equal(record.content.progressAfter,6)
  }
  assert.equal(expressReportDate('2026-10-25'),'2026-10-25')
  assert.equal(expressReportScore(null),null)
  assert.equal(expressReportScore('10.0'),10)
  assert.equal(expressReportScore('0.1'),.1)
  for (const value of ['2026-02-30','2026-13-01','not a date',null])
    assert.throws(()=>expressReportDate(value),/INVALID_REPORT_DATE/)
  for (const value of ['-1','10.1','1.11','Infinity',NaN,' 2 ','2e0'])
    assert.throws(()=>expressReportScore(value),/INVALID_REPORT_SCORE/)
})

test('express report rejects medicinal/prescription properties at both levels', () => {
  for (const property of ['remedies','potency','dosage','homeopathicRemedies','bachFlowers']) {
    assert.throws(()=>validateExpressReportCreate({...create(),[property]: []}),/UNKNOWN_FIELD/)
    assert.throws(()=>normalizeExpressReportContent({...body(),[property]: 'unallowed'}),/UNKNOWN_FIELD/)
  }
  assert.throws(()=>normalizeExpressReportContent({...body(),title:''}),/REPORT_TITLE_REQUIRED/)
  assert.throws(()=>normalizeExpressReportContent({...body(),findings:'x'.repeat(4001)}),/INVALID_REPORT_TEXT/)
  assert.throws(()=>validateExpressReportCreate({...create(),language:'de'}),/INVALID_REPORT_LANGUAGE/)
  assert.throws(()=>validateExpressReportCreate({...create(),requestId:'other'}),/INVALID_ID/)
  assert.throws(()=>validateExpressReportCreate({...create(),content:null}),/INVALID_OBJECT/)
})

test('only complete drafts can publish, with optimistic revisions', () => {
  assert.ok(requireExpressReportReady(validateExpressReportCreate(create()).content))
  assert.throws(()=>requireExpressReportReady({...body(),steps:''}),/REPORT_INCOMPLETE/)
  assert.deepEqual(validateExpressReportTransition({action:'publish',expectedRevision:1}),
    {action:'publish',expectedRevision:1})
  for (const action of ['delete','dispatch','pay','remedy'])
    assert.throws(()=>validateExpressReportTransition({action,expectedRevision:1}),/INVALID_REPORT_ACTION/)
  assert.throws(()=>validateExpressReportTransition({action:'revoke',expectedRevision:0}),/INVALID_REPORT_ACTION/)
  assert.throws(()=>validateExpressReportEdit({language:'en',issuedOn:'2026-10-25',content:body(),expectedRevision:'1'}),/INVALID_REVISION/)
})

test('the existing owner-only full report bridge remains server-guarded', () => {
  const owner = read('lib/app/practitioner-access.js')
  const route = read('app/api/app/[...path]/route.js')
  const admin = read('lib/prescriptions/admin-session.js')
  const practice = read('components/app/practice-workspace.jsx')
  assert.match(owner,/practitionerEmailAllowed/)
  assert.match(admin,/practitionerEmailAllowed/)
  assert.match(route,/joined === 'practitioner\/open'/)
  assert.match(route,/!practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(practice,/isOwner&&<button type="button" disabled=\{busy\} onClick=\{\(\)=>openOwner\('report'\)\}/)
  assert.match(practice,/activePanel==='express-reports'/)
  assert.match(practice,/<PracticeExpressReports /)
  assert.match(practice,/owner=\{isOwner\}/)
})

test('only authenticated request clients receive express reports, not public leads or drafts', () => {
  const endpoint = read('app/api/app/[...path]/route.js')
  const repository = read('lib/practitioners/express-report-repository.js')
  const practiceRepo = read('lib/practitioners/repository.js')
  const migration = read('supabase/migrations/20261025173000_hh_practitioner_express_reports.sql')
  const clientUi = read('components/app/app-workspace.jsx')
  assert.match(endpoint,/joined === 'practice\/express-reports'/)
  assert.match(endpoint,/joined === 'express-reports' && method === 'GET'/)
  assert.match(endpoint,/practiceRepo\.requireActivated\(actor\)/)
  assert.match(endpoint,/await auth\.verified\(\)/)
  assert.match(repository,/JOIN app\.practitioners p ON p\.id=r\.recipient_practitioner_id/)
  assert.match(repository,/r\.id=\$1 AND p\.trusted_auth_user_id=\$2/)
  assert.match(repository,/client_account_id=\$1 AND status='published'/)
  assert.match(repository,/PUBLISHED_REPORT_IMMUTABLE/)
  assert.match(repository,/practice\.express_report/)
  assert.match(practiceRepo,/accountRequest:true/)
  assert.match(migration,/FORCE ROW LEVEL SECURITY/)
  assert.match(migration,/REVOKE ALL ON app\.practitioner_express_reports FROM PUBLIC,anon,authenticated/)
  assert.match(migration,/status='published' AND client_account_id=\(SELECT auth\.uid\(\)\)/)
  assert.match(migration,/WHERE r\.id=request_id AND r\.account_id=client_account_id/)
  assert.match(clientUi,/<ClientExpressReports locale=\{locale\} accountId=\{data\.account\.id\}/)
})

test('New express report opens a draft editor without an eligible request but cannot save it unlinked', () => {
  const ui = read('components/app/practice-express-reports.jsx')
  const practice = read('components/app/practice-workspace.jsx')
  const css = read('components/app/practice-express-reports.module.css')
  assert.match(ui, /function startNew\(\) \{[\s\S]*?setComposing\(true\)/)
  assert.match(ui, /onClick=\{startNew\} aria-expanded=\{composing\}/)
  assert.match(ui, /setEditorActivation\(value => value\+1\)/)
  assert.match(ui, /ref=\{editorHeadingRef\} tabIndex=\{-1\}/)
  assert.match(ui, /\{\(composing \|\| current\) && <form/)
  assert.doesNotMatch(ui, /\{eligible\.length \? <form/)
  assert.match(ui, /disabled=\{busy \|\| !requestId\}/)
  assert.match(ui, /!eligible\.length && <div className=\{styles\.prerequisite\}/)
  assert.match(ui, /\/services\/free-situation-review/)
  assert.match(practice, /onOpenRequests=\{\(\)=>choosePanel\('requests'\)\}/)
  assert.match(css, /\.prerequisiteActions/)
  for (const language of ['en', 'ru', 'es']) {
    assert.match(ui, new RegExp(language + ': \\{[\\s\\S]*?noClientTitle:'))
  }
  assert.match(ui, /setComposing\(true\)[\s\S]*?setRequestId\(item\.requestId\)/)
})
