import { PRIVATE_HEADERS, readBody, safeError } from './http.js'
import { AppError } from '../assessments/contracts.js'

export function createDaybookCoachHandler({ getConfig, origin, sameOrigin, auth, rate, repository,
  json = (body, options) => Response.json(body, options) }) {
  return async function handle(request) {
    let session
    try {
      if (request.method !== 'POST') throw new AppError('METHOD_NOT_ALLOWED', 405)
      const config = getConfig()
      origin(request, config)
      sameOrigin(request, config)
      session = auth(request, config)
      const actor = await session.verified()
      if (request.headers.get('x-hh-account-id') !== actor.id) throw new AppError('ACCOUNT_CHANGED', 409)
      if (new URL(request.url).search) throw new AppError('INVALID_DAYBOOK_COACH_QUERY')
      await rate(config, { scope: 'daybook-coach', accountId: actor.id }, 30, 60 * 60)
      const input = await readBody(request, 4096)
      const result = await repository(config).handle(actor, input)
      return session.apply(json(result, { headers: PRIVATE_HEADERS }))
    } catch (error) {
      const safe = safeError(error)
      const response = json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS })
      return session ? session.apply(response) : response
    }
  }
}
