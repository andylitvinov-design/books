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
  assert.match(view, /ownerTools && <details/)
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
  const [destinations, api, entry, studio, editor, store] = await Promise.all([
    source('lib/app/practitioner-access.js'),
    source('app/api/app/[...path]/route.js'),
    source('app/admin/reports/new/page.js'),
    source('app/admin/consultations/new/page.js'),
    source('app/admin/clients/[id]/assessments/new/page.js'),
    source('lib/clients/assessments.js'),
  ])
  assert.match(destinations, /report: '\/admin\/reports\/new'/)
  assert.match(api, /!practitionerEmailAllowed\(actor\) \|\| !await repo\.isPractitioner\(actor\)/)
  const verifiedActor = api.indexOf('    const actor = await auth.verified(),')
  const bridge = api.indexOf("    if (joined === 'practitioner/open' && method === 'POST') {")
  assert.ok(verifiedActor >= 0 && bridge > verifiedActor)
  assert.match(api.slice(verifiedActor, bridge), /if \(expectedAccount && expectedAccount !== actor\.id\) throw new AppError\('ACCOUNT_CHANGED',409\)/)
  assert.ok(api.slice(bridge).startsWith([
    "    if (joined === 'practitioner/open' && method === 'POST') {",
    '      const body = await readBody(request)',
    "      onlyKeys(body, ['destination', 'clientId'])",
    "      if (!practitionerEmailAllowed(actor) || !await repo.isPractitioner(actor)) throw new AppError('NOT_FOUND', 404)",
    "      const isClient = body.destination === 'client'",
    '      if (isClient) requireUUID(body.clientId)',
    "      else if (body.clientId !== undefined) throw new AppError('INVALID_INPUT', 400)",
    '      const destination = isClient',
    "        ? '/admin/clients/' + body.clientId",
    '        : practitionerDestination[body.destination]',
    "      if (!destination) throw new AppError('NOT_FOUND', 404)",
    '      if (isClient) {',
    '        const store = getPrescriptionStore()',
    "        if (!store) throw new AppError('CLIENT_STORAGE_UNAVAILABLE', 503)",
    "        if (!await store.findClientById(body.clientId)) throw new AppError('NOT_FOUND', 404)",
    '      }',
    '      const response = json({ redirectUrl: destination })',
    '      if (!issueTrustedAdminSession(response, { secure: !config.test }))',
    "        throw new AppError('PRACTITIONER_UNAVAILABLE', 503)",
    '      return response',
    '    }',
  ].join('\n')), 'the report bridge must remain owner-only and fail closed on destinations')
  assert.match(entry, /if \(!await requireAdminRequest\(\)\) redirect\('\/admin\/login'\)/)
  assert.match(entry, /redirect\(validUuid\(clientId\)/)
  assert.ok(entry.includes('`/admin/consultations/new?clientId=${encodeURIComponent(clientId)}`'))
  assert.match(entry, /robots: \{ index: false, follow: false \}/)
  assert.doesNotMatch(entry, /getPrescriptionStore|listClients|createConsultation|publish|saveOwnerDraft/)
  assert.match(studio, /if \(!await requireAdminRequest\(\)\) redirect\('\/admin\/login'\)/)
  assert.match(studio, /getPrescriptionStore\(\)/)
  assert.match(studio, /clients\.filter\(c => c\.status === 'active'\)/)
  assert.match(studio, /<ConsultationForm\s+clients=\{options\}\s+selectedClientId=\{selectedClientId\}/)
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
  assert.match(view, /ownerTools && <details className="hh-practice-more-tools"/)
  assert.match(view, /isOwner\?d\.privateTitle:d\.publicTools/)
  assert.match(api, /joined === 'practitioner\/open'/)
  assert.match(api, /issueTrustedAdminSession/)
  assert.doesNotMatch(view, /window\.location\.assign\('\/admin/)
  assert.match(styles, /\.hh-practice-more-tools > summary/)
  assert.match(styles, /\.hh-practice-quick-primary/)
})
