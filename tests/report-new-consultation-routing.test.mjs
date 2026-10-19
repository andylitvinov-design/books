import assert from 'node:assert/strict'
import {assertPrivateReportRedirect} from './helpers/report-editor-contracts.mjs'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(path, 'utf8')

test('My Practice report handoff selects the client in the current consultation studio', async () => {
  const [destination, picker, studio, practice] = await Promise.all([
    read('lib/app/practitioner-access.js'),
    read('app/admin/reports/new/page.js'),
    read('app/admin/consultations/new/page.js'),
    read('components/app/practice-workspace.jsx'),
  ])
  assert.match(practice, /openOwner\('report'\)/)
  assert.match(destination, /report:\s*'\/admin\/reports\/new'/)
  await assertPrivateReportRedirect(picker)
  assert.doesNotMatch(picker, /assessments\/new\?kind=research_result/)
  assert.match(studio, /selectedClientId=\{selectedClientId\}/)
  assert.match(studio, /<ConsultationForm/)
  assert.match(studio, /action=\{createConsultationAction\}/)
  assert.match(studio, /clients=\{options\}/)
})

test('existing client report actions do not link to the old research editor', async () => {
  const [detail, panel] = await Promise.all([
    read('app/admin/clients/[id]/page.js'),
    read('components/owner-assessments.jsx'),
  ])
  assert.match(detail, /href=\{`\/admin\/consultations\/new\?clientId=\$\{id\}`\}/)
  assert.doesNotMatch(detail, /assessments\/new\?kind=research_result/)
  assert.ok(panel.includes('href={`/admin/consultations/new?clientId=${encodeURIComponent(clientId)}`}'))
  assert.match(panel, /new\?kind=test/)
  assert.doesNotMatch(panel, /new\?kind=research_result/)
})

test('isolated browser acceptance visits current studio and verifies legacy redirect', async () => {
  const script = await read('scripts/verify-ia-v2.mjs')
  assert.ok(script.includes("await go(admin, '/admin/reports/new')"))
  assert.ok(script.includes("await admin.locator('.consultation-client-search input').fill(a.fullName)"))
  assert.ok(script.includes("admin.locator('.consultation-client-results button').filter({ hasText: a.fullName })"))
  assert.ok(script.includes("await expect(clientChoice).toHaveAttribute('type', 'button')"))
  assert.match(script, /await clientChoice\.click\(\)/)
  assert.match(script, /await assertStudioClient\(false\)/)
  assert.match(script, /await assertStudioClient\(true\)/)
  assert.doesNotMatch(script, /clientReportLink|a\.master-client-row/)

  assert.match(script, /consultation-client-selector input\[name="clientId"\]/)
  assert.match(script, /textarea\[name="analysis"\]/)
  assert.match(script, /textarea\[name="additionalNotes"\]/)
  assert.match(script, /input\[name="includeInvoice"\]/)
  assert.match(script, /toHaveCount\(0\)/)
  assert.ok(script.includes('await go(admin, `/admin/clients/${a.id}/assessments/new?kind=research_result`)'))
  assert.ok(script.includes('await expect(admin).toHaveURL(origin + `/admin/consultations/new?clientId=${a.id}`)'))
  assert.match(script, /unauthenticated denial without submission/)

})

test('old direct research-result URL redirects only after owner/client validation', async () => {
  const legacy = await read('app/admin/clients/[id]/assessments/new/page.js')
  const auth = legacy.indexOf('if (!await requireAdminRequest())')
  const client = legacy.indexOf("if (!client || client.status !== 'active'")
  const oldKind = legacy.indexOf("if ((await searchParams)?.kind === 'research_result')")
  const handoff = legacy.indexOf('redirect(`/admin/consultations/new?clientId=${encodeURIComponent(id)}`)')
  assert.ok(auth >= 0 && client > auth && oldKind > client && handoff > oldKind)
  assert.match(legacy, /<AssessmentEditor[^>]+kind="test"/)
  assert.doesNotMatch(legacy, /kind=\{kind\}/)
})
