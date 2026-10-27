import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { readTalismanRequestDraft, TALISMAN_REQUEST_DRAFT_KEY, REMOTE_SUPPORT_DRAFT_TTL } from '../lib/practitioners/remote-energy-support.js'
import { talismanFromCatalog } from '../lib/practitioners/taoist-talismans.js'

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
  // Only the exact reviewed session-local handoffs may use browser storage:
  // two report-save targets and the separate Remote Energy Support booking
  // draft and reviewed talisman-choice metadata (each two reads and one
  // explicit delete). Neither exception permits assessment answers or reports.
  const sessionTargetCall = 'consumeSessionSaveTarget(intentId,locale,window.location.origin,window.sessionStorage)'
  const supportDraftRead = 'readRemoteSupportDraft(window.sessionStorage, service.id)'
  const supportDraftDelete = 'window.sessionStorage.removeItem(REMOTE_SUPPORT_DRAFT_KEY)'
  const talismanDraftRead = 'readTalismanRequestDraft(window.sessionStorage, service.id)'
  const talismanDraftDelete = 'window.sessionStorage.removeItem(TALISMAN_REQUEST_DRAFT_KEY)'
  // An exact reviewed comment is documentation, not an additional storage operation.
  const storageDocumentation = '// navigation; no sensitive intention is written to sessionStorage or URLs.'
  const assertNoAssessmentStorage = source => {
    assert.doesNotMatch(source, /guest\/import|report\/claim|GUEST_RESULT_STORAGE_KEY/)
    assert.equal(source.split(sessionTargetCall).length - 1, 2)
    assert.equal(source.split(supportDraftRead).length - 1, 2)
    assert.equal(source.split(supportDraftDelete).length - 1, 1)
    assert.equal(source.split(talismanDraftRead).length - 1, 2)
    assert.equal(source.split(talismanDraftDelete).length - 1, 1)
    assert.doesNotMatch(source.replaceAll(sessionTargetCall, '').replaceAll(supportDraftRead, '').replaceAll(supportDraftDelete, '').replaceAll(talismanDraftRead, '').replaceAll(talismanDraftDelete, '').replaceAll(storageDocumentation, ''), /sessionStorage|localStorage/)
  }
  assertNoAssessmentStorage(workspace)
  for (const forbidden of [
    "window.sessionStorage.setItem('assessment-result', JSON.stringify(result))",
    "window.localStorage.setItem('guest-results', JSON.stringify(results))",
    "appFetch('guest/import', result)", "appFetch('report/claim', result)",
    'GUEST_RESULT_STORAGE_KEY',
  ]) assert.throws(() => assertNoAssessmentStorage(workspace + '\n' + forbidden))
  for (const changed of [
    workspace.replace(talismanDraftRead, ''), workspace + '\n' + talismanDraftRead,
    workspace.replace(talismanDraftDelete, ''), workspace + '\n' + talismanDraftDelete,
    workspace.replace(talismanDraftRead, 'readTalismanRequestDraft(window.localStorage, service.id)'),
    workspace.replace(talismanDraftDelete, 'window.sessionStorage.removeItem(REMOTE_SUPPORT_DRAFT_KEY)'),
    workspace + "\nwindow.sessionStorage.setItem(TALISMAN_REQUEST_DRAFT_KEY, JSON.stringify(result))",
  ]) assert.throws(() => assertNoAssessmentStorage(changed))
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

