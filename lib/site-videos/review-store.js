import 'server-only'
import { transaction } from '../app/database.js'
import { VIDEO_AREAS, prepareVideoReview, videoLinkEligible } from './review-model.mjs'

// No service_role key or browser database credentials. Only the already verified
// owner admin flow can enable this transaction-local, role-scoped privilege.
const FIELDS = [
  'youtube_id', 'title', 'creator', 'source_kind', 'source_url',
  'source_evidence_url', 'audio_language', 'duration_verified_seconds',
  'duration_basis', 'content_type', 'goals', 'subtopics', 'claims_risk',
  'metadata_confidence', 'editorial_status', 'discovery_status',
  'embed_status', 'rights_status', 'metadata_checked_at', 'content_checked_at',
  'embed_checked_at', 'youtube_oembed_checked_at', 'owner_review_status',
  'owner_review_note', 'owner_review_version', 'owner_reviewed_at',
  'created_at', 'updated_at',
].join(', ')

async function ownerTransaction(config, actor, fn) {
  if (!actor || typeof actor.id !== 'string') throw Error('unauthorized')
  return transaction(config, actor, async db => {
    await db.query("select set_config('hh.video_review_owner','1',true)")
    return fn(db)
  })
}

async function lockedVideo(db, id, revision) {
  const result = await db.query('SELECT ' + FIELDS +
    ' FROM public.hh_meditation_catalog_v1 WHERE youtube_id=$1 FOR UPDATE', [id])
  if (!result.rows.length) throw Error('not_found')
  if (result.rows[0].owner_review_version !== revision) throw Error('conflict')
  return result.rows[0]
}

async function logReview(db, actor, before, after, action, note) {
  await db.query(
    'INSERT INTO app_private.hh_video_review_events ' +
    '(video_id,reviewer_id,action,previous_status,new_status,previous_goals,new_goals,previous_subtopics,new_subtopics,note) ' +
    'VALUES ($1,$2::uuid,$3,$4,$5,$6::text[],$7::text[],$8::text[],$9::text[],$10)',
    [before.youtube_id, actor.id, action,
      before.owner_review_status, after.owner_review_status,
      before.goals, after.goals, before.subtopics, after.subtopics, note],
  )
}

export async function listVideoReviewRows(config, actor) {
  return ownerTransaction(config, actor, async db => {
    const result = await db.query('SELECT ' + FIELDS +
      ' FROM public.hh_meditation_catalog_v1 ' +
      "WHERE audio_language IN ('ru','en','es') " +
      'ORDER BY CASE owner_review_status WHEN \'pending\' THEN 0 WHEN \'accepted\' THEN 1 ELSE 2 END, created_at DESC LIMIT 180')
    return result.rows
  })
}

export async function reviewCatalogVideo(config, actor, input) {
  const review = prepareVideoReview(input)
  return ownerTransaction(config, actor, async db => {
    const before = await lockedVideo(db, review.youtubeId, review.revision)
    // Preserve legacy fine-grained tags that are not editable in the compact
    // four-sphere picker. Never lose curated metadata during owner decisions.
    const editableTags = new Set(VIDEO_AREAS.flatMap(area => [area.id, ...area.topics.map(topic => topic.id)]))
    const nextSubtopics = [...new Set([
      ...review.subtopics,
      ...before.subtopics.filter(tag => !editableTags.has(tag)),
    ])]
    const nextGoals = review.action === 'reject' ? before.goals : review.goals
    const finalSubtopics = review.action === 'reject' ? before.subtopics : nextSubtopics
    const nextStatus = review.action === 'accept' ? 'accepted' :
      review.action === 'reject' ? 'rejected' : before.owner_review_status
    const claimsRisk = review.screened ? 'low' : before.claims_risk
    const contentCheckedAt = review.screened ? new Date().toISOString() : before.content_checked_at
    const candidate = {
      ...before, owner_review_status: nextStatus, claims_risk: claimsRisk,
      content_checked_at: contentCheckedAt,
    }
    // Link-only is a public YouTube watch link, NOT a verified on-site embed.
    const linkOnly = videoLinkEligible(candidate)
    const nextDiscovery = linkOnly ? 'link_only' : 'private_review'
    const nextEditorial = nextStatus === 'rejected' ? 'rejected' :
      before.editorial_status === 'approved' ? 'approved' : 'candidate'
    const decision = review.action !== 'save'
    const result = await db.query(
      'UPDATE public.hh_meditation_catalog_v1 SET ' +
      'goals=$3::text[], subtopics=$4::text[], owner_review_status=$5, ' +
      'owner_review_note=$6, owner_reviewed_at=CASE WHEN $7::boolean THEN now() ELSE owner_reviewed_at END, ' +
      'owner_reviewed_by=CASE WHEN $7::boolean THEN $8::uuid ELSE owner_reviewed_by END, ' +
      'editorial_status=$9, discovery_status=$10, claims_risk=$11, ' +
      'content_checked_at=CASE WHEN $12::boolean THEN now() ELSE content_checked_at END, ' +
      'owner_review_version=owner_review_version+1, updated_at=now() ' +
      'WHERE youtube_id=$1 AND owner_review_version=$2 RETURNING ' + FIELDS,
      [review.youtubeId, review.revision, nextGoals, finalSubtopics,
        nextStatus, review.note, decision, actor.id, nextEditorial, nextDiscovery,
        claimsRisk, review.screened],
    )
    if (result.rows.length !== 1) throw Error('conflict')
    await logReview(db, actor, before, result.rows[0], review.action, review.note)
    return result.rows[0]
  })
}

export async function checkVideoOembed(config, actor, { youtubeId, revision }) {
  if (typeof youtubeId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId) ||
    !Number.isSafeInteger(revision) || revision < 0) throw Error('validation')
  const watchUrl = 'https://www.youtube.com/watch?v=' + youtubeId
  const endpoint = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(watchUrl)
  // An oEmbed response checks a public YouTube listing and its poster. It does
  // NOT prove status.embeddable or actual player success in a given country.
  const response = await fetch(endpoint, {
    cache: 'no-store', signal: AbortSignal.timeout(7000),
    headers: { accept: 'application/json' },
  })
  if (!response.ok) throw Error('oembed_unavailable')
  const details = await response.json()
  if (details?.provider_name !== 'YouTube' ||
    typeof details.title !== 'string' || !details.title.trim() ||
    typeof details.author_name !== 'string' || !details.author_name.trim())
    throw Error('oembed_unavailable')
  return ownerTransaction(config, actor, async db => {
    const before = await lockedVideo(db, youtubeId, revision)
    const candidate = {
      ...before, youtube_oembed_checked_at: new Date().toISOString(),
      metadata_checked_at: new Date().toISOString(),
      metadata_confidence: 'public_listing',
    }
    const nextDiscovery = videoLinkEligible(candidate) ? 'link_only' : 'private_review'
    const result = await db.query(
      'UPDATE public.hh_meditation_catalog_v1 SET ' +
      "youtube_oembed_checked_at=now(), metadata_checked_at=now(), metadata_confidence='public_listing', " +
      'discovery_status=$3, owner_review_version=owner_review_version+1, updated_at=now() ' +
      'WHERE youtube_id=$1 AND owner_review_version=$2 RETURNING ' + FIELDS,
      [youtubeId, revision, nextDiscovery],
    )
    if (result.rows.length !== 1) throw Error('conflict')
    await logReview(db, actor, before, result.rows[0], 'verify_oembed', '')
    return result.rows[0]
  })
}
