import 'server-only'
import { transaction } from '../app/database.js'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOCALES = new Set(['en', 'ru', 'es'])

/**
 * Only an active, approved practitioner with an owner account, and their
 * actually published offering, can receive a public Telegram service request.
 * Callers must never trust a practitioner ID or service title supplied by a visitor.
 */
export async function findPublishedTelegramOffering(db, serviceId, locale = 'en') {
  if (!UUID.test(String(serviceId || '')) || !LOCALES.has(locale)) return null
  const row = (await db.query(`
    select s.id, s.practitioner_id, s.slug, s.localized_copy, s.discovery_metadata,
      p.slug as practitioner_slug, p.trusted_auth_user_id, p.public_profile
    from app.service_offerings s
    join app.practitioners p on p.id = s.practitioner_id
    where s.id = $1 and s.active and s.status = 'published'
      and s.localized_copy <> '{}'::jsonb
      and p.active and p.status = 'approved'
      and p.public_profile <> '{}'::jsonb
      and p.trusted_auth_user_id is not null
    limit 1`, [serviceId])).rows[0]
  if (!row) return null
  if (locale === 'es' && row.discovery_metadata &&
      Object.keys(row.discovery_metadata).length > 0 &&
      !(row.discovery_metadata.displayLocales || []).includes('es')) return null
  const copy = row.localized_copy?.[locale] || row.localized_copy?.en || {}
  const title = typeof copy.title === 'string' ? copy.title.trim() : ''
  if (!title || title.length > 160 || /[\u0000-\u001f\u007f]/.test(title)) return null
  const profile = row.public_profile || {}
  const name = String(profile.displayName || profile.name || '').trim().slice(0, 100)
  return {
    id: row.id, practitionerId: row.practitioner_id,
    ownerId: row.trusted_auth_user_id, practitionerSlug: row.practitioner_slug,
    serviceSlug: row.slug, title, practitionerName: name,
  }
}

export function publishedTelegramOffering(config, serviceId, locale) {
  return transaction(config, null,
    db => findPublishedTelegramOffering(db, serviceId, locale),
    { server: true })
}
