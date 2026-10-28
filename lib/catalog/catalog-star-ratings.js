import 'server-only'
import { AppError, onlyKeys } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { talismanFromCatalog } from '../practitioners/taoist-talismans.js'

// A rating is a subjective community vote, not verified proof of a purchase,
// clinical outcome, practitioner credential or a YouTube recommendation.
const KINDS = new Set(['video', 'talisman', 'service'])
const KEY = /^[A-Za-z0-9:_-]{1,120}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EDITORIAL = new Set(['situation','dao','alchemy','hypnotherapy','business','constellations','remote-energy-support'])
function validateKind(kind) {
  if (!KINDS.has(kind)) throw new AppError('INVALID_RATING_TARGET',400)
  return kind
}
function validateKey(key) {
  if (typeof key !== 'string' || !KEY.test(key)) throw new AppError('INVALID_RATING_TARGET',400)
  return key
}
export function validateStarRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError('INVALID_RATING',400)
  onlyKeys(body,['kind','key','stars'])
  const kind = validateKind(body.kind)
  const key = validateKey(body.key)
  if (!Number.isInteger(body.stars) || body.stars < 1 || body.stars > 5)
    throw new AppError('INVALID_RATING',400)
  return {kind,key,stars:body.stars}
}
export function validateRatingList(kind, keys) {
  validateKind(kind)
  if (!Array.isArray(keys) || keys.length < 1 || keys.length > 40)
    throw new AppError('INVALID_RATING_TARGET',400)
  return [...new Set(keys.map(validateKey))]
}
async function requirePublishedTarget(db,kind,key,accountId) {
  if (kind === 'talisman') {
    if (!talismanFromCatalog(key)) throw new AppError('NOT_FOUND',404)
    return
  }
  if (kind === 'video') {
    // A public source key (YouTube ID or published site-video key), never a URL.
    // IDs are only surfaced by the approved public video catalogue.
    return
  }
  if (key.startsWith('editorial:')) {
    if (!EDITORIAL.has(key.slice(10))) throw new AppError('NOT_FOUND',404)
    return
  }
  if (!UUID.test(key)) throw new AppError('INVALID_RATING_TARGET',400)
  const service=(await db.query([
    'select s.slug,p.trusted_auth_user_id as owner_id',
    'from app.service_offerings s join app.practitioners p on p.id=s.practitioner_id',
    "where s.id=$1 and s.active and s.localized_copy<>'{}'::jsonb",
    "and s.status in ('published','submitted','changes_requested')",
    "and p.active and p.public_profile<>'{}'::jsonb",
    "and p.status in ('approved','submitted','changes_requested')",
  ].join(' '),[key])).rows[0]
  if (!service) throw new AppError('NOT_FOUND',404)
  if (service.owner_id === accountId) throw new AppError('SELF_REVIEW_NOT_ALLOWED',403)
  if (service.slug === 'remote-energy-support') {
    const completed=(await db.query(
      "select 1 from app.consultation_requests where service_offering_id=$1 and account_id=$2 and status='completed' and remote_booking is not null limit 1",
      [key,accountId]
    )).rowCount
    if (!completed) throw new AppError('COMPLETED_SESSION_REQUIRED',403)
  }
}
export function createCatalogStarRepository(config) {
  return {
    async list(kind, keys, actor=null) {
      const ids=validateRatingList(kind,keys)
      return transaction(config,actor,async db=>{
        const rows=(await db.query(
          "select item_key,count(*)::int as count,coalesce(round(avg(stars)::numeric,1),0) as average from app.catalog_star_ratings where kind=$1 and item_key=any($2::text[]) group by item_key",
          [kind,ids]
        )).rows
        const mine=actor?(await db.query(
          'select item_key,stars from app.catalog_star_ratings where kind=$1 and item_key=any($2::text[]) and account_id=$3',
          [kind,ids,actor.id]
        )).rows:[]
        const mineByKey=new Map(mine.map(row=>[row.item_key,Number(row.stars)]))
        const byKey=Object.fromEntries(ids.map(key=>[key,{count:0,average:0,mine:mineByKey.get(key)??null}]))
        for (const row of rows) byKey[row.item_key]={count:Number(row.count),average:Number(row.average),mine:mineByKey.get(row.item_key)??null}
        return byKey
      },actor?{}:{server:true})
    },
    async save(actor,input) {
      const {kind,key,stars}=validateStarRequest(input)
      return transaction(config,actor,async db=>{
        const account=(await db.query(
          "select 1 from app.accounts where id=$1 and status='active' and onboarding_state='active'",
          [actor.id]
        )).rowCount
        if (!account) throw new AppError('ACCOUNT_REQUIRED',401)
        await requirePublishedTarget(db,kind,key,actor.id)
        await db.query([
          'insert into app.catalog_star_ratings(kind,item_key,account_id,stars)',
          'values($1,$2,$3,$4) on conflict(kind,item_key,account_id) do update set',
          'stars=excluded.stars,updated_at=now()',
        ].join(' '),[kind,key,actor.id,stars])
        if (kind === 'service' && UUID.test(key))
          await db.query(
            "update app.service_reviews set rating=$1,updated_at=now() where service_id=$2 and reviewer_account_id=$3 and status='published'",
            [stars,key,actor.id]
          )
        const summary=(await db.query(
          'select count(*)::int as count,round(avg(stars)::numeric,1) as average from app.catalog_star_ratings where kind=$1 and item_key=$2',
          [kind,key]
        )).rows[0]
        return {count:Number(summary.count),average:Number(summary.average),mine:stars}
      })
    }
  }
}
