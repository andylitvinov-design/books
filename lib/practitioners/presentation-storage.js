import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, onlyKeys, requireUUID } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { privateStorageClient, sniffPrivateMedia } from '../clients/session-delivery-storage.js'
import { normalizeVideoPresentation, PRESENTATION_BUCKET, PRESENTATION_MAX_BYTES } from './presentation-contract.js'

const invalid = (code,status) => { throw new AppError(code,status) }
const supported = Object.freeze({'video/mp4':'mp4','video/quicktime':'mov'})
const table = 'app_private.practitioner_presentation_uploads'

async function ownedActivePractitioner(db,actor) {
  const account = (await db.query('select status,onboarding_state from app.accounts where id=$1',[actor.id])).rows[0]
  if(account?.status !== 'active' || account?.onboarding_state !== 'active') invalid('ACCOUNT_REQUIRED',401)
  const p = (await db.query('select id,status from app.practitioners where trusted_auth_user_id=$1 for update',[actor.id])).rows[0]
  if(!p || ['suspended','rejected','archived'].includes(p.status)) invalid('PRACTITIONER_REQUIRED',409)
  return p
}
export async function assertOwnedReadyPresentation(db,actor,video) {
  const normalized = normalizeVideoPresentation(video)
  if(!normalized || normalized.kind !== 'upload') return
  if(!actor?.id || normalized.path.split('/')[0] !== actor.id.toLowerCase()) invalid('PRESENTATION_NOT_OWNED',403)
  const row = (await db.query(`select id from ${table} where id=$1 and owner_auth_user_id=$2 and object_key=$3 and status='ready'`,
    [normalized.assetId,actor.id,normalized.path])).rows[0]
  if(!row) invalid('PRESENTATION_NOT_READY',409)
}
async function presentationBucket(config) {
  const storage = privateStorageClient(config).storage
  const {data,error} = await storage.getBucket(PRESENTATION_BUCKET)
  if(error || !data || data.public !== true) invalid('PRESENTATION_STORAGE_UNAVAILABLE',503)
  return storage.from(PRESENTATION_BUCKET)
}
export async function createPresentationUploadIntent(config,actor,input={}) {
  onlyKeys(input,['mime','bytes'])
  const mime = input.mime, bytes = input.bytes
  if(!supported[mime]) invalid('MEDIA_TYPE_NOT_ALLOWED',415)
  if(!Number.isSafeInteger(bytes) || bytes < 128 || bytes > PRESENTATION_MAX_BYTES) invalid('MEDIA_SIZE_NOT_ALLOWED',413)
  const storage = await presentationBucket(config)
  return transaction(config,actor,async db=>{
    const p = await ownedActivePractitioner(db,actor)
    const count = (await db.query(`select
      count(*) filter(where status='ready')::integer as complete,
      count(*) filter(where status='pending' and created_at > now() - interval '2 hours')::integer as pending
      from ${table} where practitioner_id=$1`,[p.id])).rows[0]
    if(count.complete >= 24 || count.pending >= 3) invalid('PRESENTATION_UPLOAD_LIMIT',429)
    const id = randomUUID(), path = actor.id.toLowerCase() + '/' + id + '.' + supported[mime]
    // A single-use, short-lived object upload. No secret key is returned.
    const {data,error} = await storage.createSignedUploadUrl(path)
    if(error || !data?.token) invalid('PRESENTATION_STORAGE_UNAVAILABLE',503)
    await db.query(`insert into ${table}(id,practitioner_id,owner_auth_user_id,object_key,mime,expected_bytes)
      values($1,$2,$3,$4,$5,$6)`,[id,p.id,actor.id,path,mime,bytes])
    return {assetId:id,path,mime,maxBytes:bytes,token:data.token,bucket:PRESENTATION_BUCKET,
      supabaseUrl:config.supabaseUrl,publishableKey:config.publishableKey}
  })
}
export async function completePresentationUpload(config,actor,input={}) {
  onlyKeys(input,['assetId'])
  requireUUID(input.assetId)
  const row = await transaction(config,actor,async db=>{
    await ownedActivePractitioner(db,actor)
    return (await db.query(`select id,object_key,mime,expected_bytes,status from ${table}
      where id=$1 and owner_auth_user_id=$2`,[input.assetId,actor.id])).rows[0]
  })
  if(!row) invalid('PRESENTATION_NOT_OWNED',404)
  if(row.status !== 'ready') {
    if(row.status !== 'pending') invalid('PRESENTATION_NOT_READY',409)
    const storage = await presentationBucket(config)
    const {data,error} = await storage.info(row.object_key)
    const size = Number(data?.size ?? data?.metadata?.size)
    const mime = (data?.content_type || data?.contentType || data?.mimetype || data?.metadata?.mimetype || '').split(';')[0].toLowerCase()
    if(error || !data) invalid('PRESENTATION_UPLOAD_MISSING',409)
    if(!Number.isSafeInteger(size) || size !== Number(row.expected_bytes)) invalid('MEDIA_SIZE_NOT_ALLOWED',413)
    if(mime !== row.mime) invalid('MEDIA_TYPE_NOT_ALLOWED',415)
    await sniffPrivateMedia(storage,row.object_key,row.mime,config.supabaseUrl)
    await transaction(config,actor,async db=>{
      await ownedActivePractitioner(db,actor)
      await db.query(`update ${table} set status='ready',ready_at=now()
        where id=$1 and owner_auth_user_id=$2 and status='pending'`,[row.id,actor.id])
    })
  }
  return {video:normalizeVideoPresentation({kind:'upload',assetId:row.id,path:row.object_key})}
}
