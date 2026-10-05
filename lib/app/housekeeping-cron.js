import { timingSafeEqual } from 'node:crypto'

function cronAuthorized(request, env) {
  const secret = env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  if (!secret || !authorization) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(authorization)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function runHousekeepingCron(
  request,
  { env = process.env, run, reportFailure = () => {} } = {},
) {
  if (!cronAuthorized(request, env)) return { status: 401, body: { error: 'UNAUTHORIZED' } }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const completed = await run()
      return {
        status: 200,
        body: {
          status: completed.status,
          runId: completed.id,
          guestSessionsDeleted: completed.guestSessionsDeleted,
          viewerSessionsDeleted: completed.viewerSessionsDeleted,
          intentsDeleted: completed.intentsDeleted,
        },
      }
    } catch {
      reportFailure({ attempt })
    }
  }
  return { status: 503, body: { error: 'SERVICE_UNAVAILABLE' } }
}
