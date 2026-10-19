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
  const sort = params.sort === 'client' ? 'client' : 'date'
  return { query, sort, page: /^[1-9]\d{0,3}$/.test(rawPage) ? Number(rawPage) : 1 }
}
export async function listClientReportDirectory(store, { query = '', sort = 'date', page = 1, pageSize = REPORT_DIRECTORY_PAGE_SIZE } = {}) {
  if (!store) return { rows: [], totalClients: 0, totalReports: 0, page: 1, pageCount: 1 }
  const take = Math.max(1, Math.min(50, Math.floor(Number(pageSize)) || REPORT_DIRECTORY_PAGE_SIZE))
  const search = String(query).trim().toLocaleLowerCase()
  const clients = (await store.listClients())
    .filter(client => client && typeof client.id === 'string' && typeof client.fullName === 'string')
    .filter(client => client.fullName.toLocaleLowerCase().includes(search))

  // Paginate reports, not clients: both sort modes must cover the entire archive,
  // including multiple reports belonging to one client.
  const all = []
  for (let offset = 0; offset < clients.length; offset += 10) {
    const batch = await Promise.all(clients.slice(offset, offset + 10).map(async client => {
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
    all.push(...batch.flat())
  }
  const recentFirst = (a, b) => b.dateIssued.localeCompare(a.dateIssued) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id)
  all.sort(sort === 'client'
    ? (a, b) => a.clientName.localeCompare(b.clientName, undefined, { sensitivity: 'base' }) || recentFirst(a, b)
    : (a, b) => recentFirst(a, b) || a.clientName.localeCompare(b.clientName))
  const pageCount = Math.max(1, Math.ceil(all.length / take))
  const currentPage = Math.min(Math.max(1, Math.floor(Number(page)) || 1), pageCount)
  const rows = all.slice((currentPage - 1) * take, currentPage * take)
  return { rows, totalReports: all.length, totalClients: clients.length, page: currentPage, pageCount }
}
