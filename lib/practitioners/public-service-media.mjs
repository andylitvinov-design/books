/**
 * Public thumbnails for moderated practitioner services. The editor stores
 * owner-uploaded JPEGs as public Supabase Storage URLs; do not accidentally
 * discard those URLs from the public discovery gallery.
 *
 * No signed, private, foreign-host, query-string or arbitrary Storage URL is
 * accepted. This helper cannot make a private object public.
 */
const uuid = '[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}'
const ownedPublicPhoto = new RegExp(
  '^/storage/v1/object/public/hh-service-photos/' + uuid + '/' + uuid + '\\.jpg$', 'i',
)
const localPublicPath = /^\/(?:images\/|api\/public\/)[A-Za-z0-9_/%.-]+$/
const unsafeLocalSegment = /(?:\/\.{1,2}(?:\/|$)|%2e|%2f|%5c|\\|\/\/)/i

export function publicServicePhotoUrl(value, supabaseUrl) {
  if (typeof value !== 'string' || !value || value.length > 650) return ''

  if (value.startsWith('/')) {
    return localPublicPath.test(value) && !unsafeLocalSegment.test(value) ? value : ''
  }

  try {
    const url = new URL(value)
    const project = new URL(supabaseUrl)
    if (url.protocol !== 'https:' || project.protocol !== 'https:' ||
        url.origin !== project.origin || url.username || url.password ||
        url.search || url.hash || !ownedPublicPhoto.test(url.pathname)) return ''
    return url.origin + url.pathname
  } catch {
    return ''
  }
}
