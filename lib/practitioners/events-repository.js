import 'server-only'
import { randomUUID } from 'node:crypto'
import { AppError, onlyKeys, requireUUID, revision, text } from '../assessments/contracts.js'
import { transaction } from '../app/database.js'
import { slugify } from './contracts.js'
import { validatePractitionerEvent, eventPublicProjection } from './event-contracts.js'

const eventSelect = 'select * from app.practitioner_events where id=$1 and practitioner_id=$2 for update'
const protectedStatuses = ['suspended', 'archived']
const isApprovedCopy = row => Object.keys(row.published || {}).length > 0
const iso = value => value instanceof Date ? value.toISOString() : value
const missing = () => { throw new AppError('NOT_FOUND', 404) }

async function accountAndMaster(db, actor, lock = false) {
  const account = (await db.query('select status,onboarding_state from app.accounts where id=$1', [actor.id])).rows[0]
  if (!account || account.status !== 'active' || account.onboarding_state !== 'active')
    throw new AppError('ACCOUNT_REQUIRED', 401)
  const master = (await db.query(
    'select * from app.practitioners where trusted_auth_user_id=$1' + (lock ? ' for update' : ''),
    [actor.id],
  )).rows[0]
  if (!master || ['suspended', 'rejected', 'archived'].includes(master.status))
    throw new AppError('PRACTITIONER_REQUIRED', 403)
  return master
}

function checkOwnedPoster(draft, accountId, config) {
  if (!draft.posterUrl) return
  const prefix = config.supabaseUrl + '/storage/v1/object/public/hh-service-photos/' + accountId + '/'
  const name = draft.posterUrl.slice(prefix.length)
  if (!draft.posterUrl.startsWith(prefix)
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.jpg$/.test(name))
    throw new AppError('INVALID_EVENT_POSTER', 400)
}

function view(row) {
  return {
    id: row.id, practitionerId: row.practitioner_id, slug: row.slug,
    status: row.status, revision: row.revision,
    draft: row.draft || {}, published: row.published || {},
    reviewNote: row.review_note || '',
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  }
}

