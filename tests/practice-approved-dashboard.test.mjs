import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = path => readFile(path, 'utf8')

test('approved My Practice design presents compact actions, tools and real profile/service editors in both languages', async () => {
  const [view, styles, account, client] = await Promise.all([
    source('components/app/practice-workspace.jsx'),
    source('components/app/practice-dashboard.css'),
    source('components/app/app-workspace.jsx'),
    source('app/admin/clients/page.js'),
  ])
  assert.match(view, /hh-practice-dashboard/)
  assert.match(view, /hh-practice-head/)
  assert.match(view, /hh-practice-quick/)
  assert.match(view, /hh-practice-tool-grid/)
  assert.match(view, /hh-practice-activity/)
  assert.match(view, /"addService": "Add service"/)
  assert.match(view, /"createReport": "Create report"/)
  assert.match(view, /"myData": "My data"/)
  assert.match(view, /"addService": "Добавить услугу"/)
  assert.match(view, /"createReport": "Создать отчёт"/)
  assert.match(view, /"myData": "Мои данные"/)
  assert.match(view, /<Plus aria-hidden="true" \/>/)
  assert.match(view, /openOwner\('report'\)/)
  assert.match(view, /choosePanel\('services'\)/)
  assert.match(view, /choosePanel\('profile'\)/)
  assert.match(view, /<ProfileEditor key=\{p\?\.revision/)
  assert.match(view, /<Services items=\{services\}/)
  assert.match(view, /onSave=\{\(id,draft,expectedRevision\)=>act/)
  assert.match(view, /onSave=\{\(profile,expectedRevision\)=>act/)
  assert.match(view, /activePanel&&<section id="hh-practice-workspace-detail"/)
  assert.match(view, /hh-practice-saved-services/)
  assert.match(view, /ownerTools && !activePanel && <details/)
  assert.match(view, /isOwner\?d\.privateTitle:d\.publicTools/)
  assert.match(view, /<Requests items=\{requests\}/)
  assert.match(styles, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/)
  assert.match(styles, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(styles, /@media\(max-width:760px\)/)
  assert.match(styles, /min-height:58px/)
  assert.match(account, /<PracticeWorkspace locale=\{locale\} ownerTools=\{data\.practitioner/)
  assert.match(client, /<Link key=\{client\.id\}/)
})

test('Create report passes through owner-only app-to-admin bridge and never publishes a report silently', async () => {
  const [destinations, api, selector, editor, store] = await Promise.all([
    source('lib/app/practitioner-access.js'),
    source('app/api/app/[...path]/route.js'),
    source('app/admin/reports/new/page.js'),
    source('app/admin/clients/[id]/assessments/new/page.js'),
    source('lib/clients/assessments.js'),
  ])
  assert.match(destinations, /report: '\/admin\/reports\/new'/)
  assert.match(api, /!practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  assert.match(selector, /if \(!await requireAdminRequest\(\)\) redirect\('\/admin\/login'\)/)
  assert.match(selector, /getPrescriptionStore\(\)/)
  assert.match(selector, /client\.status === 'active'/)
  assert.match(selector, /\/admin\/consultations\/new\?clientId=/)
  assert.match(selector, /Documents stay private until you explicitly share them/)
  assert.match(selector, /robots: \{ index: false, follow: false \}/)
  assert.match(editor, /AssessmentEditor/)
  assert.match(editor, /searchParams\)\?\.kind === 'research_result'/)
  assert.match(editor, /redirect\(\`\/admin\/consultations\/new\?clientId=/)
  assert.match(store, /status: 'draft'/)
  assert.match(store, /operation === 'share'/)
})

test('master header and extra tools retain privileged access separation', async () => {
  const [view, api, styles] = await Promise.all([
    source('components/app/practice-workspace.jsx'),
    source('app/api/app/[...path]/route.js'),
    source('components/app/practice-dashboard.css'),
  ])
  assert.match(view, /const isOwner=Boolean\(ownerTools\)/)
  assert.match(view, /if\(busy\|\|!isOwner\)return/)
  assert.match(view, /<PracticeTile Icon=\{UsersRound\}/)
  assert.match(view, /ownerTools && !activePanel && <details className="hh-practice-more-tools"/)
  assert.match(view, /isOwner\?d\.privateTitle:d\.publicTools/)
  assert.match(api, /joined === 'practitioner\/open'/)
  assert.match(api, /issueTrustedAdminSession/)
  assert.doesNotMatch(view, /window\.location\.assign\('\/admin/)
  assert.match(styles, /\.hh-practice-more-tools > summary/)
  assert.match(styles, /\.hh-practice-quick-primary/)
})
