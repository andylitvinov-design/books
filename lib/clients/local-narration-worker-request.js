import 'server-only'
import { AppError } from '../assessments/contracts.js'
import { requireLocalWorker } from './local-narration-service.js'

const MAX_BODY = 2048
const invalid = () => new AppError('LOCAL_NARRATION_INVALID_REQUEST', 400)

/** Authenticates before reading bytes. No Origin/cookie-based worker access. */
export async function readAuthenticatedWorkerJson(request) {
  requireLocalWorker(request)
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) throw invalid()
  if (request.headers.get('content-encoding')) throw invalid()
  const claimed = request.headers.get('content-length')
  if (claimed !== null && (!/^\d+$/.test(claimed) || Number(claimed) > MAX_BODY)) throw invalid()
  if (!request.body) throw invalid()
  const reader = request.body.getReader()
  const pieces = []
  let size = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.byteLength
      if (size > MAX_BODY) {
        await reader.cancel()
        throw invalid()
      }
      pieces.push(Buffer.from(next.value))
    }
    if (!size) throw invalid()
    const result = JSON.parse(Buffer.concat(pieces).toString('utf8'))
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw invalid()
    return result
  } catch (error) {
    if (error instanceof AppError) throw error
    throw invalid()
  } finally {
    reader.releaseLock()
  }
}
