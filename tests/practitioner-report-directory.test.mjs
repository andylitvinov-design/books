import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { listClientReportDirectory, parseReportDirectoryQuery } from '../lib/consultations/report-directory.js'

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
      { id: 'report-old', clientId: id, dateIssued: '2026-10-17', status: 'active', analysis: 'PRIVATE NOTES' },
      { id: 'invoice', clientId: id, kind: 'payment', dateIssued: '2026-10-17' },
      { id: 'report-new', clientId: id, kind: 'report', dateIssued: '2026-10-18', status: 'draft' },
      { id: 'cross-client', clientId: 'b', dateIssued: '2026-10-18' },
      { id: 'report-new', clientId: id, dateIssued: '2026-10-18' },
    ]
    return id === 'c' ? [{ id: 'report-c', clientId: id, dateIssued: '2026-10-01', status: 'active' }] : []
  },
}

test('query and page are bounded', () => {
  assert.deepEqual(parseReportDirectoryQuery({ q: '  North  ', page: '2' }), { query: 'North', page: 2 })
  assert.equal(parseReportDirectoryQuery({ page: '-2' }).page, 1)
  assert.equal(parseReportDirectoryQuery({ page: '9999999' }).page, 1)
  assert.equal(parseReportDirectoryQuery({ q: 'a'.repeat(500) }).query.length, 120)
})

test('archive lists old reports, excludes invoices and duplicate/foreign records, returns no clinical notes', async () => {
  const data = await listClientReportDirectory(store)
  assert.deepEqual(data.rows.map(row => row.id), ['report-new', 'report-old', 'report-c'])
  assert.equal(data.rows[0].clientLocale, 'ru')
  assert.equal(data.rows[0].status, 'inactive')
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE|analysis|invoice|cross-client/)
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
