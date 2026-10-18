// Resolve the legacy archive entry before React streams a meta-refresh redirect.
// It must not be able to replay its old destination over a later Home click.
export function cabinetArchiveRedirect(address, method = 'GET') {
  if (!['GET', 'HEAD'].includes(method)) return null
  const url = new URL(address)
  const match = url.pathname.match(/^\/(en|ru)\/app\/analysis\/?$/)
  if (!match) return null
  return new URL('/' + match[1] + '/app/portrait#personal-reports', url.origin)
}
