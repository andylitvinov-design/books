import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('report invitation uses fragment exchange, report-scoped viewer and explicit save intent', async () => {
  const [projection, flow, view, appApi, page, migration, worker, middleware] = await Promise.all([
    readFile('lib/clients/assessment-share.js', 'utf8'),
    readFile('lib/app/report-flow.js', 'utf8'),
    readFile('components/app/shared-report-view.jsx', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('app/[locale]/report/[assessmentId]/page.jsx', 'utf8'),
    readFile('supabase/migrations/20261003011500_hh_app_guest_report_flows.sql', 'utf8'),
    readFile('public/sw.js', 'utf8'),
    readFile('middleware.ts', 'utf8'),
  ])

  assert.match(projection, /publicAssessmentView/)
  assert.doesNotMatch(projection, /clientId:/)
  assert.doesNotMatch(projection, /relatedDocumentIds/)

  assert.match(flow, /report_grants/)
  assert.match(flow, /report_viewer_sessions/)
  assert.match(flow, /secret_hash/)
  assert.match(flow, /saveAllowed/)
  assert.match(flow, /commitReportSaveIntent/)
  assert.match(flow, /bound_account_id/)
  assert.match(flow, /liveSource/)
  assert.doesNotMatch(flow, /legacy cabinet|account\.report/i)

  assert.match(view, /window\.location\.hash/)
  assert.match(view, /history\.replaceState/)
  assert.match(view, /report-viewer\/exchange/)
  assert.match(view, /report-viewer\//)
  assert.match(view, /Save this report to my Cabinet/)
  assert.match(view, /save-intents/)
  assert.match(view, /intentId/)
  assert.doesNotMatch(view, /report\/claim/)
  assert.doesNotMatch(view, /sessionStorage|localStorage/)

  assert.match(appApi, /report-viewer\/exchange/)
  assert.match(appApi, /createReportSaveIntent/)
  assert.match(appApi, /commitReportSaveIntent/)
  assert.match(appApi, /save-intents/)
  assert.doesNotMatch(appApi, /report\/claim/)
  assert.doesNotMatch(appApi, /guest\/import/)

  assert.match(page, /\^\[A-Za-z0-9_-\]\{22\}\$/)
  assert.match(page, /robots: \{ index: false, follow: false \}/)
  assert.match(migration, /create table app_private\.report_grants/)
  assert.match(migration, /create table app_private\.report_viewer_sessions/)
  assert.match(migration, /create table app_private\.save_intents/)
  assert.match(migration, /create table app\.saved_reports/)
  assert.match(worker, /\/en\/report\//)
  assert.match(middleware, /report/)
})

test('Cabinet guest flow is server-backed and never auto-imports on ordinary login', async () => {
  const [landing, workspace, guestRepo, migration, route, clientPage] = await Promise.all([
    readFile('components/app/cabinet-landing.jsx', 'utf8'),
    readFile('components/app/app-workspace.jsx', 'utf8'),
    readFile('lib/app/guest-repository.js', 'utf8'),
    readFile('supabase/migrations/20261003011500_hh_app_guest_report_flows.sql', 'utf8'),
    readFile('app/api/app/[...path]/route.js', 'utf8'),
    readFile('app/[locale]/client/page.tsx', 'utf8'),
  ])

  assert.match(landing, /guest\/session/)
  assert.match(landing, /guest\/runs/)
  assert.match(landing, /guest\/results/)
  assert.match(landing, /save-intents/)
  assert.doesNotMatch(landing, /sessionStorage|localStorage|GUEST_RESULT_STORAGE_KEY/)
  // Only reviewed session-local navigation pointers may use browser storage:
  // two report-save targets and the separate Remote Energy Support booking
  // draft (two reads and one explicit delete). None stores assessment answers.
  const sessionTargetCall = 'consumeSessionSaveTarget(intentId,locale,window.location.origin,window.sessionStorage)'
  const supportDraftRead = 'readRemoteSupportDraft(window.sessionStorage, service.id)'
  const supportDraftDelete = 'window.sessionStorage.removeItem(REMOTE_SUPPORT_DRAFT_KEY)'
  const assertNoAssessmentStorage = source => {
    assert.doesNotMatch(source, /guest\/import|report\/claim|GUEST_RESULT_STORAGE_KEY/)
    assert.equal(source.split(sessionTargetCall).length - 1, 2)
    assert.equal(source.split(supportDraftRead).length - 1, 2)
    assert.equal(source.split(supportDraftDelete).length - 1, 1)
    assert.doesNotMatch(source.replaceAll(sessionTargetCall, '').replaceAll(supportDraftRead, '').replaceAll(supportDraftDelete, ''), /sessionStorage|localStorage/)
  }
  assertNoAssessmentStorage(workspace)
  for (const forbidden of [
    "window.sessionStorage.setItem('assessment-result', JSON.stringify(result))",
    "window.localStorage.setItem('guest-results', JSON.stringify(results))",
    "appFetch('guest/import', result)", "appFetch('report/claim', result)",
    'GUEST_RESULT_STORAGE_KEY',
  ]) assert.throws(() => assertNoAssessmentStorage(workspace + '\n' + forbidden))
  assert.match(workspace, /SaveContinuation/)
  assert.match(workspace, /confirmed: true/)
  assert.match(guestRepo, /app_private\.guest_sessions/)
  assert.match(guestRepo, /app_private\.guest_runs/)
  assert.match(guestRepo, /app_private\.guest_results/)
  assert.match(migration, /expires_at/)
  assert.match(route, /guest\/session/)
  assert.match(route, /save-intents/)
  assert.doesNotMatch(clientPage, /redirect\(/)
  assert.match(clientPage, /legacySelector/)
})