// Execute only isolated expressions extracted from the actual writer/submit
// source. No component, browser storage, request handler or provider is run.
function sourceExpression(source, kind) {
  const ast = ts.createSourceFile('source.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matches = []
  const visit = node => {
    if (kind === 'writer' && ts.isCallExpression(node) &&
        node.expression.getText() === 'window.sessionStorage.setItem' &&
        node.arguments[0]?.getText() === 'TALISMAN_REQUEST_DRAFT_KEY') matches.push(node.arguments[1].getText())
    if (kind === 'submit' && ts.isVariableDeclaration(node) && node.name.getText() === 'body' &&
        node.initializer && ts.isBinaryExpression(node.initializer) &&
        node.initializer.left.getText() === 'operation.current' && ts.isObjectLiteralExpression(node.initializer.right) &&
        node.initializer.right.properties.some(p => p.name?.getText() === 'talismanRequest')) matches.push(node.initializer.right.getText())
    ts.forEachChild(node, visit)
  }
  visit(ast)
  assert.equal(matches.length, 1, 'one actual talisman ' + kind + ' expression')
  return matches[0]
}
const draftNow = 1_800_000_000_000
const syntheticChoice = {
  version:1, serviceId:'synthetic-public-service', practitioner:'Synthetic public master',
  goal:'Work and money', catalogId:'fu-prosperity', savedAt:draftNow,
}
const plain = value => JSON.parse(JSON.stringify(value))
function evaluateWriter(expression, catalogId = syntheticChoice.catalogId) {
  return JSON.parse(runInNewContext(expression, {
    JSON, Date:{ now:() => draftNow },
    selected:{ serviceId:syntheticChoice.serviceId, name:syntheticChoice.practitioner,
      assessmentAnswers:['SYNTHETIC_ANSWER'], privateNote:'SYNTHETIC_PRIVATE' },
    topic:syntheticChoice.goal, catalogId, talismanFromCatalog,
    intention:'SYNTHETIC_INTENTION', assessmentAnswers:['SYNTHETIC_ANSWER'],
  }, { timeout:1000 }))
}
function assertDraftPayload(value, expected) {
  assert.deepEqual(value, expected, 'TALISMAN_WRITER_FIELDS')
  const getItem = key => { assert.equal(key, TALISMAN_REQUEST_DRAFT_KEY); return JSON.stringify(value) }
  assert.deepEqual(readTalismanRequestDraft({ getItem }, expected.serviceId, draftNow), expected)
  assert.equal(readTalismanRequestDraft({ getItem }, 'other-service', draftNow), null)
  assert.equal(readTalismanRequestDraft({ getItem }, expected.serviceId, draftNow + REMOTE_SUPPORT_DRAFT_TTL + 1), null)
}

test('talisman login handoff serializes only the reviewed writer fields, never free text or answers', async () => {
  const source = await readFile('components/remote-energy-support-booking.tsx', 'utf8')
  const expression = sourceExpression(source, 'writer')
  assertDraftPayload(evaluateWriter(expression), syntheticChoice)
  const { catalogId, ...withoutCatalog } = syntheticChoice
  assertDraftPayload(evaluateWriter(expression, null), withoutCatalog)
  // Known-passing real expression above prevents vacuous mutant acceptance.
  for (const added of ['intention,', 'assessmentAnswers,', '...selected,']) {
    const changed = source.replace('goal: topic,', 'goal: topic, ' + added)
    assert.notEqual(changed, source)
    assert.throws(() => assertDraftPayload(evaluateWriter(sourceExpression(changed, 'writer')), syntheticChoice), /TALISMAN_WRITER_FIELDS/)
  }
  for (const extra of [{ intention:'SYNTHETIC_INTENTION' }, { assessmentAnswers:['SYNTHETIC_ANSWER'] }, { report:{ id:'synthetic-report' } }]) {
    assert.equal(readTalismanRequestDraft({ getItem:() => JSON.stringify({ ...syntheticChoice, ...extra }) }, syntheticChoice.serviceId, draftNow), null)
  }
})

function assertSubmitBoundary(source, draft) {
  const body = plain(runInNewContext('(' + sourceExpression(source, 'submit') + ')', {
    service:{ id:syntheticChoice.serviceId }, crypto:{ randomUUID:() => 'synthetic-operation' },
    contact:'synthetic-contact', note:'SYNTHETIC_EXPLICIT_REQUEST', remoteDraft:null,
    talismanDraft:draft, shareId:'synthetic-unrelated-report', confirmed:true,
  }, { timeout:1000 }))
  assert.deepEqual(body.talismanRequest, { version:1, goal:draft.goal,
    ...(draft.catalogId ? { catalogId:draft.catalogId } : {}) }, 'TALISMAN_SUBMIT_FIELDS')
  assert.equal(body.shareResultId, null, 'TALISMAN_REPORT_ATTACHMENT')
  assert.equal(body.contact, 'Via Holistic House portal')
  assert.equal(body.serviceId, syntheticChoice.serviceId)
  assert.equal(body.message, 'SYNTHETIC_EXPLICIT_REQUEST')
  assert.equal(JSON.stringify(body).includes('SYNTHETIC_INJECTED_ANSWER'), false)
}
test('explicit talisman submit projects known metadata and never attaches a report', async () => {
  const source = await readFile('components/app/app-workspace.jsx', 'utf8')
  // Extra source-state fields are a synthetic fault injection: the strict reader
  // rejects them; the independent submit projection must not copy them either.
  const draft = { ...syntheticChoice, assessmentAnswers:['SYNTHETIC_INJECTED_ANSWER'] }
  assertSubmitBoundary(source, draft)
  const { catalogId, ...withoutCatalog } = draft
  assertSubmitBoundary(source, withoutCatalog)
  for (const [before, after, reason] of [
    ['{ version:1, goal:talismanDraft.goal,', '{ ...talismanDraft, version:1, goal:talismanDraft.goal,', /TALISMAN_SUBMIT_FIELDS/],
    ['shareResultId: (remoteDraft || talismanDraft) ? null : (shareId || null),', 'shareResultId: shareId || null,', /TALISMAN_REPORT_ATTACHMENT/],
  ]) {
    const changed = source.replace(before, after)
    assert.notEqual(changed, source)
    assert.throws(() => assertSubmitBoundary(changed, draft), reason)
  }
})
