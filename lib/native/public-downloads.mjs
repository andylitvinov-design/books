// Public mobile distribution must fail closed. This file is shared by the
// public install page and by same-origin download redirects; it is NOT a
// signing service, an app-store API, or a client-health information channel.
const SHA256 = /^[a-f0-9]{64}$/
const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/
const evidence = /^https:\/\/github\.com\/andylitvinov-design\/books\/issues\/1310#issuecomment-[1-9]\d*$/
const apple = /^\/(?:[a-z]{2}\/)?app\/(?:[a-z0-9-]+\/)?id[1-9]\d{7,}$/

function exactHttps(value) {
  if (typeof value !== 'string' || value.length > 400 || value.includes('%')) return null
  try {
    const uri = new URL(value)
    if (uri.protocol !== 'https:' || uri.username || uri.password || uri.port ||
        uri.search || uri.hash || uri.href !== value) return null
    return uri
  } catch { return null }
}

function signedAndroid(record) {
  if (!record || record.status !== 'released' || record.ownerApproved !== true ||
      !VERSION.test(record.version || '') || !Number.isSafeInteger(record.versionCode) ||
      record.versionCode < 1 || !SHA256.test(record.sha256 || '') ||
      !SHA256.test(record.signingCertificateSha256 || '') ||
      !evidence.test(record.qaEvidenceUrl || '')) return null
  const uri = exactHttps(record.downloadUrl)
  const version = record.version
  const path = '/andylitvinov-design/books/releases/download/hh-android-v' +
    version + '/Holistic-House-Android-v' + version + '.apk'
  if (!uri || uri.hostname !== 'github.com' || uri.pathname !== path) return null
  return uri.href
}

function approvedIos(record) {
  if (!record || record.status !== 'released' || record.ownerApproved !== true ||
      !VERSION.test(record.version || '') || !evidence.test(record.qaEvidenceUrl || '')) return null
  const uri = exactHttps(record.appStoreUrl)
  if (!uri || uri.hostname !== 'apps.apple.com' || !apple.test(uri.pathname)) return null
  return uri.href
}

// Both per-platform release review and the production deployment switch
// must be enabled; a PR that merely edits public data cannot start
// distributing customer binaries.
export function resolveNativePublicDownloads(manifest, enabled = false) {
  if (!manifest || manifest.schemaVersion !== 1 ||
      manifest.appId !== 'com.holistichouse.app' || enabled !== true) {
    return {androidUrl:null,iosUrl:null}
  }
  return {
    androidUrl:signedAndroid(manifest.android),
    iosUrl:approvedIos(manifest.ios)
  }
}

export function getNativePublicDownloads(manifest) {
  return resolveNativePublicDownloads(manifest, process.env.HH_NATIVE_PUBLIC_RELEASES_ENABLED === 'true')
}
