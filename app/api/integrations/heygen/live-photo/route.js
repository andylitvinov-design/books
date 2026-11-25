import { NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/app/config';
import { PRIVATE_HEADERS } from '@/lib/app/http';
import { consumeRate } from '@/lib/app/database';
import { finalizeLivePhotoCallback } from '@/lib/app/live-photo-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Per-job callback payloads are NOT trusted or assumed to be signed.
// The opaque callback ID selects a previously submitted record and the backend
// independently queries HeyGen using its private key before archiving.
export async function POST(request) {
  const response = (status = 200) => NextResponse.json({ ok: status === 200 },
    { status, headers: PRIVATE_HEADERS });
  try {
    if (!/application\/json/i.test(request.headers.get('content-type') || '') ||
        Number(request.headers.get('content-length') || 0) > 12000) return response(415);
    const text = await request.text();
    if (text.length > 12000) return response(413);
    const payload = JSON.parse(text);
    const id = payload?.callback_id || payload?.data?.callback_id;
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return response(400);
    const config = getAppConfig();
    await consumeRate(config, { op: 'heygen-live-photo-callback' }, 200, 3600);
    const accepted = await finalizeLivePhotoCallback(config, id);
    return response(accepted ? 200 : 202);
  } catch {
    return response(503);
  }
}
