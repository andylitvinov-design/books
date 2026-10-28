import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { canonicalRedirectTarget, privateMigrationBridge } from './lib/canonical-redirect'
import { refreshAdminAuth } from './lib/app/admin-auth-refresh'
function privatePath(pathname: string) {
  const decoded = (() => { try { return decodeURIComponent(pathname) } catch { return pathname } })().replace(/\/+/g, '/')
  return /^\/(en|ru|es)\/client(?:\/|$)/.test(decoded)
    || /^\/(ru|en)\/report(?:\/|$)/.test(decoded)
    || /^\/(ru|en)\/prescriptions\//.test(decoded)
    || /^\/(ru|en|es)\/app(?:\/|$)/.test(decoded)
    || /^\/api\/app(?:\/|$)/.test(decoded)
    || decoded.startsWith('/api/client')
    || decoded.startsWith('/api/prescriptions/')
    || decoded.startsWith('/api/prescription-access')
    || decoded.startsWith('/api/admin/')
    || /^\/admin(?:\/|$)/.test(decoded)
    || decoded.startsWith('/document-preview/')
}
export async function middleware(request: NextRequest) {
  const redirectTarget = canonicalRedirectTarget(request.url, request.method)
  if (redirectTarget) return NextResponse.redirect(redirectTarget, 308)
  // Plain My Practice entry is the new, public practitioner dashboard. Do this
  // before streaming the old Account layout: an in-page redirect can return
  // HTTP 200 + delayed meta refresh and reveal the old personal login on iOS.
  // Explicit editing URLs stay in the existing server-authorized private app.
  const oldPractice = request.nextUrl.pathname.match(/^\/(en|ru|es)\/app\/practice\/?$/)
  if (oldPractice && ['GET', 'HEAD'].includes(request.method) &&
      !['panel', 'materialTab', 'create', 'starter', 'meditation', 'requestId']
        .some(key => request.nextUrl.searchParams.has(key))) {
    return NextResponse.redirect(new URL('/' + oldPractice[1] + '/practice', request.url), {
      status: 307,
      headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
    })
  }
  // Legacy book URLs are 301, preserving the former ?lang= selection.
  // The Maya collection hub is a separate route, not an individual book.
  const oldBook = request.nextUrl.pathname.match(/^\/books\/([a-z0-9-]+)\/?$/)
  if (oldBook && oldBook[1] !== 'maya-tradition' && ['GET', 'HEAD'].includes(request.method)) {
    const requested = request.nextUrl.searchParams.get('lang')
    const locale = requested === 'ru' || requested === 'es' ? requested : 'en'
    const destination = new URL(`/${locale}/books/${oldBook[1]}`, request.url)
    return NextResponse.redirect(destination, 301)
  }
  const bridgeNonce = crypto.randomUUID().replaceAll('-', '')
  const bridge = privateMigrationBridge(request.url, bridgeNonce)
  if (bridge && ['GET', 'HEAD'].includes(request.method)) return new NextResponse(request.method === 'HEAD' ? null : bridge, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${bridgeNonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    'X-Content-Type-Options': 'nosniff',
  } })
  const authCookieChanges = await refreshAdminAuth(request)
  const requestHeaders = new Headers(request.headers)
  // Derive the public document language only from the URL. Private locale gates
  // and all security headers below remain unchanged.
  const pathname = request.nextUrl.pathname
  const urlLocale = pathname.match(/^\/(en|ru|es)(?:\/|$)/)?.[1]
  const requestedLanguage = request.nextUrl.searchParams.get('lang')
  // The unprefixed book routes have their own explicit locale contract:
  // the Maya hub defaults to EN, while individual readers default to RU.
  // Keep the document <html lang> and mobile navigation aligned with the
  // actual page content instead of a remembered public-locale cookie.
  const queryLocale = pathname === '/'
    ? requestedLanguage
    : pathname === '/books/maya-tradition'
      ? (requestedLanguage === 'ru' ? 'ru' : 'en')
      : /^\/books\/[^/]+$/.test(pathname)
        ? (requestedLanguage === 'en' ? 'en' : 'ru')
        : null
  const preference = request.cookies.get('holistic_house_public_locale')?.value === 'es' ? 'es'
    : request.cookies.get('holistic_house_ui_locale')?.value === 'ru' ? 'ru' : 'en'
  // The canonical unprefixed home always renders English; /ru renders Russian.
  // Legacy ?lang=ru links redirect at the page boundary, never emit mixed-language HTML.
  const pageLocale = pathname === '/' ? 'en' : (urlLocale ?? (['en', 'ru', 'es'].includes(queryLocale ?? '') ? queryLocale : preference) ?? 'en')
  requestHeaders.set('x-public-page-locale', pageLocale)
  const nonce = crypto.randomUUID().replaceAll('-', '')
  const developmentEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''
  const videoManager = pathname === '/admin/videos'
  const materialLibraryPage = pathname === '/admin/materials'
  const liveAudioPage = /^\/(en|ru|es)\/live(?:\/host)?\/?$/.test(pathname)
  const liveAudioOrigin = (() => {
    if (!liveAudioPage || process.env.HH_LIVE_AUDIO_ENABLED !== 'true') return ''
    try {
      const origin = new URL(process.env.LIVEKIT_URL || '')
      return origin.protocol === 'wss:' && origin.pathname === '/' &&
        !origin.username && !origin.password && !origin.search && !origin.hash
        ? ' ' + origin.origin + ' ' + origin.origin.replace(/^wss:/, 'https:') : ''
    } catch { return '' }
  })()
  const youtubePhoneUploader = pathname === '/admin/youtube-upload'
  const youtubePracticeUploader = /^\/(en|ru|es)\/app\/practice\/?$/.test(pathname)
  const youtubeOAuthUploadAllowed = youtubePhoneUploader || youtubePracticeUploader
  // Separate public Reiki lesson audio and owner-only upload route.
  const reikiIntroAudioManager = /^\/admin\/materials\/courses\/reiki-practitioner\/?$/.test(pathname)
  const coachingOwnerAudioManager = /^\/admin\/materials\/coaching\/(egyptian|greek)\/?$/.test(pathname)
  const coachingLearnerAudioPlayer = /^\/(en|ru)\/app\/coaching\/(egyptian|greek)\/?$/.test(pathname)
  const reikiLessonAudioPage = /^\/(en|ru|es)\/academy\/principles-of-energywork\/learn\/?$/.test(pathname)
  // Only the authenticated course editor and published standalone course player
  // can fetch signed media from the dedicated PRIVATE educational Storage bucket.
  const practitionerCourseEditor = /^\/(en|ru|es)\/app\/practice\/?$/.test(pathname)
  const practitionerCourseReader = /^\/(en|ru|es)\/courses\/masters\/[a-z0-9-]{3,120}\/?$/.test(pathname)
  const practitionerCourseMediaOrigin = (()=>{
    if(!practitionerCourseEditor&&!practitionerCourseReader)return ''
    try{
      const value=new URL(process.env.HH_APP_SUPABASE_URL||'')
      return value.protocol==='https:'&&value.hostname.endsWith('.supabase.co')?' '+value.origin:''
    }catch{return ''}
  })()
  const reikiIntroAudioOrigin = (() => {
    if (!reikiIntroAudioManager && !reikiLessonAudioPage && !coachingOwnerAudioManager && !coachingLearnerAudioPlayer) return ''
    try {
      const url = new URL(process.env.HH_APP_SUPABASE_URL || '')
      return url.protocol === 'https:' && /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
        ? ' ' + url.origin : ''
    } catch { return '' }
  })()
  // Signed PRIVATE photos belong only to the Reiki learner and owner CRM views.
  const reikiPhotoOrigin = (() => {
    if (!reikiLessonAudioPage && pathname !== '/admin/reiki-leads') return ''
    try {
      const url = new URL(process.env.HH_APP_SUPABASE_URL || '')
      return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co') ? ' ' + url.origin : ''
    } catch { return '' }
  })()
  const academyVideoPage = /^\/(en|ru|es)\/academy(?:\/|$)/.test(pathname)
  // Scope blob image previews to the existing owner inbox and the one
  // public, browser-local mandala studio. Other public/private routes keep
  // the default restrictive policy; no network upload is introduced.
  const ownerMessengerImages = /^\/(en|ru|es)\/app\/(?:messages|practice)\/?$/.test(pathname)
  const publicMandalaLocalImages = /^\/(en|ru|es)\/holistic-support\/mandala\/?$/.test(pathname)
  // Save/read a single owner-scoped portrait on the existing My Videos page.
  // This exception never applies to client reports, practitioner profiles or APIs.
  const privateSupportPhotoCabinet = /^\/(en|ru|es)\/app\/videos\/?$/.test(pathname)
  const privateSupportPhotoOrigin = (() => {
    if (!privateSupportPhotoCabinet) return ''
    try {
      const url = new URL(process.env.HH_APP_SUPABASE_URL || '')
      return url.protocol === 'https:' && /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
        ? ' ' + url.origin : ''
    } catch { return '' }
  })()
  // First-party private Messages uploads use a signed URL on the configured
  // private Supabase project. Allow only that exact storage origin on these
  // protected inbox routes; never widen arbitrary client/guest pages.
  const directMessageStorageOrigin = (() => {
    if (!ownerMessengerImages) return ''
    try {
      const url = new URL(process.env.HH_APP_SUPABASE_URL || '')
      return url.protocol === 'https:' && /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
        ? ' ' + url.origin : ''
    } catch { return '' }
  })()
  const privateDocument = privatePath(pathname)
  const publicDocument = !privateDocument && !pathname.startsWith('/api/')
  const tantraReikiPage = /^\/(en|ru|es)\/academy\/reiki\/tantra-reiki(?:\/|$)/.test(pathname)
  // Public video pages use only these two reviewed embed providers. Keep the
  // cabinet, reports, APIs and document previews on the restrictive policy.
  const publicVideoDocument = publicDocument || videoManager
  // Only actual client-session pages and their owner preview may display the
  // explicit, click-to-load YouTube education iframe. Keep all other private
  // pages, Account routes, reports, and APIs at frame-src 'none'.
  const sessionEducationEmbed = /^\/(en|ru)\/client\/session\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/client\/[^/]+\/sessions\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/app\/sessions\/[^/]+\/?$/.test(pathname)
    || /^\/admin\/clients\/[^/]+\/sessions\/[^/]+\/?$/.test(pathname)
    || /^\/admin\/documents\/[^/]+\/session-preview\/?$/.test(pathname)
    || materialLibraryPage
  // Only the practitioner consultation editor may frame a locally generated PDF blob.
  // Client cabinets and every other private page keep frame-src 'none'.
  const practitionerDraftPreview = pathname === '/admin/consultations/new'
    || /^\/admin\/consultations\/[^/]+\/edit\/?$/.test(pathname)
  const deliveryPath = /^\/admin\/prescriptions\/[^/]+\/?$/.test(pathname)
    || /^\/admin\/clients\/[^/]+\/assessments\/[^/]+\/edit\/?$/.test(pathname)
    || /^\/admin\/clients\/[^/]+\/sessions(?:\/|$)/.test(pathname)
    || /^\/admin\/documents\/[^/]+\/?$/.test(pathname)
    || /^\/admin\/consultations\/[^/]+\/edit\/?$/.test(pathname)
    || materialLibraryPage
    || /^\/(en|ru)\/client\/session\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/client\/[^/]+\/sessions\/[^/]+\/?$/.test(pathname)
  // A local MediaRecorder preview uses a blob: URL even if the optional
  // private Storage connection is temporarily unavailable. Scope this to
  // existing staff session editors, never public/client report readers.
  // Only authorized private report readers can play local narration blobs.
  const reportNarrationReader = /^\/(en|ru)\/client\/session\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/client\/[^/]+\/sessions\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/client\/[^/]+\/documents\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/prescriptions\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/app\/sessions\/[^/]+\/?$/.test(pathname)
    || /^\/(en|ru)\/app\/document-view\/[^/]+\/?$/.test(pathname)
  const ownerRecorderPage = deliveryPath && pathname.startsWith('/admin/')
  const deliveryOrigin = (() => {
    if((process.env.HH_CLIENT_DELIVERY_ENABLED !== 'true'&&!materialLibraryPage) || !deliveryPath) return ''
    try {
      const value = new URL(process.env.HH_APP_SUPABASE_URL || '')
      if (value.protocol !== 'https:' || !value.hostname.endsWith('.supabase.co')) return ''
      return ' ' + value.origin
    } catch {return ''}
  })()
  // The mobile Support gallery displays moderated public practitioner media.
  // Keep this exact allowlist off private Account, reports and all API paths.
  const supportMobilePublishedMedia = /^\/(en|ru|es)\/holistic-support\/mobile\/?$/.test(pathname)
  // Public-only master marketing images. Never grant the private client media
  // origin to unrelated Account, client report, admin, or API pages.
  const listingImageOrigin = (() => {
    if(!(/^\/(en|ru|es)\/(app\/practice(?:\/|$)|masters(?:\/|$)|m\/[a-z0-9-]{3,24}\/?$|services(?:\/|$))/.test(pathname) ||
      /^\/m\/[a-z0-9-]{3,24}\/?$/.test(pathname) || supportMobilePublishedMedia))return ''
    try{
      const url=new URL(process.env.HH_APP_SUPABASE_URL||'')
      return url.protocol==='https:'&&url.hostname.endsWith('.supabase.co')?' '+url.origin:''
    }catch{return ''}
  })()
  // Only public Events directories and their verified leaf pages may fetch
  // the organizer's Eventbrite image CDN. Private Account/client/API routes
  // and calendar downloads keep their restrictive CSP.
  const eventsPosterImageOrigin = /^\/(en|ru|es)\/events(?:\/[^/]+)?\/?$/.test(pathname)
    ? ' https://img.evbuc.com https://cdn.evbuc.com' : ''
  // Owner-only private video PUT; never widen client/guest playback CSP.
  const externalVideoUploadOrigin = (() => {
    if ((process.env.HH_CLIENT_DELIVERY_ENABLED!=='true'&&!materialLibraryPage) ||
      process.env.HH_CLIENT_VIDEO_EXTERNAL_ENABLED!=='true' ||
      !deliveryPath || !pathname.startsWith('/admin/')) return ''
    if (process.env.HH_CLIENT_VIDEO_BACKEND==='s3_ca') return ' https://s3.ca-central-1.amazonaws.com'
    if (process.env.HH_CLIENT_VIDEO_BACKEND==='r2' &&
      /^[a-f0-9]{32}$/i.test(process.env.HH_CLIENT_R2_ACCOUNT_ID||''))
      return ' https://'+process.env.HH_CLIENT_R2_ACCOUNT_ID+'.r2.cloudflarestorage.com'
    return ''
  })()
  const cspClass = liveAudioPage ? 'live-audio'
    : youtubePhoneUploader ? 'youtube-uploader'
    : youtubePracticeUploader ? 'practitioner-youtube'
    : videoManager ? 'video-manager'
    : privateDocument ? 'private'
      : tantraReikiPage ? 'tantra-media'
        : publicDocument ? 'public-video'
          : 'restricted'
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://www.googletagmanager.com${youtubeOAuthUploadAllowed ? ' https://accounts.google.com' : ''}${developmentEval}`, "style-src 'self' 'unsafe-inline'",
    (academyVideoPage ? "img-src 'self' data: https://i.ytimg.com https://psitrends.com https://www.psitrends.com https://www.google-analytics.com" : publicVideoDocument ? "img-src 'self' data: https://i.ytimg.com https://psitrends.com https://www.psitrends.com https://www.google-analytics.com" : "img-src 'self' data: https://www.google-analytics.com") + (ownerMessengerImages || publicMandalaLocalImages || supportMobilePublishedMedia || privateSupportPhotoCabinet ? ' blob:' : '') + listingImageOrigin + eventsPosterImageOrigin + practitionerCourseMediaOrigin + reikiPhotoOrigin + directMessageStorageOrigin + privateSupportPhotoOrigin,
    youtubeOAuthUploadAllowed ? "frame-src https://accounts.google.com" : publicVideoDocument ? "frame-src https://www.youtube-nocookie.com https://app.heygen.com" + (practitionerCourseReader ? ' https://player.vimeo.com' : '') : sessionEducationEmbed ? "frame-src https://www.youtube-nocookie.com" : practitionerDraftPreview ? "frame-src blob:" : "frame-src 'none'",
    (tantraReikiPage ? "media-src 'self' https://psitrends.com" : "media-src 'self'") + ((ownerRecorderPage||deliveryOrigin||reportNarrationReader||reikiIntroAudioManager||coachingOwnerAudioManager||practitionerCourseEditor||publicMandalaLocalImages||ownerMessengerImages||liveAudioPage) ? ' blob:' : '') + deliveryOrigin + reikiIntroAudioOrigin + practitionerCourseMediaOrigin + (supportMobilePublishedMedia ? listingImageOrigin : '') + directMessageStorageOrigin,
    "font-src 'self'", "connect-src 'self'" + liveAudioOrigin + (youtubeOAuthUploadAllowed ? " https://www.googleapis.com https://accounts.google.com https://oauth2.googleapis.com" : "") + deliveryOrigin + directMessageStorageOrigin + externalVideoUploadOrigin + practitionerCourseMediaOrigin + ((reikiIntroAudioManager||coachingOwnerAudioManager) ? reikiIntroAudioOrigin : '') + (privateDocument ? "" : " https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com"), "object-src 'none'", "base-uri 'none'", "form-action 'self'" + (youtubeOAuthUploadAllowed ? " https://accounts.google.com" : ""), "frame-ancestors 'none'",
  ].join('; ')
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('x-csp-class', cspClass)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  for (const { name, value, options } of authCookieChanges) response.cookies.set(name, value, options)
  response.headers.set('Content-Security-Policy', csp)
  if (privatePath(request.nextUrl.pathname) || authCookieChanges.length) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
    response.headers.set('Content-Security-Policy', csp)
    response.headers.set('Referrer-Policy', 'no-referrer')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
  }
  return response
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/', '/books/:path*', '/sitemap.xml', '/robots.txt', '/ru/:path*', '/en/:path*', '/api/:path*', '/admin/:path*', '/document-preview/:path*'] }

