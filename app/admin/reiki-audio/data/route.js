import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getAppConfig, requireSameOrigin } from '@/lib/app/config'
import {
  reikiIntroAudioAdminRead, reikiIntroAudioPrepare,
  reikiIntroAudioPublish, reikiIntroAudioUnpublish, reikiIntroAudioPreview,
  reikiIntroAudioRegister, reikiIntroAudioEdit, reikiIntroAudioDeleteDraft,
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

export async function GET(request) {
  if (!await requireAdminRequest()) return result({ error: 'NOT_FOUND' }, 404)
  const params = new URL(request.url).searchParams
  const lesson = params.get('lesson')
  const locale = params.get('locale')
  if ((lesson === null) !== (locale === null))
    return result({ error: 'INVALID_REIKI_AUDIO_SLOT' }, 400)
  try {
    const config = getAppConfig()
    const inventory = await reikiIntroAudioAdminRead(config, { lesson, locale })
    return result({ ...inventory, storageOrigin: config.supabaseUrl, configured: true })
  } catch (error) {
    const invalid = error?.code === 'INVALID_REIKI_AUDIO_SLOT'
    return result({ manifest: { version: 1, slots: {} }, files: [],
      configured: false, error: invalid ? 'INVALID_REIKI_AUDIO_SLOT' : 'REIKI_AUDIO_STORAGE_UNAVAILABLE' }, invalid ? 400 : 503)
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
    if (body?.action === 'preview' &&
        permitted(body, ['action','lesson','locale','path']) &&
        body.confirmed === undefined)
      return result(await reikiIntroAudioPreview(config, body))
    if (body?.action === 'register' &&
        permitted(body, ['action','lesson','locale','path','title']))
      return result({ metadata: await reikiIntroAudioRegister(config, body) }, 201)
    if (body?.action === 'metadata' &&
        permitted(body, ['action','lesson','locale','path','storage','title','description','archived']))
      return result({ metadata: await reikiIntroAudioEdit(config, body) })
    if (body?.action === 'delete-draft' &&
        permitted(body, ['action','lesson','locale','path','confirmed']) &&
        body.confirmed === true)
      return result(await reikiIntroAudioDeleteDraft(config, body))
    if (body?.action === 'publish' &&
        permitted(body, ['action','lesson','locale','path','storage']) &&
        body.confirmed === undefined)
      return result({ audio: await reikiIntroAudioPublish(config, body) })
    if (body?.action === 'unpublish' &&
        permitted(body, ['action','lesson','locale','confirmed']) &&
        body.confirmed === true)
      return result(await reikiIntroAudioUnpublish(config, body))
    return result({ error: 'INVALID_REIKI_AUDIO_ACTION' }, 400)
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'REIKI_AUDIO_STORAGE_UNAVAILABLE'
    const status = code.startsWith('INVALID_') ? 400
      : ['REIKI_AUDIO_UPLOAD_NOT_FOUND','REIKI_AUDIO_ACTIVE_ON_SLIDE','REIKI_AUDIO_ARCHIVE_FIRST','REIKI_AUDIO_ARCHIVED'].includes(code) ? 409
      : 503
    return result({ error: code }, status)
  }
}
