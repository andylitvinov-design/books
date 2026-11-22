import { NextResponse } from 'next/server'
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config'
import { createRequestAuth } from '@/lib/app/session'
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http'
import { AppError } from '@/lib/assessments/contracts'
import { createDaybookInspirationsRepository } from '@/lib/app/daybook-inspirations-repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request) {
 let auth
 try {
  const config = getAppConfig()
  requestOrigin(request,config)
  if (request.method === 'POST') requireSameOrigin(request,config)
  auth = createRequestAuth(request,config)
  const actor = await auth.verified()
  if (request.headers.has('x-hh-account-id') &&
      request.headers.get('x-hh-account-id') !== actor.id)
    throw new AppError('ACCOUNT_CHANGED',409)
  const repository = createDaybookInspirationsRepository(config)
  const data = request.method === 'GET'
    ? await repository.view(actor)
    : await repository.mutate(actor,await readBody(request,2048))
  return auth.apply(NextResponse.json(data,{headers:PRIVATE_HEADERS}))
 } catch (error) {
  const safe = safeError(error)
  const response = NextResponse.json({error:safe.code},
    {status:safe.status,headers:PRIVATE_HEADERS})
  return auth ? auth.apply(response) : response
 }
}
export const GET = handler
export const POST = handler
