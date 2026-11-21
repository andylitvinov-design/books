import { NextResponse } from 'next/server';
import { requireAdminRequest } from '@/lib/prescriptions/admin';
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config';
import { createRequestAuth } from '@/lib/app/session';
import { PRIVATE_HEADERS, readBody, safeError } from '@/lib/app/http';
import { consumeRate } from '@/lib/app/database';
import { listLivePhotoPaymentReview, verifyLivePhotoPayment } from '@/lib/app/live-photo-billing';
import { AppError } from '@/lib/assessments/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handle(request, write) {
  let auth;
  try {
    if (!await requireAdminRequest()) throw new AppError('ACCESS_DENIED', 403);
    const config = getAppConfig();
    if (write) requireSameOrigin(request, config);
    else requestOrigin(request, config);
    auth = createRequestAuth(request, config);
    const actor = await auth.verified();
    if (request.headers.has('x-hh-account-id') &&
        request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 403);
    await consumeRate(config, { op: write ? 'live-photo-admin-verify' : 'live-photo-admin-orders',
      accountId: actor.id }, write ? 8 : 40, 3600);
    const value = write
      ? await verifyLivePhotoPayment(config, actor, await readBody(request, 1200))
      : await listLivePhotoPaymentReview(config, actor);
    return auth.apply(NextResponse.json(value, { headers: PRIVATE_HEADERS }));
  } catch (error) {
    const safe = safeError(error);
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS });
    return auth ? auth.apply(response) : response;
  }
}
export async function GET(request) { return handle(request, false); }
export async function POST(request) { return handle(request, true); }
