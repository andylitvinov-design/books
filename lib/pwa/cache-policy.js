const privatePrefixes = ['/ru/prescriptions/', '/en/prescriptions/', '/api/prescriptions/', '/api/prescription-access', '/api/admin/', '/admin/']

function normalizedPathname(input) {
  const url = new URL(input)
  let pathname = url.pathname
  try { pathname = decodeURIComponent(pathname) } catch { return '/' }
  return pathname.replace(/\/+/g, '/')
}

export function classifyPwaRequest(input) {
  const pathname = normalizedPathname(input)
  if (privatePrefixes.some((prefix) => pathname.startsWith(prefix))) return 'network-only'
  if (pathname.startsWith('/media/') || pathname.startsWith('/icons/') || pathname.startsWith('/_next/')) return 'public-asset'
  if (/^\/(ru|en)\/homeopathy(?:\/remedies(?:\/[-a-z0-9]+)?)?$/.test(pathname)) return 'public-route'
  return 'network-first'
}
