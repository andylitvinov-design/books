// The main private Cabinet currently has EN/RU account copy and OAuth contracts.
// Until Spanish receives full signed-in parity, its PWA/account bookmarks must
// lead to the existing protected EN workspace, not a streamed Next.js 404.
// This helper never constructs absolute URLs or touches the separate ES inbox.
export function englishCabinetTarget(path = [], query = {}) {
  if (!Array.isArray(path) || path.length > 2 ||
      path.some(part => typeof part !== 'string' || !/^[a-z0-9-]{1,128}$/i.test(part)))
    return null
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
