import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(path, 'utf8')

test('My Practice report handoff selects the client in the current consultation studio', async () => {
  const [destination, entry, studio, practice, form, selector, action, service, validation] = await Promise.all([
    read('lib/app/practitioner-access.js'),
    read('app/admin/reports/new/page.js'),
    read('app/admin/consultations/new/page.js'),
    read('components/app/practice-workspace.jsx'),
    read('components/consultation-form.jsx'),
    read('components/consultation-client-selector.jsx'),
    read('app/admin/consultations/actions.js'),
    read('lib/consultations/service.js'),
    read('lib/clients/delivery-model.js'),
  ])
  assert.match(practice, /openOwner\('report'\)/)
  assert.match(destination, /report:\s*'\/admin\/reports\/new'/)
  // Merged owner PR #1059 removes the duplicate picker, not its authorization.
  // Pin this small entry's complete executable shape: no unknown import, side
  // effect, alternate destination, unchecked query or draft/publication action.
  const entryCode = entry.split('\n').filter(line => !line.trim().startsWith('//')).join('\n').trim()
  assert.equal(entryCode, [
    "import { redirect } from 'next/navigation'",
    "import { requireAdminRequest } from '@/lib/prescriptions/admin'",
    "import { validUuid } from '@/lib/clients/delivery-model'",
    '',
    "export const dynamic = 'force-dynamic'",
    "export const metadata = { title: 'New client report', robots: { index: false, follow: false } }",
    '',
    'export default async function NewClientReport({ searchParams }) {',
    "  if (!await requireAdminRequest()) redirect('/admin/login')",
    '  const query = await searchParams',
    "  const clientId = typeof query?.clientId === 'string' ? query.clientId : ''",
    '  redirect(validUuid(clientId)',
    '    ? `/admin/consultations/new?clientId=${encodeURIComponent(clientId)}`',
    "    : '/admin/consultations/new')",
    '}',
  ].join('\n'), 'report entry must remain an authenticated UUID-only studio handoff')
  assert.ok(validation.includes('const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i'))
  assert.ok(validation.includes("export const validUuid = value => typeof value === 'string' && uuid.test(value)"))

  // The canonical studio owns the only picker. Authentication precedes all
  // client reads, and preselection must resolve inside its active options.
  assert.ok(studio.includes([
    'export default async function NewConsultation({ searchParams }) {',
    "  if (!await requireAdminRequest()) redirect('/admin/login')",
    '  const store = getPrescriptionStore()',
    '  const clients = store ? await store.listClients() : []',
    "  const options = await Promise.all(clients.filter(c => c.status === 'active').map(async c => {",
    '    const docs = await store.listClientDocuments(c.id)',
  ].join('\n')), 'studio must authenticate before selecting active client options')
  assert.match(studio, /const params = await searchParams\s+const selectedClientId = typeof params\?\.clientId === 'string' \? params\.clientId : undefined/)
  const studioForms = [...studio.matchAll(/<ConsultationForm\b[^>]*\/>/g)]
  assert.equal(studioForms.length, 1)
  assert.match(studioForms[0][0], /clients=\{options\}\s+selectedClientId=\{selectedClientId\}\s+action=\{createConsultationAction\}/)
  assert.match(form, /import \{ ConsultationClientSelector \} from '\.\/consultation-client-selector'/)
  const formSelectors = [...form.matchAll(/<ConsultationClientSelector\b[^\n]+/g)]
  assert.equal(formSelectors.length, 1)
  assert.ok(formSelectors[0][0].includes('clients={clients} selectedClientId={selectedClientId}'))
  assert.match(selector, /const initial = clients\.find\(\(client\) => client\.id === selectedClientId\)\s+const \[selected, setSelected\] = useState\(initial\)/)
  assert.ok(selector.includes('<input type="hidden" name="clientId" value={selected?.id ?? \'\'} />'))
  assert.doesNotMatch(selector, /name="clientId"[^>]*value=\{selectedClientId\}/)

  // URL selection is not write authority: the existing save action and service
  // independently re-check authentication and the exact active client identity.
  assert.match(action, /export async function createConsultationAction\(previous, formData\) \{\s+if \(!await requireAdminRequest\(\)\) return \{ error: 'Please sign in before creating documents\.' \}/)
  assert.ok(action.includes("else { data.clientId = String(formData.get('clientId') ?? ''); if (!data.clientId) throw new Error('Choose a client') }\n    pair = await createConsultation(data, { store, requestId: String(formData.get('requestId') ?? '') })"))
  assert.ok(service.includes([
    "  if (input.clientId && input.newClient) throw new Error('Choose an existing or new client')",
    "  if (input.clientId && !isClientId(input.clientId)) throw new Error('Invalid client identity')",
    '  const newClient = input.newClient ? createClient(input.newClient, now) : undefined',
    '  const existingClient = input.clientId ? await store.findClientById(input.clientId) : undefined',
    "  if (input.clientId && (!existingClient || existingClient.status !== 'active')) throw new Error('Client unavailable')",
    '  const client = newClient ?? existingClient',
  ].join('\n')), 'save service must resolve and validate the selected active client')
  assert.ok(service.includes('if (recommendation) recommendation.clientId = client.id'))
  assert.ok(service.includes('if (payment) payment.clientId = client.id'))
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
  assert.match(script, /clientReportLink\.click\(\)/)
  assert.match(script, /consultation-client-selector input\[name="clientId"\]/)
  assert.match(script, /textarea\[name="analysis"\]/)
  assert.match(script, /textarea\[name="additionalNotes"\]/)
  assert.match(script, /input\[name="includeInvoice"\]/)
  assert.match(script, /toHaveCount\(0\)/)
  assert.match(script, /old research-result redirect to the new consultation studio/)
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
