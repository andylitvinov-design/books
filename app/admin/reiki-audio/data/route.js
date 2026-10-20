import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import {
  reikiIntroAudioAdminRead, reikiIntroAudioPrepare,
  reikiIntroAudioPublish, reikiIntroAudioUnpublish,
} from '@/lib/academy/reiki-intro-audio-store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}
const result = (value, status = 200) =>
  Response.json(value, { status, headers: privateHeaders })

const permitted = (body, keys) =>
  !!body && typeof body === 'object' && !Array.isArray(body) &&
  Object.keys(body).every(key => keys.includes(key))

export async function GET() {
  if (!await requireAdminRequest()) return result({ error: 'NOT_FOUND' }, 404)
  try {
    const config = getAppConfig()
    return result({ manifest: await reikiIntroAudioAdminRead(config), storageOrigin: config.supabaseUrl, configured: true })
  } catch {
    return result({ manifest: { version: 1, slots: {} }, configured: false }, 503)
  }
}

export async function POST(request) {
  if (!await requireAdminRequest()) return result({ error: 'NOT_FOUND' }, 404)
  let config, body
  try {
    config = getAppConfig()
    requireSameOrigin(request, config)
    if (!request.headers.get('content-type')?.startsWith('application/json'))
      return result({ error: 'INVALID_REIKI_AUDIO_ACTION' }, 415)
    const input = await request.text()
    if (input.length > 1500) return result({ error: 'INVALID_REIKI_AUDIO_ACTION' }, 413)
    body = JSON.parse(input)
  } catch {
    return result({ error: 'INVALID_REIKI_AUDIO_ACTION' }, 400)
  }
  try {
    if (body?.action === 'prepare' &&
        permitted(body, ['action','lesson','locale','mime','filename','bytes']))
      return result({ intent: await reikiIntroAudioPrepare(config, body) }, 201)
    if (body?.action === 'publish' &&
        permitted(body, ['action','lesson','locale','path']) &&
        body.confirmed === undefined)
      return result({ audio: await reikiIntroAudioPublish(config, body) })
    if (body?.action === 'unpublish' &&
        permitted(body, ['action','lesson','locale','confirmed']) &&
        body.confirmed === true)
      return result(await reikiIntroAudioUnpublish(config, body))
    return result({ error: 'INVALID_REIKI_AUDIO_ACTION' }, 400)
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'REIKI_AUDIO_STORAGE_UNAVAILABLE'
    const status = code.startsWith('INVALID_') ? 400 : code === 'REIKI_AUDIO_UPLOAD_NOT_FOUND' ? 409 : 503
    return result({ error: code }, status)
  }
}
