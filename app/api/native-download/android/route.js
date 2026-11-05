import {NextResponse} from 'next/server'
import manifest from '@/data/native-public-releases.json'
import {getNativePublicDownloads} from '@/lib/native/public-downloads.mjs'

export function GET() {
  const target = getNativePublicDownloads(manifest).androidUrl
  if (!target) return NextResponse.json(
    {error:'native_android_release_not_published'},
    {status:404,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}}
  )
  return NextResponse.redirect(target, {
    status:302,
    headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex'}
  })
}
