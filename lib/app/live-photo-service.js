import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppError } from '../assessments/contracts.js';
import { transaction } from './database.js';
import { createPrivateStorageClient, checkPrivateMediaStorage } from '../clients/session-delivery-storage.js';
import {
  LIVE_PHOTO_MOTIONS, isLivePhotoCreationEnabled, hasLivePhotoProviderKey, uploadHeyGenPortrait,
  submitHeyGenLivePhoto, getHeyGenLivePhotoStatus, downloadHeyGenLivePhoto,
} from './live-photo-heygen.mjs';

const TABLE = 'app_private.client_live_photos_v1';
const BUCKET = 'hh-client-private-media';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MAX_FILE = 3_000_000;
const MAX_ACTIVE = 3;
const TERMINAL = new Set(['ready', 'failed', 'unknown', 'deleted']);
function bad(code, status = 400) { throw new AppError(code, status); }
function validId(value) { if (typeof value !== 'string' || !ID.test(value)) bad('INVALID_LIVE_PHOTO_ID'); return value; }
function storage(config) {
  if (!config.secretKey) bad('MEDIA_STORAGE_NOT_CONFIGURED', 503);
  return createPrivateStorageClient(config).storage.from(BUCKET);
}
function toClient(row) {
  return {
    id: row.id, motion: row.motion, orientation: row.orientation, status: row.status,
    createdAt: row.created_at, readyAt: row.ready_at, failureCode: row.failure_code || null,
    duration: row.status === 'ready' ? 5 : null, reusable: row.status === 'ready',
  };
}
async function dbAsWorker(config, fn) {
  return transaction(config, null, async db => {
    await db.query("select set_config('hh.live_photo_worker','verified',true)");
    return fn(db);
  }, { server: true });
}
async function byId(config, actor, id) {
  return transaction(config, actor, async db => {
    const row = (await db.query('select * from ' + TABLE + ' where id=$1 and account_id=$2', [id, actor.id])).rows[0];
    if (!row || row.status === 'deleted') bad('LIVE_PHOTO_NOT_FOUND', 404);
    return row;
  });
}
async function update(config, actor, id, status, props = {}) {
  return transaction(config, actor, async db => {
    return (await db.query('update ' + TABLE +
      ' set status=$3, provider_asset_id=coalesce($4,provider_asset_id), provider_video_id=coalesce($5,provider_video_id),' +
      ' failure_code=$6,updated_at=now() where id=$1 and account_id=$2 and status<>$7 returning *',
      [id, actor.id, status, props.assetId || null, props.videoId || null, props.error || null, 'deleted'])).rows[0];
  });
}
async function signedUrl(config, key) {
  const { data, error } = await storage(config).createSignedUrl(key, 120);
  if (error || !data?.signedUrl) bad('MEDIA_STORAGE_UNAVAILABLE', 503);
  const u = new URL(data.signedUrl);
  if (u.protocol !== 'https:' || u.origin !== new URL(config.supabaseUrl).origin)
    bad('MEDIA_STORAGE_UNAVAILABLE', 503);
  return u.href;
}
export async function listClientLivePhotos(config, actor) {
  const rows = await transaction(config, actor, async db =>
    (await db.query('select * from ' + TABLE + " where account_id=$1 and status<>'deleted' order by created_at desc limit 20", [actor.id])).rows);
  return { items: rows.map(toClient), creationEnabled: isLivePhotoCreationEnabled() };
}
export async function startClientLivePhoto(config, actor, form) {
  if (!isLivePhotoCreationEnabled()) bad('LIVE_PHOTO_NOT_ENABLED', 503);
  if (!(form instanceof FormData)) bad('INVALID_LIVE_PHOTO_FORM');
  const requestId = validId(form.get('requestId'));
  const motion = form.get('motion'), orientation = form.get('orientation'),
    subject = form.get('subject');
  if (!LIVE_PHOTO_MOTIONS.includes(motion) || !['portrait', 'landscape'].includes(orientation) ||
    !['self', 'other'].includes(subject) || form.get('consentAi') !== 'true' ||
    form.get('consentSubject') !== 'true') bad('LIVE_PHOTO_CONSENT_REQUIRED');
  const file = form.get('photo');
  if (!file || typeof file.arrayBuffer !== 'function' ||
    !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type) ||
    file.size < 128 || file.size > MAX_FILE) bad('LIVE_PHOTO_INVALID_IMAGE', 413);
  const prior = await transaction(config, actor, async db => {
    return (await db.query('select * from ' + TABLE +
      ' where account_id=$1 and client_request_id=$2', [actor.id, requestId])).rows[0] || null;
  });
  if (prior) return toClient(prior);
  let photo;
  try {
    photo = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25000000 })
      .rotate().resize({ width: orientation === 'portrait' ? 768 : 1365,
        height: orientation === 'portrait' ? 1365 : 768,
        fit: 'contain', background: { r: 247, g: 246, b: 243, alpha: 1 } })
      .jpeg({ quality: 83, mozjpeg: true }).toBuffer();
  } catch { bad('LIVE_PHOTO_INVALID_IMAGE', 415); }
  if (photo.byteLength < 1024 || photo.byteLength > 1_500_000) bad('LIVE_PHOTO_INVALID_IMAGE', 413);
  await checkPrivateMediaStorage(config);
  const id = randomUUID();
  const path = 'live-photos/' + actor.id + '/' + id + '/';
  let reservation;
  reservation = await transaction(config, actor, async db => {
    // Serialize the per-account quota with other requests, without granting broader RLS.
    await db.query('select pg_advisory_xact_lock(hashtext($1))', ['live-photo:global']);
    await db.query('select pg_advisory_xact_lock(hashtext($1))', ['live-photo:' + actor.id]);
    await db.query("select set_config('hh.live_photo_worker','verified',true)");
    const daily = (await db.query('select count(*)::int n from ' + TABLE +
      " where created_at > now() - interval '24 hours'")).rows[0].n;
    const dailyCap = Math.min(20, Math.max(1, Number(process.env.HH_LIVE_PHOTOS_MAX_DAILY_JOBS) || 5));
    if (daily >= dailyCap) bad('LIVE_PHOTO_DAILY_LIMIT_REACHED',429);
    const existing = (await db.query('select * from ' + TABLE +
      ' where account_id=$1 and client_request_id=$2', [actor.id, requestId])).rows[0];
    if (existing) return existing;
    const count = (await db.query('select count(*)::int n from ' + TABLE +
      " where account_id=$1 and status not in ('deleted','failed')", [actor.id])).rows[0].n;
    if (count >= MAX_ACTIVE) bad('LIVE_PHOTO_LIMIT_REACHED', 409);
    return (await db.query('insert into ' + TABLE +
      ' (id,account_id,client_request_id,motion,orientation,subject,consent_ai,consent_subject,source_key,clip_key)' +
      ' values($1,$2,$3,$4,$5,$6,true,true,$7,$8) returning *',
      [id, actor.id, requestId, motion, orientation, subject, path + 'source.jpg', path + 'clip.mp4'])).rows[0];
  });
  if (reservation.id !== id) return toClient(reservation);
  const { error: uploadError } = await storage(config).upload(reservation.source_key, photo, {
    contentType: 'image/jpeg', upsert: false, cacheControl: '0',
  });
  if (uploadError) {
    await update(config, actor, id, 'failed', { error: 'PRIVATE_UPLOAD_FAILED' });
    bad('MEDIA_STORAGE_UNAVAILABLE', 503);
  }
  let assetId;
  try { assetId = await uploadHeyGenPortrait(photo); }
  catch {
    await update(config, actor, id, 'failed', { error: 'HEYGEN_ASSET_UPLOAD_FAILED' });
    bad('HEYGEN_PROVIDER_UNAVAILABLE', 503);
  }
  await update(config, actor, id, 'submitting', { assetId });
  try {
    // A model call can bill credits. One durable UUID = one submission.
    // An ambiguous timeout is never resubmitted automatically.
    const videoId = await submitHeyGenLivePhoto(assetId, motion, id);
    const saved = await update(config, actor, id, 'submitted', { assetId, videoId });
    if (!saved) bad('LIVE_PHOTO_NOT_FOUND', 404);
    return toClient(saved);
  } catch {
    await update(config, actor, id, 'unknown', { error: 'PROVIDER_SUBMISSION_UNCERTAIN' }).catch(() => {});
    bad('HEYGEN_SUBMISSION_UNCERTAIN', 503);
  }
}
async function finishSubmitted(config, row) {
  if (!row.provider_video_id || TERMINAL.has(row.status)) return row;
  if (!hasLivePhotoProviderKey()) return row;
  const provider = await getHeyGenLivePhotoStatus(row.provider_video_id);
  if (provider.state === 'failed' || provider.state === 'cancelled') {
    await dbAsWorker(config, db => db.query(
      'update ' + TABLE + " set status='failed',failure_code=$2,updated_at=now() where id=$1 and status in ('submitted','finalizing')",
      [row.id, 'HEYGEN_RENDER_FAILED']));
    return { ...row, status: 'failed', failure_code: 'HEYGEN_RENDER_FAILED' };
  }
  if (provider.state !== 'completed' || !provider.url) return row;
  const claim = await dbAsWorker(config, async db => (await db.query(
    'update ' + TABLE + " set status='finalizing',updated_at=now() where id=$1 and provider_video_id=$2 " +
    "and (status='submitted' or (status='finalizing' and updated_at<now()-interval '4 minutes')) returning *",
    [row.id, row.provider_video_id])).rows[0]);
  if (!claim) return row;
  try {
    await checkPrivateMediaStorage(config);
    const mp4 = await downloadHeyGenLivePhoto(provider.url);
    const { error } = await storage(config).upload(claim.clip_key, mp4, {
      contentType: 'video/mp4', upsert: true, cacheControl: '0',
    });
    if (error) throw Error('PRIVATE_CLIP_STORE_FAILED');
    const saved = await dbAsWorker(config, async db => (await db.query(
      'update ' + TABLE + " set status='ready',bytes=$2,ready_at=now(),updated_at=now(),failure_code=null " +
      "where id=$1 and status='finalizing' returning *", [row.id, mp4.byteLength])).rows[0]);
    if (!saved) await storage(config).remove([claim.clip_key]).catch(() => {});
    return saved || { ...claim, status: 'deleted' };
  } catch {
    await dbAsWorker(config, db => db.query('update ' + TABLE +
      " set status='submitted',failure_code='ARCHIVE_RETRY_NEEDED',updated_at=now() " +
      "where id=$1 and status='finalizing'", [row.id])).catch(() => {});
    return { ...claim, status: 'submitted', failure_code: 'ARCHIVE_RETRY_NEEDED' };
  }
}
export async function getClientLivePhoto(config, actor, id) {
  validId(id);
  let row = await byId(config, actor, id);
  if (row.status === 'submitted' || row.status === 'finalizing') {
    await finishSubmitted(config, row);
    row = await byId(config, actor, id);
  }
  return { ...toClient(row), url: row.status === 'ready' ? await signedUrl(config, row.clip_key) : null };
}
export async function finalizeLivePhotoCallback(config, requestId) {
  validId(requestId);
  const row = await dbAsWorker(config, async db => (await db.query(
    'select * from ' + TABLE + ' where id=$1', [requestId])).rows[0] || null);
  if (!row || !row.provider_video_id || !['submitted', 'finalizing'].includes(row.status)) return false;
  await finishSubmitted(config, row);
  return true;
}
export async function deleteClientLivePhoto(config, actor, id) {
  validId(id);
  const row = await transaction(config, actor, async db => (await db.query(
    'update ' + TABLE + " set status='deleted',deleted_at=now(),updated_at=now() " +
    "where id=$1 and account_id=$2 and status<>'deleted' returning *", [id, actor.id])).rows[0]);
  if (!row) bad('LIVE_PHOTO_NOT_FOUND', 404);
  // Provider work may finish later, but deleted records can never become ready.
  await storage(config).remove([row.source_key, row.clip_key]).catch(() => {});
  return { deleted: true };
}
