import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { listClientReportDirectory, parseReportDirectoryQuery, savedReportLocale } from '../lib/consultations/report-directory.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const clients = [
  { id: 'a', fullName: 'North Example', preferredLocale: 'ru', updatedAt: '2026-10-18T12:00:00Z' },
  { id: 'b', fullName: 'Other Example', preferredLocale: 'en', updatedAt: '2026-10-17T12:00:00Z' },
  { id: 'c', fullName: 'South Example', preferredLocale: 'en', updatedAt: '2026-10-16T12:00:00Z' },
]
const store = {
  async listClients() { return clients },
  async listClientDocuments(id) {
    if (id === 'a') return [
      { id: 'report-old', clientId: id, dateIssued: '2026-10-17', languagePreference: 'ru', status: 'active', analysis: 'PRIVATE NOTES' },
      { id: 'invoice', clientId: id, kind: 'payment', dateIssued: '2026-10-17' },
      { id: 'report-new', clientId: id, kind: 'report', dateIssued: '2026-10-18', languagePreference: 'en', status: 'draft' },
      { id: 'cross-client', clientId: 'b', dateIssued: '2026-10-18' },
      { id: 'report-new', clientId: id, dateIssued: '2026-10-18' },
    ]
    return id === 'c' ? [{ id: 'report-c', clientId: id, dateIssued: '2026-10-01', status: 'active' }] : []
  },
}

test('query and page are bounded', () => {
  assert.deepEqual(parseReportDirectoryQuery({ q: '  North  ', page: '2' }), { query: 'North', sort: 'date', page: 2 })
  assert.equal(parseReportDirectoryQuery({ sort: 'client' }).sort, 'client')
  assert.equal(parseReportDirectoryQuery({ sort: 'unexpected' }).sort, 'date')
  assert.equal(parseReportDirectoryQuery({ page: '-2' }).page, 1)
  assert.equal(parseReportDirectoryQuery({ page: '9999999' }).page, 1)
  assert.equal(parseReportDirectoryQuery({ q: 'a'.repeat(500) }).query.length, 120)
})

test('archive lists old reports, excludes invoices and duplicate/foreign records, returns no clinical notes', async () => {
  const data = await listClientReportDirectory(store)
  assert.deepEqual(data.rows.map(row => row.id), ['report-new', 'report-old', 'report-c'])
  assert.equal(data.rows[0].reportLocale, 'en')
  assert.equal(data.rows[1].reportLocale, 'ru')
  assert.equal(data.rows[0].status, 'inactive')
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE|analysis|invoice|cross-client/)
})

test('document language overrides client profile language, including in client history', () => {
  assert.equal(savedReportLocale({ languagePreference: 'ru' }, 'en'), 'ru')
  assert.equal(savedReportLocale({ languagePreference: 'en' }, 'ru'), 'en')
  assert.equal(savedReportLocale({ languagePreference: 'bilingual' }, 'ru'), 'ru')
  assert.equal(savedReportLocale({}, 'en'), 'en')
  const page = read('app/admin/clients/[id]/page.js')
  assert.match(page, /savedReportLocale\(document, client\.preferredLocale\)/)
})

test('client search and pagination preserve existing report history', async () => {
  const result = await listClientReportDirectory(store, { query: 'example', page: 3, pageSize: 1 })
  assert.equal(result.pageCount, 3)
  assert.equal(result.page, 3)
  assert.deepEqual(result.rows.map(row => row.id), ['report-c'])
  assert.equal((await listClientReportDirectory(store, { query: 'missing' })).rows.length, 0)
  assert.equal((await listClientReportDirectory(null)).totalClients, 0)
})

test('practice Report opens archive; Create report remains separate; private owner gate', () => {
  const practice = read('components/app/practice-workspace.jsx')
  const routes = read('lib/app/practitioner-access.js')
  const archive = read('app/admin/reports/page.js')
  const header = read('components/prescription-admin-header.jsx')
  assert.match(practice, /onClick=\{\(\)=>openOwner\('reports'\)\}/)
  assert.match(practice, /onClick=\{\(\)=>openOwner\('report'\)\}/)
  assert.match(routes, /reports: '\/admin\/reports'/)
  assert.match(routes, /report: '\/admin\/reports\/new'/)
  assert.match(archive, /requireAdminRequest\(\)/)
  assert.match(archive, /documentPreviewEditHref\(row\)/)
  assert.match(archive, /\/admin\/documents\//)
  assert.match(header, /href="\/admin\/reports"/)
})

test('reports are sorted across all clients, and pagination counts reports not clients', async () => {
  const alternateStore = {
    async listClients() {
      return [
        { id: 'z', fullName: 'Zoe', preferredLocale: 'en' },
        { id: 'a', fullName: 'Anna', preferredLocale: 'ru' },
      ]
    },
    async listClientDocuments(id) {
      if (id === 'z') return [
        { id: 'z-new', clientId: 'z', dateIssued: '2026-10-19', kind: 'report', updatedAt: '2026-10-19T01:00:00Z' },
        { id: 'z-old', clientId: 'z', dateIssued: '2026-10-01', kind: 'report', updatedAt: '2026-10-01T01:00:00Z' },
      ]
      return [{ id: 'a-report', clientId: 'a', dateIssued: '2026-10-12', kind: 'report', updatedAt: '2026-10-12T01:00:00Z' }]
    },
  }
  const byDate = await listClientReportDirectory(alternateStore, { sort: 'date', pageSize: 2 })
  assert.deepEqual(byDate.rows.map(r => r.id), ['z-new', 'a-report'])
  assert.equal(byDate.totalReports, 3)
  assert.equal(byDate.totalClients, 2)
  assert.equal(byDate.pageCount, 2)
  assert.deepEqual((await listClientReportDirectory(alternateStore, { sort: 'date', page: 2, pageSize: 2 })).rows.map(r => r.id), ['z-old'])
  const byClient = await listClientReportDirectory(alternateStore, { sort: 'client', pageSize: 2 })
  assert.deepEqual(byClient.rows.map(r => r.id), ['a-report', 'z-new'])
  assert.deepEqual((await listClientReportDirectory(alternateStore, { sort: 'client', page: 2, pageSize: 2 })).rows.map(r => r.id), ['z-old'])
})

test('owner-only report deletion and client deletion have explicit confirmation gates', () => {
  const reports = read('app/admin/reports/page.js')
  const actions = read('app/admin/reports/actions.js')
  const clients = read('app/admin/clients/[id]/page.js')
  const clientActions = read('app/admin/clients/actions.js')
  const ui = read('components/owner-delete-controls.jsx')
  assert.match(reports, /deleteSavedReportAction/)
  assert.match(reports, /sortHref\('client'\)/)
  assert.match(reports, /sortHref\('date'\)/)
  assert.match(actions, /requireAdminRequest\(\)/)
  assert.match(actions, /deleteClientReportIfUnchanged/)
  assert.match(ui, /window\.confirm/)
  assert.match(ui, /entered !== fullName/)
  assert.match(clients, /DeleteClientPanel/)
  assert.match(clientActions, /client_account_bindings/)
  assert.match(clientActions, /client_delivery_sessions/)
})
