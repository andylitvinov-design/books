'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { books } from '@/data/library'
import { getRemedy } from '@/data/remedies'
import { requireAdminRequest } from '@/lib/prescriptions/admin'
import { getAppConfig } from '@/lib/app/config'
import { createPractitionerRepository } from '@/lib/practitioners/repository'
import { prepareVideoChange, videoKey, videoPagePath } from '@/lib/site-videos/model'
import { getSiteVideoStore } from '@/lib/site-videos/store'

export async function refreshSiteVideosAction() {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' }
  try {
    const store = getSiteVideoStore()
    if (!store) return { ok: false, error: 'storage' }
    return { ok: true, records: await store.list() }
  } catch {
    return { ok: false, error: 'storage' }
  }
}

export async function saveSiteVideoAction(input) {
  if (!await requireAdminRequest()) return { ok: false, error: 'unauthorized' }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'validation' }

  let key
  try {
    key = videoKey(input.slot, input.locale, input.entityId || '')
    if (input.slot === 'remedy-detail' && !getRemedy(input.locale, input.entityId)) return { ok: false, error: 'destination' }
    if (input.slot === 'book-detail' && !books.some(book => book.id === input.entityId)) return { ok: false, error: 'destination' }
    if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0) return { ok: false, error: 'validation' }
  } catch {
    return { ok: false, error: 'validation' }
  }

  let store, previous
  try {
    store = getSiteVideoStore()
    if (!store) return { ok: false, error: 'storage' }
    previous = await store.get(key)
  } catch {
    return { ok: false, error: 'storage' }
  }
  if ((previous?.revision ?? 0) !== input.expectedRevision) return { ok: false, error: 'conflict' }

  let record
  try {
    // An editable label must never be trusted as an author identity. Resolve
    // the selected slug through the already moderated public-practitioner store.
    const change = { ...input }
    delete change.expectedRevision
    delete change.practitionerName
    if (input.intent !== 'hide' && (input.intent === 'publish' || input.practitionerSlug)) {
      if (typeof input.practitionerSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.practitionerSlug)) {
        return { ok: false, error: 'master' }
      }
      let master
      try {
        master = await createPractitionerRepository(getAppConfig()).getPublicPractitioner(input.practitionerSlug, 'en')
      } catch { return { ok: false, error: 'master' } }
      const approvedName = master?.profile?.displayName || master?.profile?.name
      if (!approvedName) return { ok: false, error: 'master' }
      change.practitionerName = approvedName
    }
    record = prepareVideoChange(previous, change)
  } catch (error) {
    return { ok: false, error: error?.code === 'approval' ? 'approval' : 'validation' }
  }

  try {
    await store.save(record, input.expectedRevision)
  } catch (error) {
    return { ok: false, error: error?.code === 'conflict' ? 'conflict' : 'storage' }
  }

  // Invalidate only the published/public snapshot, not cabinet, reports or editor data.
  revalidateTag('holistic-house-published-site-videos')
  const page = videoPagePath(record.slot, record.locale, record.entityId).split(/[?#]/)[0]
  revalidatePath(page)
  // The same consultation video is deliberately reused beside both consultation entry points.
  if (record.slot === 'consultation') revalidatePath(`/${record.locale}/about`)
  // Refresh this same master's gallery across all three languages. Never
  // invalidate client cabinets; only verified public master profile pages.
  const affectedMasters = new Set([previous?.published?.practitionerSlug, record.published?.practitionerSlug])
  for (const slug of affectedMasters) {
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue
    for (const language of ['en', 'ru', 'es']) revalidatePath('/' + language + '/masters/' + slug)
  }
  revalidatePath('/admin/videos')
  return { ok: true, record }
}
