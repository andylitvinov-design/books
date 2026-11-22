import 'server-only';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppError } from '../assessments/contracts.js';
import { transaction } from './database.js';
import { createVideoCreditService } from '../video-credits/service.js';
import {
  LIVE_GIFT_XP, isLiveGiftXpEnabled, reserveLiveGiftXp, settleLiveGiftXp,
} from '../video-credits/live-gift-wallet.mjs';
import { createPrivateStorageClient, checkPrivateMediaStorage } from '../clients/session-delivery-storage.js';
import {
  LIVE_PHOTO_MOTIONS, isLivePhotoCreationEnabled, hasLivePhotoProviderKey, uploadHeyGenPortrait,
  submitHeyGenLivePhoto, getHeyGenLivePhotoStatus, downloadHeyGenLivePhoto,
  deleteHeyGenPortrait,
} from './live-photo-heygen.mjs';

const TABLE = 'app_private.client_live_photos_v1';
const BUCKET = 'hh-client-private-media';
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const MAX_FILE = 3_000_000;
const MAX_ACTIVE = 3;
const TERMINAL = new Set(['ready', 'failed', 'unknown', 'deleted']);
function billableCreationEnabled(config) {
  return isLivePhotoCreationEnabled() && isLiveGiftXpEnabled() &&
    createVideoCreditService(config).catalog().pricingModel === 'xp-v2';
}
function bad(code, status = 400) { throw new AppError(code, status); }
function validId(value) { if (typeof value !== 'string' || !ID.test(value)) bad('INVALID_LIVE_PHOTO_ID'); return value; }
function storage(config) {
  if (!config.secretKey) bad('MEDIA_STORAGE_NOT_CONFIGURED', 503);
  return createPrivateStorageClient(config).storage.from(BUCKET);
}
function toClient(row) {
  return {
    id: row.id, motion: row.motion, orientation: row.orientation,
    status: row.status === 'deleted' && row.provider_asset_id
      ? 'provider_cleanup_pending' : row.status,
    createdAt: row.created_at, readyAt: row.ready_at, failureCode: row.failure_code || null,
    duration: row.status === 'ready' ? 5 : null, reusable: row.status === 'ready',
    priceXp: row.billing_kind === 'xp' ? LIVE_GIFT_XP : null,
  };
}
async function dbAsWorker(config, fn, accountId = null) {
  // Owner identity comes exclusively from the existing private job row after
  // independently confirming provider status, never from the callback payload.
  const actor = accountId ? { id: accountId,
    claims: { sub: accountId, role: 'authenticated' } } : null;
  return transaction(config, actor, async db => {
    await db.query("select set_config('hh.live_photo_worker','verified',true)");
    return fn(db);
  }, { server: true });
}
/** Provider erasure is independent of new paid generation. A failed DELETE
 * keeps the private asset id for owner retry (no false erasure claims). */
