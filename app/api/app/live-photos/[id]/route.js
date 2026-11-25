import { NextResponse } from 'next/server';
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config';
import { createRequestAuth } from '@/lib/app/session';
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http';
import { consumeRate } from '@/lib/app/database';
import { getClientLivePhoto, deleteClientLivePhoto } from '@/lib/app/live-photo-service';
import { AppError } from '@/lib/assessments/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handle(request, params, write) {
  let auth;
  try {
    const config = getAppConfig();
    if (write) requireSameOrigin(request, config);
    else requestOrigin(request, config);
    auth = createRequestAuth(request, config);
    const actor = await auth.verified();
    if (request.headers.has('x-hh-account-id') &&
        request.headers.get('x-hh-account-id') !== actor.id)
      throw new AppError('ACCOUNT_CHANGED', 403);
    const { id } = await params;
    await consumeRate(config, { op: write ? 'live-photo-delete' : 'live-photo-status', accountId: actor.id },
      write ? 10 : 360, 3600);
    const value = write
      ? await deleteClientLivePhoto(config, actor, id)
      : await getClientLivePhoto(config, actor, id);
    return auth.apply(NextResponse.json(value, { headers: PRIVATE_HEADERS }));
  } catch (error) {
    const safe = safeError(error);
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS });
    return auth ? auth.apply(response) : response;
  }
}
export async function GET(request, { params }) { return handle(request, params, false); }
export async function DELETE(request, { params }) { return handle(request, params, true); }
