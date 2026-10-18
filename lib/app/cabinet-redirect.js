// Resolve the legacy archive entry before React streams a meta-refresh redirect.
// It must not be able to replay its old destination over a later Home click.
export function cabinetArchiveRedirect(address, method = 'GET', requestHost = null) {
  if (!['GET', 'HEAD'].includes(method)) return null
  const url = new URL(address)
  // Next's development URL parser normalizes 127.0.0.1 to localhost. Preserve
  // only that exact loopback host/port; never trust arbitrary forwarded hosts.
  if (url.hostname === 'localhost' && requestHost === '127.0.0.1' + (url.port ? ':' + url.port : ''))
    url.hostname = '127.0.0.1'
  const match = url.pathname.match(/^\/(en|ru)\/app\/analysis\/?$/)
  if (!match) return null
  return new URL('/' + match[1] + '/app/portrait#personal-reports', url.origin)
}