async function cleanupProviderSource(config, row) {
  if (!row?.provider_asset_id) return 'not_required';
  if (!['ready', 'failed', 'deleted'].includes(row.status)) return 'pending';
  try { await deleteHeyGenPortrait(row.provider_asset_id); }
  catch { return 'pending'; }
  try {
    await dbAsWorker(config, db => db.query('update ' + TABLE +
      " set provider_asset_id=null,updated_at=now() where id=$1 and account_id=$2" +
      " and provider_asset_id=$3 and status in ('ready','failed','deleted')",
      [row.id, row.account_id, row.provider_asset_id]), row.account_id);
    return 'confirmed';
  } catch {
    // If the provider delete succeeded but DB update failed, a subsequent 404
    // is treated as success and the retained ID can be cleared safely.
    return 'pending';
  }
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
    (await db.query('select * from ' + TABLE +
      " where account_id=$1 and (status<>'deleted' or provider_asset_id is not null)" +
      " order by created_at desc limit 20", [actor.id])).rows);
  return { items: rows.map(toClient), creationEnabled: billableCreationEnabled(config) };
}
export async function startClientLivePhoto(config, actor, form) {
  if (!billableCreationEnabled(config)) bad('LIVE_PHOTO_NOT_ENABLED', 503);
  if (!(form instanceof FormData)) bad('INVALID_LIVE_PHOTO_FORM');
  const requestId = validId(form.get('requestId'));
  const motion = form.get('motion'), orientation = form.get('orientation'),
    subject = form.get('subject');
  if (!LIVE_PHOTO_MOTIONS.includes(motion) || !['portrait', 'landscape'].includes(orientation) ||
    !['self', 'other'].includes(subject) || form.get('consentAi') !== 'true' ||
    form.get('consentSubject') !== 'true' ||
    form.get('consentXp') !== 'true') bad('LIVE_PHOTO_CONSENT_REQUIRED');
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
  // Reuse the same XP v2 wallet's account grant / status path, never invent a
  // second balance or import unfinished v2 code before #5348 is merged.
  const wallet = await createVideoCreditService(config).status(actor);
  if (wallet.pricingModel !== 'xp-v2' || wallet.pricesXp?.live_gift !== LIVE_GIFT_XP)
    bad('VIDEO_XP_V2_UNAVAILABLE', 503);
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
    // One transaction: create a 500-XP hold in the EXISTING wallet before
    // inserting this private provider job. No hold => no HeyGen POST.
    await reserveLiveGiftXp(db, actor.id, id);
    return (await db.query('insert into ' + TABLE +
      ' (id,account_id,client_request_id,motion,orientation,subject,consent_ai,consent_subject,source_key,clip_key,billing_kind,xp_operation_id)' +
      " values($1,$2,$3,$4,$5,$6,true,true,$7,$8,'xp',$1) returning *",
      [id, actor.id, requestId, motion, orientation, subject, path + 'source.jpg', path + 'clip.mp4'])).rows[0];
  });
  if (reservation.id !== id) return toClient(reservation);
  const { error: uploadError } = await storage(config).upload(reservation.source_key, photo, {
    contentType: 'image/jpeg', upsert: false, cacheControl: '0',
  });
  if (uploadError) {
    await failBeforeProvider(config, actor, id, 'PRIVATE_UPLOAD_FAILED');
    bad('MEDIA_STORAGE_UNAVAILABLE', 503);
  }
  let assetId;
  try { assetId = await uploadHeyGenPortrait(photo); }
  catch {
    await failBeforeProvider(config, actor, id, 'HEYGEN_ASSET_UPLOAD_FAILED');
    bad('HEYGEN_PROVIDER_UNAVAILABLE', 503);
  }
  // A concurrent user deletion of a still-pending job must not create a billable
  // provider POST after its reservation has been released.
  const activeReservation = await update(config, actor, id, 'submitting', { assetId });
  if (!activeReservation) bad('LIVE_PHOTO_NOT_FOUND', 404);
  try {
    // A model call can bill credits. One durable UUID = one submission.
    // An ambiguous timeout is never resubmitted automatically.
    const videoId = await submitHeyGenLivePhoto(assetId, motion, id);
    const saved = await update(config, actor, id, 'submitted', { assetId, videoId });
    if (!saved) bad('LIVE_PHOTO_NOT_FOUND', 404);
    return toClient(saved);
  } catch (error) {
    // A local owner shutdown before HTTP POST has no paid provider side effect.
    if (error?.message === 'HEYGEN_LIVE_PHOTO_NOT_ENABLED') {
      await failBeforeProvider(config, actor, id, 'PROVIDER_STOPPED_BEFORE_POST');
      bad('LIVE_PHOTO_NOT_ENABLED', 503);
    }
    // A transport timeout or provider 5xx can still have started a paid job.
    // Never release XP or re-submit an ambiguous external request.
    await update(config, actor, id, 'unknown', { error: 'PROVIDER_SUBMISSION_UNCERTAIN' }).catch(() => {});
    bad('HEYGEN_SUBMISSION_UNCERTAIN', 503);
  }
}
async function failBeforeProvider(config, actor, id, code) {
  const failed = await transaction(config, actor, async db => {
    await db.query('select id from app.accounts where id=$1 for update', [actor.id]);
    const current = (await db.query(
      'select * from ' + TABLE + " where id=$1 and account_id=$2 and status in ('pending','submitting') for update",
      [id, actor.id])).rows[0];
    if (!current) return null;
    await settleLiveGiftXp(db, actor.id, current.xp_operation_id, 'released');
    return (await db.query('update ' + TABLE +
      " set status='failed',failure_code=$2,updated_at=now() where id=$1 returning *",
      [id, code])).rows[0] || null;
  });
  if (failed?.provider_asset_id) await cleanupProviderSource(config, failed);
}
async function finishSubmitted(config, row) {
  if (!row.provider_video_id || TERMINAL.has(row.status)) return row;
  if (!hasLivePhotoProviderKey()) return row;
  const provider = await getHeyGenLivePhotoStatus(row.provider_video_id);
  if (provider.state === 'failed' || provider.state === 'cancelled') {
    await dbAsWorker(config, async db => {
      await db.query('select id from app.accounts where id=$1 for update', [row.account_id]);
      const current = (await db.query('select * from ' + TABLE +
        " where id=$1 and status in ('submitted','finalizing') for update", [row.id])).rows[0];
      if (!current) return;
      // A provider-confirmed terminal failure is safe to release.
      await settleLiveGiftXp(db, row.account_id, current.xp_operation_id, 'released');
      await db.query('update ' + TABLE +
        " set status='failed',failure_code='HEYGEN_RENDER_FAILED',updated_at=now() where id=$1",
        [row.id]);
    }, row.account_id);
    await cleanupProviderSource(config, { ...row, status: 'failed' });
    return { ...row, status: 'failed', failure_code: 'HEYGEN_RENDER_FAILED' };
  }
  if (provider.state !== 'completed' || !provider.url) return row;
  const claim = await dbAsWorker(config, async db => (await db.query(
    'update ' + TABLE + " set status='finalizing',updated_at=now() where id=$1 and provider_video_id=$2 " +
    "and (status='submitted' or (status='finalizing' and updated_at<now()-interval '4 minutes')) returning *",
    [row.id, row.provider_video_id])).rows[0], row.account_id);
  if (!claim) return row;
  try {
    await checkPrivateMediaStorage(config);
    const mp4 = await downloadHeyGenLivePhoto(provider.url);
    const { error } = await storage(config).upload(claim.clip_key, mp4, {
      contentType: 'video/mp4', upsert: true, cacheControl: '0',
    });
    if (error) throw Error('PRIVATE_CLIP_STORE_FAILED');
    const saved = await dbAsWorker(config, async db => {
      await db.query('select id from app.accounts where id=$1 for update', [row.account_id]);
      const current = (await db.query('select * from ' + TABLE +
        " where id=$1 and status='finalizing' for update", [row.id])).rows[0];
      if (!current) return null;
      // Capture XP and publish ready MP4 atomically. No successful archive =>
      // no completed debit. The provider URL is never exposed to clients.
      await settleLiveGiftXp(db, row.account_id, current.xp_operation_id,
        'completed', mp4.byteLength);
      return (await db.query('update ' + TABLE +
        " set status='ready',bytes=$2,ready_at=now(),updated_at=now(),failure_code=null " +
        "where id=$1 and status='finalizing' returning *", [row.id, mp4.byteLength])).rows[0];
    }, row.account_id);
    if (!saved) await storage(config).remove([claim.clip_key]).catch(() => {});
    if (saved) await cleanupProviderSource(config, saved);
    return saved || { ...claim, status: 'deleted' };
  } catch {
    await dbAsWorker(config, db => db.query('update ' + TABLE +
      " set status='submitted',failure_code='ARCHIVE_RETRY_NEEDED',updated_at=now() " +
      "where id=$1 and status='finalizing'", [row.id]), row.account_id).catch(() => {});
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
  if (['ready','failed'].includes(row.status) && row.provider_asset_id)
    await cleanupProviderSource(config, row);
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
  const row = await transaction(config, actor, async db => {
    await db.query('select id from app.accounts where id=$1 for update', [actor.id]);
    const current = (await db.query('select * from ' + TABLE +
      " where id=$1 and account_id=$2 for update",
      [id, actor.id])).rows[0];
    if (!current) bad('LIVE_PHOTO_NOT_FOUND', 404);
    // Pending upload can race with provider asset creation. Block all
    // in-flight/unknown states instead of falsely claiming provider erasure.
    if (['pending','submitting','submitted','finalizing','unknown'].includes(current.status))
      bad('LIVE_PHOTO_PROCESSING', 409);
    if (current.status === 'deleted') {
      if (!current.provider_asset_id) bad('LIVE_PHOTO_NOT_FOUND', 404);
      return current; // idempotent owner retry of a failed provider DELETE
    }
    return (await db.query('update ' + TABLE +
      " set status='deleted',deleted_at=now(),updated_at=now() where id=$1 and account_id=$2 returning *",
      [id, actor.id])).rows[0];
  });
  // Hide/delete private bytes even if HeyGen is temporarily unavailable.
  await storage(config).remove([row.source_key, row.clip_key]).catch(() => {});
  const providerCleanup = await cleanupProviderSource(config, row);
  return { deleted: true, providerCleanup };
}
