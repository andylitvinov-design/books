import { NextResponse } from 'next/server';
import { getAppConfig, requestOrigin, requireSameOrigin } from '@/lib/app/config';
import { createRequestAuth } from '@/lib/app/session';
import { PRIVATE_HEADERS, safeError } from '@/lib/app/http';
import { consumeRate } from '@/lib/app/database';
import { listClientLivePhotos, startClientLivePhoto } from '@/lib/app/live-photo-service';
import { AppError } from '@/lib/assessments/contracts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

async function readBoundedForm(request) {
  const limit = 4_000_000;
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('INVALID_LIVE_PHOTO_FORM', 400);
  let received = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > limit) {
        await reader.cancel().catch(() => {});
        throw new AppError('PAYLOAD_TOO_LARGE', 413);
      }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  const copy = new Request(request.url, {
    method: 'POST', headers: request.headers, body: Buffer.concat(chunks),
  });
  try { return await copy.formData(); }
  catch { throw new AppError('INVALID_LIVE_PHOTO_FORM', 400); }
}

async function handle(request, write) {
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
    await consumeRate(config, { op: write ? 'live-photo-create' : 'live-photo-list', accountId: actor.id },
      write ? 4 : 60, write ? 86400 : 60);
    let value;
    if (write) {
      if (!/multipart\/form-data/i.test(request.headers.get('content-type') || ''))
        throw new AppError('MULTIPART_REQUIRED', 415);
      if (Number(request.headers.get('content-length') || 0) > 4_000_000)
        throw new AppError('PAYLOAD_TOO_LARGE', 413);
      value = await startClientLivePhoto(config, actor, await readBoundedForm(request));
    } else value = await listClientLivePhotos(config, actor);
    return auth.apply(NextResponse.json(value, { headers: PRIVATE_HEADERS }));
  } catch (error) {
    const safe = safeError(error);
    const response = NextResponse.json({ error: safe.code }, { status: safe.status, headers: PRIVATE_HEADERS });
    return auth ? auth.apply(response) : response;
  }
}
export async function GET(request) { return handle(request, false); }
export async function POST(request) { return handle(request, true); }