export function createPractitionerEventsRepository(config) {
  return {
    async mine(actor) {
      return transaction(config, actor, async db => {
        const master = await accountAndMaster(db, actor)
        const rows = (await db.query(
          'select * from app.practitioner_events where practitioner_id=$1 order by created_at desc,id',
          [master.id],
        )).rows
        return rows.map(view)
      })
    },

    async save(actor, id, input) {
      if (id) requireUUID(id)
      onlyKeys(input, ['draft', 'expectedRevision'])
      const draft = validatePractitionerEvent(input.draft || {})
      checkOwnedPoster(draft, actor.id, config)
      return transaction(config, actor, async db => {
        const master = await accountAndMaster(db, actor, !id)
        if (!id) {
          const key = randomUUID()
          const base = slugify(draft.title.en || draft.title.ru || draft.title.es, 'event')
          const slug = base + '-' + key.slice(0, 8)
          const result = await db.query(
            "insert into app.practitioner_events(id,practitioner_id,slug,status,draft) values($1,$2,$3,'draft',$4) returning *",
            [key, master.id, slug, draft],
          )
          return view(result.rows[0])
        }
        revision(input.expectedRevision)
        const current = (await db.query(eventSelect, [id, master.id])).rows[0]
        if (!current) missing()
        if (current.revision !== input.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
        if (protectedStatuses.includes(current.status)) throw new AppError('EVENT_UNAVAILABLE', 409)
        // Editing never replaces the already-approved public copy.
        const status = isApprovedCopy(current)
          ? (current.status === 'paused' ? 'paused' : 'published') : 'draft'
        const changed = (await db.query(
          'update app.practitioner_events set draft=$3,status=$4,review_note=null,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 returning *',
          [id, master.id, draft, status],
        )).rows[0]
        return view(changed)
      })
    },

    async submit(actor, id, input) {
      requireUUID(id)
      onlyKeys(input, ['expectedRevision'])
      revision(input.expectedRevision)
      return transaction(config, actor, async db => {
        const master = await accountAndMaster(db, actor)
        const row = (await db.query(eventSelect, [id, master.id])).rows[0]
        if (!row) missing()
        if (row.revision !== input.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
        if (protectedStatuses.includes(row.status)) throw new AppError('EVENT_UNAVAILABLE', 409)
        const draft = validatePractitionerEvent(row.draft || {}, { complete: true })
        checkOwnedPoster(draft, actor.id, config)
        const submitted = (await db.query(
          "update app.practitioner_events set status='submitted',submitted_at=now(),review_note=null,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 returning *",
          [id, master.id],
        )).rows[0]
        return view(submitted)
      })
    },

    async changeVisibility(actor, id, input) {
      requireUUID(id)
      onlyKeys(input, ['action', 'expectedRevision'])
      if (!['pause', 'archive'].includes(input.action)) throw new AppError('INVALID_ACTION', 400)
      revision(input.expectedRevision)
      return transaction(config, actor, async db => {
        const master = await accountAndMaster(db, actor)
        const row = (await db.query(eventSelect, [id, master.id])).rows[0]
        if (!row) missing()
        if (row.revision !== input.expectedRevision) throw new AppError('REVISION_CONFLICT', 409)
        if (protectedStatuses.includes(row.status)) throw new AppError('EVENT_UNAVAILABLE', 409)
        if (input.action === 'pause' && !isApprovedCopy(row)) throw new AppError('EVENT_NOT_PUBLISHED', 409)
        const next = input.action === 'pause' ? 'paused' : 'archived'
        return view((await db.query(
          'update app.practitioner_events set status=$3,revision=revision+1,updated_at=now() where id=$1 and practitioner_id=$2 returning *',
          [id, master.id, next],
        )).rows[0])
      })
    },

    async publicEvents() {
      return transaction(config, null, async db => {
        const result = await db.query(
          "select e.*,p.slug practitioner_slug,p.public_profile->>'displayName' practitioner_name " +
          'from app.practitioner_events e join app.practitioners p on p.id=e.practitioner_id ' +
          "where e.status in ('published','submitted','changes_requested') " +
          "and e.published<>'{}'::jsonb and p.active and p.public_profile<>'{}'::jsonb " +
          "and p.status in ('approved','submitted','changes_requested') order by e.created_at desc limit 300",
        )
        return result.rows.map(row => eventPublicProjection(
          row.id, row.practitioner_slug, row.practitioner_name || '', row.published,
        ))
      }, { server: true })
    },

    async moderationList() {
      return transaction(config, null, async db => {
        const rows = (await db.query(
          'select * from app.practitioner_events order by created_at desc,id limit 400',
        )).rows
        return rows.map(view)
      }, { server: true, moderator: true })
    },

    async moderate(id, input) {
      requireUUID(id)
      onlyKeys(input, ['action', 'note'])
      if (!['approve', 'changes_requested', 'suspend', 'archive'].includes(input.action))
        throw new AppError('INVALID_ACTION', 400)
      return transaction(config, null, async db => {
        const row = (await db.query(
          'select * from app.practitioner_events where id=$1 for update', [id],
        )).rows[0]
        if (!row) missing()
        if (input.action === 'approve') {
          if (!['submitted', 'changes_requested'].includes(row.status))
            throw new AppError('EVENT_NOT_SUBMITTED', 409)
          const draft = validatePractitionerEvent(row.draft || {}, { complete: true })
          const master = (await db.query(
            'select trusted_auth_user_id from app.practitioners where id=$1',
            [row.practitioner_id],
          )).rows[0]
          if (!master) missing()
          checkOwnedPoster(draft, master.trusted_auth_user_id, config)
          return view((await db.query(
            "update app.practitioner_events set published=$2,status='published',review_note=null,reviewed_at=now(),published_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *",
            [id, draft],
          )).rows[0])
        }
        const status = input.action === 'suspend' ? 'suspended' : input.action === 'archive' ? 'archived' : 'changes_requested'
        return view((await db.query(
          'update app.practitioner_events set status=$2,review_note=$3,reviewed_at=now(),revision=revision+1,updated_at=now() where id=$1 returning *',
          [id, status, text(input.note || '', 1000) || null],
        )).rows[0])
      }, { server: true, moderator: true })
    },
  }
}
