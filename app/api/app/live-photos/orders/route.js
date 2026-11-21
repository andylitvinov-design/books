import { NextResponse } from 'next/server';
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config';
import { createRequestAuth } from '@/lib/app/session';
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http';
import { consumeRate } from '@/lib/app/database';
import { createLivePhotoPaymentRequest } from '@/lib/app/live-photo-billing';
import { AppError } from '@/lib/assessments/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  let auth;
  try {
    const config = getAppConfig();
    requireSameOrigin(request, config);
    auth = createRequestAuth(request, config);
    const actor = await auth.verified();
    if (request.headers.has('x-hh-account-id') &&
        request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 403);
    await consumeRate(config, { op: 'live-photo-paid-order', accountId: actor.id }, 4, 3600);
    const value = await createLivePhotoPaymentRequest(config, actor, await readBody(request, 1024));
    return auth.apply(NextResponse.json(value, { headers: PRIVATE_HEADERS }));
  } catch (error) {
    const safe = safeError(error);
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS });
    return auth ? auth.apply(response) : response;
  }
}
