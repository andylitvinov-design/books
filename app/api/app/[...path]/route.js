import { NextResponse } from 'next/server'
import { getAppConfig, requireSameOrigin, requestOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { createAppRepository } from '@/lib/app/repository'
import { consumeRate } from '@/lib/app/database'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError, onlyKeys } from '@/lib/assessments/contracts'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
async function handle(request, { params }) {
  let auth
  try {
    const config = getAppConfig(),
      origin = requestOrigin(request, config),
      path = (await params).path || [],
      method = request.method,
      joined = path.join('/')
    if (method !== 'GET') requireSameOrigin(request, config)
    auth = createRequestAuth(request, config)
    const json = (data, status = 200) =>
      auth.apply(NextResponse.json(data, { status, headers: PRIVATE_HEADERS }))
    if (joined === 'auth/start' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['locale'])
      const locale = body.locale === 'ru' ? 'ru' : 'en'
      await consumeRate(
        config,
        {
          op: 'oauth-start',
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
        },
        20,
        600,
      )
      const { data, error } = await auth.client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile',
          redirectTo: `${origin}/api/app/auth/callback?locale=${locale}`,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error || !data.url || new URL(data.url).origin !== config.supabaseUrl)
        throw new AppError('SIGN_IN_UNAVAILABLE', 503)
      return json({ redirectUrl: data.url })
    }
    if (joined === 'auth/callback' && method === 'GET') {
      const url = new URL(request.url),
        locale = url.searchParams.get('locale') === 'ru' ? 'ru' : 'en',
        code = url.searchParams.get('code')
      if (url.searchParams.has('error') || !code || code.length > 4096)
        return auth.clear(
          NextResponse.redirect(`${origin}/${locale}/app?auth=cancelled`, {
            status: 303,
            headers: PRIVATE_HEADERS,
          }),
        )
      const { error } = await auth.client.auth.exchangeCodeForSession(code)
      if (error)
        return auth.clear(
          NextResponse.redirect(`${origin}/${locale}/app?auth=failed`, {
            status: 303,
            headers: PRIVATE_HEADERS,
          }),
        )
      const actor = await auth.verified()
      await createAppRepository(config).ensureAccount(actor)
      return auth.apply(
        NextResponse.redirect(`${origin}/${locale}/app`, { status: 303, headers: PRIVATE_HEADERS }),
      )
    }
    if (joined === 'auth/logout' && method === 'POST') {
      const body = await readBody(request)
      onlyKeys(body, ['allDevices'])
      if (body.allDevices !== undefined && typeof body.allDevices !== 'boolean')
        throw new AppError('INVALID_BODY', 400)
      const { error } = await auth.client.auth.signOut({
        scope: body.allDevices ? 'global' : 'local',
      })
      return auth.clear(json({ signedOut: true, serverSessionEnded: !error }, error ? 503 : 200))
    }
    const actor = await auth.verified(),
      repo = createAppRepository(config)
    await consumeRate(
      config,
      { op: joined === 'export' ? 'export' : 'app', actor: actor.id },
      joined === 'export' ? 3 : 180,
      joined === 'export' ? 3600 : 60,
    )
    if (joined === 'bootstrap' && method === 'GET') return json(await repo.bootstrap(actor))
    if (joined === 'export' && method === 'GET') {
      const response = json(await repo.exportData(actor))
      response.headers.set('Content-Disposition', 'attachment; filename="holistic-house-data.json"')
      return response
    }
    if (path[0] === 'runs' && path.length === 2 && method === 'GET')
      return json(await repo.getRun(actor, path[1]))
    if (path[0] === 'results' && path.length === 2 && method === 'GET')
      return json(await repo.getResult(actor, path[1]))
    if (method !== 'POST') throw new AppError('NOT_FOUND', 404)
    const body = await readBody(request)
    if (joined === 'onboarding') return json(await repo.onboarding(actor, body))
    if (joined === 'preferences') return json(await repo.preferences(actor, body))
    if (joined === 'runs') return json(await repo.startRun(actor, body), 201)
    if (path[0] === 'runs' && path.length === 3) {
      if (path[2] === 'save') return json(await repo.saveRun(actor, path[1], body))
      if (path[2] === 'submit') return json(await repo.submitRun(actor, path[1], body))
      if (path[2] === 'discard') return json(await repo.discardRun(actor, path[1], body))
    }
    if (joined === 'requests') return json(await repo.createRequest(actor, body), 201)
    if (path[0] === 'requests' && path.length === 2)
      return json(await repo.updateRequest(actor, path[1], body))
    if (joined === 'context') return json(await repo.contextEvent(actor, null, body), 201)
    if (path[0] === 'context' && path.length === 2)
      return json(await repo.contextEvent(actor, path[1], body))
    if (joined === 'deletion') {
      const result = await repo.requestDeletion(actor, body)
      await auth.client.auth.signOut({ scope: 'global' })
      return auth.clear(json(result, 202))
    }
    throw new AppError('NOT_FOUND', 404)
  } catch (error) {
    const safe = safeError(error),
      response = NextResponse.json(
        { error: safe.code },
        { status: safe.status, headers: PRIVATE_HEADERS },
      )
    return auth ? auth.apply(response) : response
  }
}
export { handle as GET, handle as POST }
