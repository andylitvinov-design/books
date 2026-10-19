/** Owner-only report archive. Do not return report bodies or private clinical notes. */
export const REPORT_DIRECTORY_PAGE_SIZE = 24
// A saved document's language takes precedence over the client's profile or UI language.
export function savedReportLocale(record, fallback = 'en') {
  return record?.languagePreference === 'ru' || record?.languagePreference === 'en'
    ? record.languagePreference
    : fallback === 'ru' ? 'ru' : 'en'
}
export function parseReportDirectoryQuery(params = {}) {
  const query = (typeof params.q === 'string' ? params.q : '').trim().slice(0, 120)
  const rawPage = typeof params.page === 'string' ? params.page : ''
  return { query, page: /^[1-9]\d{0,3}$/.test(rawPage) ? Number(rawPage) : 1 }
}
export async function listClientReportDirectory(store, { query = '', page = 1, pageSize = REPORT_DIRECTORY_PAGE_SIZE } = {}) {
  if (!store) return { rows: [], totalClients: 0, page: 1, pageCount: 1 }
  const take = Math.max(1, Math.min(50, Math.floor(Number(pageSize)) || REPORT_DIRECTORY_PAGE_SIZE))
  const search = String(query).trim().toLocaleLowerCase()
  const clients = (await store.listClients())
    .filter(client => client && typeof client.id === 'string' && typeof client.fullName === 'string')
    .filter(client => client.fullName.toLocaleLowerCase().includes(search))
    .sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')) || a.fullName.localeCompare(b.fullName))
  const pageCount = Math.max(1, Math.ceil(clients.length / take))
  const currentPage = Math.min(Math.max(1, Math.floor(Number(page)) || 1), pageCount)
  const selected = clients.slice((currentPage - 1) * take, currentPage * take)
  const perClient = await Promise.all(selected.map(async client => {
    const records = await store.listClientDocuments(client.id)
    const seen = new Set()
    return records.filter(doc => {
      if (!doc || doc.kind === 'payment' || doc.clientId !== client.id ||
        typeof doc.id !== 'string' || seen.has(doc.id)) return false
      seen.add(doc.id)
      return true
    }).map(doc => ({
      id: doc.id, clientId: client.id, clientName: client.fullName,
      reportLocale: savedReportLocale(doc, client.preferredLocale), kind: doc.kind,
      dateIssued: typeof doc.dateIssued === 'string' ? doc.dateIssued : '',
      updatedAt: typeof doc.updatedAt === 'string' ? doc.updatedAt : '',
      status: doc.status === 'active' ? 'active' : 'inactive',
    }))
  }))
  const rows = perClient.flat().sort((a, b) =>
    b.dateIssued.localeCompare(a.dateIssued) || b.updatedAt.localeCompare(a.updatedAt) ||
    a.clientName.localeCompare(b.clientName) || a.id.localeCompare(b.id))
  return { rows, totalClients: clients.length, page: currentPage, pageCount }
}
