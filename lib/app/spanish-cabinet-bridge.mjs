// The main private Cabinet currently has EN/RU account copy and OAuth contracts.
// Until Spanish receives full signed-in parity, its PWA/account bookmarks must
// lead to the existing protected EN workspace, not a streamed Next.js 404.
// This helper never constructs absolute URLs or touches the separate ES inbox.
const ROUTES = new Set([
  'portrait','monitoring','tests','runs','results','history','consultations',
  'settings','continue','reports','portfolio','progress','practice','analysis',
  'documents','course','business','coaching','labs','videos',
])
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function englishCabinetTarget(path = [], query = {}) {
  if (!Array.isArray(path) || path.length > 2 ||
      path.some(part => typeof part !== 'string' || !/^[a-z0-9-]{1,128}$/i.test(part)))
    return null
  // Mirror the EN/RU catch-all route contract before redirecting ES bookmarks.
  // Invalid ES links should not make a detour to the protected EN 404.
  if (path.length && !ROUTES.has(path[0])) return null
  if (path[0] === 'coaching' && path.length === 2 && !['egyptian','greek'].includes(path[1]))
    return null
  if (path[0] === 'documents' && path.length === 2 && !UUID.test(path[1])) return null
  const suffix = path.length ? '/' + path.map(encodeURIComponent).join('/') : ''
  const params = new URLSearchParams()
  if (query && typeof query === 'object' && !Array.isArray(query)) {
    for (const [key, raw] of Object.entries(query)) {
      if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(key)) continue
      for (const value of Array.isArray(raw) ? raw : [raw]) {
        if (typeof value === 'string' && value.length <= 2048) params.append(key, value)
      }
    }
  }
  const search = params.toString()
  return '/en/app' + suffix + (search ? '?' + search : '')
}
