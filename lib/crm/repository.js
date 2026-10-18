import 'server-only'
import { randomUUID } from 'node:crypto'
import { databasePool } from '../app/database.js'
import { seal, openSealed, operationHash } from '../app/crypto.js'
import { AppError, requireUUID } from '../assessments/contracts.js'
import { validateContactInput, validateConsentEvent } from './consent.js'
import { validateCampaignDraft } from './campaigns.js'
import { billingRegistryEnabled, readBillingRegistry } from './billing-registry.js'
import { createEmailStore } from './email-store.js'
import { createCrmWorkflowStore } from './workflow-store.js'

const ctx = (owner, id) => ({ accountId: owner, recordId: id, field: 'crm.contact' })
export function crmEnabled(env = process.env) {
  return env.HH_CRM_ENABLED === 'true' && (env.VERCEL_ENV !== 'production' || env.HH_CRM_PRODUCTION_APPROVED === 'true')
}

// Caller must additionally enforce the legacy practice-owner allowlist.
export function createCrmRepository(config) {
  return {
    async withOwner(actor, operation) {
      requireUUID(actor?.id)
      const db = await databasePool(config).connect()
      try {
        await db.query('BEGIN')
        const role = (await db.query('select rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]
        if (!config.test && (role?.rolsuper || role?.rolbypassrls)) throw new AppError('DATABASE_ROLE_UNSAFE', 503)
        await db.query('SET LOCAL ROLE hh_crm_backend')
        await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify(actor.claims)])
        if (!(await db.query('select app_private.account_active() as valid')).rows[0]?.valid) throw new AppError('SIGN_IN_REQUIRED', 401)
        const store = {
          async listSubscribers() { return billingRegistryEnabled() ? readBillingRegistry(db) : [] },
          async getOwnPreferences() {
            return (await db.query('select channel,accepted,text_version,updated_at from app.crm_self_preferences where account_id=$1 order by channel', [actor.id])).rows
          },
          async setOwnPreference(input) {
            if (!input || Object.keys(input).some((key) => !['channel', 'accepted', 'textVersion'].includes(key)) || !['email', 'telegram', 'whatsapp'].includes(input.channel) || typeof input.accepted !== 'boolean' || input.textVersion !== 'crm-marketing-v1') throw new AppError('INVALID_PREFERENCE', 400)
            await db.query('insert into app.crm_self_preferences(account_id,channel,accepted,text_version) values($1,$2,$3,$4) on conflict(account_id,channel) do update set accepted=excluded.accepted,text_version=excluded.text_version,updated_at=now()', [actor.id, input.channel, input.accepted, input.textVersion])
            return { channel: input.channel, accepted: input.accepted, textVersion: input.textVersion }
          },
          async listContacts() {
            const rows = (await db.query('select id,contact_ciphertext,locale,lifecycle,source,email_verified,suppressed,revision,created_at from app.crm_contacts where owner_id=$1 order by created_at desc,id desc limit 100', [actor.id])).rows
            const contacts = rows.map((row) => ({ id: row.id, ...openSealed(row.contact_ciphertext, ctx(actor.id, row.id), config), locale: row.locale, lifecycle: row.lifecycle, source: row.source, emailVerified: row.email_verified, suppressed: row.suppressed, revision: row.revision, createdAt: row.created_at }))
            return createEmailStore(db, actor, config).listEmailEligibility(contacts)
          },
          async createContact(input) {
            let data
            try { data = validateContactInput(input) } catch { throw new AppError('INVALID_CONTACT', 400) }
            const id = randomUUID()
            const ciphertext = seal({ displayName: data.displayName, email: data.email }, ctx(actor.id, id), config)
            const hash = operationHash({ scope: 'crm-email', owner: actor.id, email: data.email }, config)
            try {
              await db.query('insert into app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle,source) values($1,$2,$3,$4,$5,$6,$7)', [id, actor.id, ciphertext, hash, data.locale, data.lifecycle, data.source])
            } catch (error) {
              // Do not leak another record's data or expose a raw Postgres error.
              if (error?.code === '23505') throw new AppError('CONTACT_ALREADY_EXISTS', 409)
              throw error
            }
            await db.query("insert into app.crm_activity(id,owner_id,contact_id,kind) values($1,$2,$3,'contact_created')",[randomUUID(),actor.id,id])
            return { id, ...data, emailVerified: false, suppressed: false, revision: 0 }
          },
          async recordConsent(input) {
            let event
            try { event = validateConsentEvent({ ...input, actorKind: 'owner_recorded' }) } catch { throw new AppError('INVALID_CONSENT', 400) }
            const contact = (await db.query('select id from app.crm_contacts where id=$1 and owner_id=$2 for update', [event.contactId, actor.id])).rows[0]
            if (!contact) throw new AppError('NOT_FOUND', 404)
            const hash = operationHash(event, config)
            const previous = (await db.query('select payload_hash from app.crm_consent_ledger where id=$1 and owner_id=$2', [event.id, actor.id])).rows[0]
            if (previous) {
              if (previous.payload_hash !== hash) throw new AppError('CONFLICT', 409)
              return { id: event.id, recorded: true }
            }
            await db.query('insert into app.crm_consent_ledger(id,owner_id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind,payload_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [event.id, actor.id, event.contactId, event.channel, event.purpose, event.decision, event.occurredAt, event.source, event.textVersion, event.actorKind, hash])
            if (event.decision === 'withdrawn') await db.query('update app.crm_contacts set suppressed=true,revision=revision+1 where id=$1 and owner_id=$2', [event.contactId, actor.id])
            // A recorded grant never clears suppression or verifies an address.
            return { id: event.id, recorded: true }
          },
          async suppressContact(id) {
            requireUUID(id)
            const contact = (await db.query('select id,suppressed from app.crm_contacts where id=$1 and owner_id=$2 for update', [id, actor.id])).rows[0]
            if (!contact) throw new AppError('NOT_FOUND', 404)
            if (contact.suppressed) return { id, suppressed: true }
            const event = validateConsentEvent({
              id: randomUUID(), contactId: id, channel: 'email', purpose: 'product_updates',
              decision: 'withdrawn', occurredAt: new Date().toISOString(),
              source: 'owner_manual_suppression', textVersion: 'crm-marketing-v1',
              actorKind: 'owner_recorded',
            })
            const hash = operationHash(event, config)
            await db.query('insert into app.crm_consent_ledger(id,owner_id,contact_id,channel,purpose,decision,occurred_at,source,text_version,actor_kind,payload_hash) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [event.id, actor.id, event.contactId, event.channel, event.purpose, event.decision, event.occurredAt, event.source, event.textVersion, event.actorKind, hash])
            await db.query('update app.crm_contacts set suppressed=true,revision=revision+1 where id=$1 and owner_id=$2', [id, actor.id])
            await db.query("insert into app.crm_activity(id,owner_id,contact_id,kind) values($1,$2,$3,'opt_out')",[randomUUID(),actor.id,id])
            return { id, suppressed: true }
          },
          async setLifecycle(input) {
            if (!input || Object.keys(input).some(key => !['id','lifecycle','expectedRevision'].includes(key)) ||
                !['lead','client','archived'].includes(input.lifecycle) ||
                !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0)
              throw new AppError('INVALID_CONTACT_LIFECYCLE', 400)
            requireUUID(input.id)
            const item = (await db.query('select lifecycle,revision from app.crm_contacts where id=$1 and owner_id=$2 for update', [input.id, actor.id])).rows[0]
            if (!item) throw new AppError('NOT_FOUND', 404)
            if (item.revision !== input.expectedRevision) throw new AppError('CONFLICT', 409)
            if (item.lifecycle === input.lifecycle) return { id: input.id, lifecycle: item.lifecycle, revision: item.revision }
            const row = (await db.query('update app.crm_contacts set lifecycle=$1,revision=revision+1 where id=$2 and owner_id=$3 returning revision', [input.lifecycle,input.id,actor.id])).rows[0]
            await db.query("insert into app.crm_activity(id,owner_id,contact_id,kind,stage) values($1,$2,$3,'stage_changed',$4)",[randomUUID(),actor.id,input.id,input.lifecycle])
            return { id: input.id, lifecycle: input.lifecycle, revision: row.revision }
          },
          async listDrafts() {
            return (await db.query('select id,definition,status,revision,created_at from app.crm_campaign_drafts where owner_id=$1 order by created_at desc,id desc limit 100', [actor.id])).rows
          },
          async createDraft(input) {
            let draft
            try { draft = validateCampaignDraft(input) } catch { throw new AppError('INVALID_CAMPAIGN', 400) }
            const id = randomUUID()
            await db.query('insert into app.crm_campaign_drafts(id,owner_id,definition,status) values($1,$2,$3,$4)', [id, actor.id, JSON.stringify(draft), 'draft'])
            return { id, definition: draft, status: 'draft', revision: 0 }
          },
        }
        Object.assign(store, createEmailStore(db, actor, config))
        Object.assign(store, createCrmWorkflowStore(db, actor, config))
        const result = await operation(store)
        await db.query('COMMIT')
        return result
      } catch (error) {
        await db.query('ROLLBACK').catch(() => {})
        throw error
      } finally { db.release() }
    },
  }
}
